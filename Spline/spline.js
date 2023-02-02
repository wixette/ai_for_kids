import * as THREE from 'three';
import {TrackballControls} from 'three/examples/jsm/controls/TrackballControls.js';
import {Smooth} from './smooth.js';

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
    this.camera = new THREE.PerspectiveCamera(30,
      this.canvasElem.width / this.canvasElem.height,
      0.1, 1000);
    this.camera.position.set(0, 0, 240);
    this.camera.lookAt(0, 0, 0);
    this.controls = new TrackballControls(this.camera,
        this.renderer.domElement);
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.DOLLY,
      MIDDLE: THREE.MOUSE.ROTATE,
      RIGHT: THREE.MOUSE.PAN
    };
    this.controls.noZoom = true;
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
      this.clear();
    });
    this.raycaster = new THREE.Raycaster();
    this.points = [];
    this.splinePoints = [];
  }

  clear() {
    this.clearPoints();
    this.clearSplinePoints();
    this.controls.reset();
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
      const delta = 1 / v0.distanceTo(v1) * 3;
      for (let ti = t; ti < t + 1; ti += delta) {
        const step = path(ti);
        const pos = new THREE.Vector3(step[0], step[1], step[2]);
        this.addSplinePoint(pos);
      }
    }
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

  run() {
    this.animate();
  }

  animate() {
    requestAnimationFrame(() => {
      this.animate();
    });
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

new App(document.getElementById('canvas')).run();
