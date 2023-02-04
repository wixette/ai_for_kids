import * as THREE from 'three';
import {Smooth} from './smooth.js';
import {TWEEN} from 'three/examples/jsm/libs/tween.module.min';

class App {
  constructor(canvasElem) {
    this.canvasElem = canvasElem;
    this.setupScene();
    this.setupCamera();
    this.setupLights();
    this.setupObjects();
    this.setupUI();
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas: this.canvasElem,
    });
    this.renderer.setSize(this.canvasElem.width, this.canvasElem.height);
  }

  setupCamera() {
    this.camera = new THREE.PerspectiveCamera(50,
      this.canvasElem.width / this.canvasElem.height,
      0.1, 1000);
    this.resetCamera();
  }

  resetCamera() {
    this.camera.position.set(0, 0, 140);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(0, 0, 0);
  }

  setupLights() {
    const light1 = new THREE.AmbientLight(0xeeeeee);
    this.scene.add(light1);

    const light2 = new THREE.DirectionalLight(0xffffff, .7);
    light2.position.set(-5, 5, 10);
    this.scene.add(light2);
  }

  setupObjects() {
    const geometry = new THREE.PlaneGeometry(160, 120);
    const material = new THREE.MeshStandardMaterial({
      color: 0x3388cc,
      roughness: 0.9,
      side: THREE.DoubleSide,
    });
    this.ground = new THREE.Mesh(geometry, material);
    this.scene.add(this.ground);
  }

  setupUI() {
    this.canvasElem.addEventListener('click', (e) => {
      if (this.animating) {
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const mouseCoords = new THREE.Vector2(
        (x / this.canvasElem.width) * 2 - 1,
        -(y / this.canvasElem.height) * 2 + 1
      );
      this.raycaster.setFromCamera(mouseCoords, this.camera);
      const targets = [];
      this.raycaster.intersectObject(this.ground, false, targets);
      if (targets.length > 0) {
        this.addPoint(targets[0].point);
      }
    });
    document.getElementById('clear').addEventListener('click', () => {
      if (this.animating) {
        return;
      }
      this.clear();
    });
    document.getElementById('fly').addEventListener('click', () => {
      if (this.animating) {
        return;
      }
      this.fly();
    });
    this.raycaster = new THREE.Raycaster();
    this.points = [];
    this.splinePoints = [];
    this.splineFlyPoints = [];
    this.animating = false;
  }

  clear() {
    this.clearPoints();
    this.clearSplinePoints();
    this.resetCamera();
  }

  clearPoints() {
    for (const point of this.points) {
      this.scene.remove(point.obj);
    }
    this.points = [];
  }

  clearSplinePoints() {
    for (const point of this.splinePoints) {
      this.scene.remove(point.obj);
    }
    this.splinePoints = [];
    this.splineFlyPoints = [];
  }

  addPoint(pos) {
    const geometry = new THREE.SphereGeometry(3);
    const material = new THREE.MeshStandardMaterial({
      color: 0xff9900,
      roughness: 0.9,
    });
    const ball = new THREE.Mesh(geometry, material);
    pos.z = 3;
    ball.position.copy(pos);
    this.scene.add(ball);
    this.points.push({
      pos: pos,
      obj: ball,
    });
    this.updateSpline();
  }

  updateSpline() {
    if (this.points.length <= 1) {
      return;
    }
    this.clearSplinePoints();
    const p = [];
    for (const point of this.points) {
      p.push([point.pos.x, point.pos.y, point.pos.z]);
    }
    var path = Smooth(p, {
      method: Smooth.METHOD_CUBIC,
      clip: Smooth.CLIP_PERIODIC,
      cubicTension: Smooth.CUBIC_TENSION_CATMULL_ROM,
    });
    for (let t = 0; t < p.length - 1; t += 1) {
      const v0 = new THREE.Vector3(p[t][0], p[t][1], p[t][2]);
      const v1 = new THREE.Vector3(p[t+1][0], p[t+1][1], p[t+1][2]);
      const delta = 0.6 / v0.distanceTo(v1);
      let stepCount = 0;
      for (let ti = t; ti < t + 1; ti += delta) {
        const step = path(ti);
        const pos = new THREE.Vector3(step[0], step[1], step[2]);
        this.addSplineFlyPoint(pos);
        if (stepCount++ % 6 == 0) {
          this.addSplinePoint(pos);
        }
      }
    }
  }

  addSplineFlyPoint(pos) {
    this.splineFlyPoints.push({
      pos: pos,
    });
  }

  addSplinePoint(pos) {
    const geometry = new THREE.SphereGeometry(1);
    const material = new THREE.MeshStandardMaterial({
      color: 0xff3300,
      roughness: 0.9,
    });
    const ball = new THREE.Mesh(geometry, material);
    ball.position.copy(pos);
    this.scene.add(ball);
    this.splinePoints.push({
      pos: pos,
      obj: ball,
    });
  }

  fly() {
    const ABOVE = 15;
    const LOOK_AT_ABOVE = 12;
    const LOOK_AHEAD_NUM = 5;

    if (this.splineFlyPoints.length > 1) {
      this.animating = true;

      const fromPos = this.camera.position.clone();
      const toPos = this.splineFlyPoints[0].pos.clone();
      toPos.z += ABOVE;
      this.camera.position.copy(toPos);

      const lookAtIndex =
          Math.min(LOOK_AHEAD_NUM, this.splineFlyPoints.length - 1);
      const lookAtPos = this.splineFlyPoints[lookAtIndex].pos.clone();
      lookAtPos.z += LOOK_AT_ABOVE;
      const fromQuaternion = this.camera.quaternion.clone();

      this.camera.up.set(0, 0, 1);
      this.camera.lookAt(lookAtPos);
      const toQuaternion = this.camera.quaternion.clone();
      this.camera.position.copy(fromPos);
      this.camera.quaternion.copy(fromQuaternion);

      const moveCameraIn = new TWEEN.Tween(this.camera.position)
          .to(toPos)
          .easing(TWEEN.Easing.Quadratic.In);

      const rotateCameraIn = new TWEEN.Tween(this.camera.quaternion)
          .to(toQuaternion)
          .easing(TWEEN.Easing.Linear.None)
          .onUpdate((obj) => {
            this.camera.quaternion.set(obj.x, obj.y, obj.z, obj.w);
          });

      const steps =
          Math.min(this.splineFlyPoints.length - LOOK_AHEAD_NUM,
              this.splineFlyPoints.length - 1);
      const stepCamera = new TWEEN.Tween({
            step: 0
          })
          .to({
            step: steps
          }, steps * 30)
          .easing((k) => {
            return Math.floor(k * steps) / steps;
          })
          .onUpdate((obj) => {
            const i = Math.floor(obj.step);
            const toPos = this.splineFlyPoints[i].pos.clone();
            toPos.z += ABOVE;
            const lookAtIndex =
                Math.min(i + LOOK_AHEAD_NUM, this.splineFlyPoints.length - 1);
            const lookAtPos = this.splineFlyPoints[lookAtIndex].pos.clone();
            lookAtPos.z += LOOK_AT_ABOVE;
            this.camera.position.copy(toPos);
            this.camera.up.set(0, 0, 1);
            this.camera.lookAt(lookAtPos);
          });

      const rotateCameraOut = new TWEEN.Tween(this.camera.quaternion)
          .to(fromQuaternion)
          .easing(TWEEN.Easing.Linear.None)
          .onUpdate((obj) => {
            this.camera.quaternion.set(obj.x, obj.y, obj.z, obj.w);
          });

      const moveCameraOut = new TWEEN.Tween(this.camera.position)
          .to(fromPos)
          .easing(TWEEN.Easing.Quadratic.Out)
          .onComplete(() => {
            this.resetCamera();
            this.animating = false;
          })

      moveCameraIn.chain(rotateCameraIn);
      rotateCameraIn.chain(stepCamera);
      stepCamera.chain(rotateCameraOut);
      rotateCameraOut.chain(moveCameraOut);
      moveCameraIn.start();
    }
  }

  run() {
    this.animate();
  }

  animate() {
    requestAnimationFrame(() => {
      this.animate();
    });
    TWEEN.update();
    this.renderer.render(this.scene, this.camera);
  }
}

new App(document.getElementById('canvas')).run();
