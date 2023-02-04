import * as THREE from 'three';
import {SVM} from './svm.js';
import {TWEEN} from 'three/examples/jsm/libs/tween.module.min';

const GROUND_WIDTH = 160;
const GROUND_HEIGHT = 120;

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
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
    const light1 = new THREE.AmbientLight(0xffffff, 1.0);
    this.scene.add(light1);

    const light2 = new THREE.PointLight(0xffffff, 1, 200);
    light2.position.set(50, 80, 100);
    light2.castShadow = true;
    light2.shadow.mapSize.width = 512;
    light2.shadow.mapSize.height = 512;
    light2.shadow.radius = 3;
    light2.shadow.blurSamples = 10;
    this.scene.add(light2);

    const light3 = new THREE.DirectionalLight(0xffffff, 0.3);
    light3.position.set(50, 80, 100);
    this.scene.add(light3);
  }

  setupObjects() {
    const geometry = new THREE.PlaneGeometry(GROUND_WIDTH, GROUND_HEIGHT);
    const material = new THREE.MeshStandardMaterial({
      color: 0x3388cc,
      roughness: 0.9,
      side: THREE.DoubleSide,
    });
    this.ground = new THREE.Mesh(geometry, material);
    this.ground.castShadow = false;
    this.ground.receiveShadow = true;
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
        const plotX = targets[0].point.x + GROUND_WIDTH / 2;
        const plotY = targets[0].point.y + GROUND_HEIGHT / 2;
        this.addPoint(plotX, plotY, targets[0].point.x, targets[0].point.y);
      }
    });
    document.getElementById('clear').addEventListener('click', () => {
      if (this.animating) {
        return;
      }
      this.clear();
    });
    document.getElementById('classify').addEventListener('click', () => {
      if (this.animating) {
        return;
      }
      this.classify();
    });
    document.getElementById('fly').addEventListener('click', () => {
      if (this.animating) {
        return;
      }
      this.fly();
    });
    this.raycaster = new THREE.Raycaster();
    this.points = [];
    this.linePoints = [];
    this.animating = false;
  }

  clear() {
    this.clearPoints();
    this.clearLinePoints();
  }

  clearPoints() {
    for (const point of this.points) {
      this.scene.remove(point.obj);
    }
    this.points = [];
  }

  clearLinePoints() {
    for (const point of this.linePoints) {
      this.scene.remove(point.obj);
    }
    this.linePoints = [];
  }

  addPoint(plotX, plotY, posX, posY) {
    const type = document.getElementById('type0').checked ? -1 : 1;
    const geometry = new THREE.SphereGeometry(3);
    const material = new THREE.MeshStandardMaterial({
      color: type < 0 ? 0xff8800 : 0x009900,
      roughness: 0.3,
    });
    const ball = new THREE.Mesh(geometry, material);
    ball.castShadow = true;
    ball.receiveShadow = false;
    const pos = new THREE.Vector3(posX, posY, 3);
    ball.position.copy(pos);
    this.scene.add(ball);
    this.points.push({
      pos: pos,
      obj: ball,
      plotX: plotX,
      plotY: plotY,
      type: type,
    });
  }

  classify() {
    this.clearLinePoints();
    const data = [];
    const labels = [];
    for (const point of this.points) {
      data.push([point.plotX, point.plotY]);
      labels.push(point.type);
    }
    const svm = new SVM();
    svm.train(data, labels, {C: 1.0});
    const lineFunc = (x) => {
      return - (svm.w[0]/svm.w[1]) * x - svm.b / svm.w[1];
    };
    for (let plotX = 0; plotX < GROUND_WIDTH; plotX += 2) {
      const plotY = lineFunc(plotX);
      this.addLinePoint(plotX, plotY);
    }
  }

  addLinePoint(plotX, plotY) {
    const x = - GROUND_WIDTH / 2 + plotX;
    const y = - GROUND_HEIGHT / 2 + plotY;
    const geometry = new THREE.SphereGeometry(0.5);
    const material = new THREE.MeshStandardMaterial({
      color: 0xff4400,
      roughness: 0.3,
    });
    const ball = new THREE.Mesh(geometry, material);
    ball.castShadow = true;
    ball.receiveShadow = false;
    const pos = new THREE.Vector3(x, y, 3);
    ball.position.copy(pos);
    this.scene.add(ball);
    this.linePoints.push({
      pos: pos,
      obj: ball,
    });
  }

  fly() {
    const ABOVE = 15;
    const LOOK_AT_ABOVE = 12;
    const LOOK_AHEAD_NUM = 5;

    if (this.linePoints.length > 1) {
      this.animating = true;

      const fromPos = this.camera.position.clone();
      const toPos = this.linePoints[0].pos.clone();
      toPos.z += ABOVE;
      this.camera.position.copy(toPos);

      const lookAtIndex =
          Math.min(LOOK_AHEAD_NUM, this.linePoints.length - 1);
      const lookAtPos = this.linePoints[lookAtIndex].pos.clone();
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
          Math.min(this.linePoints.length - LOOK_AHEAD_NUM,
              this.linePoints.length - 1);
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
            const toPos = this.linePoints[i].pos.clone();
            toPos.z += ABOVE;
            const lookAtIndex =
                Math.min(i + LOOK_AHEAD_NUM, this.linePoints.length - 1);
            const lookAtPos = this.linePoints[lookAtIndex].pos.clone();
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
