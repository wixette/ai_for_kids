import * as THREE from 'three';
import {TWEEN} from 'three/examples/jsm/libs/tween.module.min';
import {Smooth} from './smooth.js';

class App {
  static ROWS = 12;
  static COLS = 16;
  static SIZE = 10;

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
    this.camera = new THREE.PerspectiveCamera(30,
        this.canvasElem.width / this.canvasElem.height,
        0.1, 1000);
    this.resetCamera();
  }

  resetCamera() {
    this.camera.position.set(0, 0, 245);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(0, 0, 0);
  }

  setupLights() {
    const light1 = new THREE.AmbientLight(0xdddddd, 1);
    this.scene.add(light1);

    const light2 = new THREE.PointLight(0xffffff, 1, 200);
    light2.position.set(50, 100, 100);
    light2.castShadow = true;
    light2.shadow.mapSize.width = 512;
    light2.shadow.mapSize.height = 512;
    light2.shadow.radius = 3;
    light2.shadow.blurSamples = 10;
    this.scene.add(light2);

    const light3 = new THREE.DirectionalLight(0xffffff, 0.3);
    light3.position.set(30, 30, 100);
    this.scene.add(light3);
  }

  setupObjects() {
    const geometry = new THREE.PlaneGeometry((App.COLS + 2) * App.SIZE,
        (App.ROWS + 2) * App.SIZE);
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
      const boxObjects = [];
      for (let row = 0; row < App.ROWS; row++) {
        for (let col = 0; col < App.COLS; col++) {
          const box = this.boxes[row][col];
          boxObjects.push(box.lid);
        }
      }
      const targets = [];
      this.raycaster.intersectObjects(boxObjects, false, targets);
      if (targets.length > 0) {
        const hitBox = targets[0].object;
        this.openBox(hitBox.row, hitBox.col);
      }
    });
    document.getElementById('clear').addEventListener('click', () => {
      if (this.animating) {
        return;
      }
      this.clear();
      this.setupBoxes();
    });
    this.raycaster = new THREE.Raycaster();
    this.setupBoxes();
    this.animating = false;
  }

  setupBoxes() {
    this.boxes = [];
    for (let row = 0; row < App.ROWS; row++) {
      const rowBuf = [];
      for (let col = 0; col < App.COLS; col++) {
        const baseGeometry = new THREE.BoxGeometry(App.SIZE, App.SIZE, .1);
        const baseMaterial = new THREE.MeshStandardMaterial({
          color: 0x666666,
          roughness: 0.5,
        });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.set(0, 0, -.5);
        const lidGeometry =
            new THREE.BoxGeometry(App.SIZE - .6, App.SIZE - .6, 1);
        const lidMaterial = new THREE.MeshStandardMaterial({
          color: 0xffdd66,
          roughness: 0.5,
        });
        const lid = new THREE.Mesh(lidGeometry, lidMaterial);
        const box = new THREE.Group();
        box.add(base);
        box.add(lid);
        box.castShadow = true;
        box.receiveShadow = true;
        box.position.set((-App.COLS / 2 + col + .5) * App.SIZE,
            (-App.ROWS / 2 + row + .5) * App.SIZE, App.SIZE);
        lid.row = row;
        lid.col = col;
        box.lid = lid;
        this.scene.add(box);
        rowBuf.push(box);
      }
      this.boxes.push(rowBuf);
    }
    this.setupPatterns();
  }

  clear() {
    this.clearBoxes();
    this.clearPoints();
    this.resetCamera();
  }

  clearBoxes() {
    for (let row = 0; row < App.ROWS; row++) {
      for (let col = 0; col < App.COLS; col++) {
        const box = this.boxes[row][col];
        this.scene.remove(box);
      }
    }
    this.boxes = [];
  }

  clearPoints() {
    for (const p of this.points) {
      this.scene.remove(p);
    }
    this.points = [];
  }

  openBox(row, col) {
    const box = this.boxes[row][col];
    const toPos = box.position.clone();
    toPos.x += App.SIZE / 3 * 2;
    toPos.z += App.SIZE / 3 * 2;
    new TWEEN.Tween(box.position)
        .to(toPos, 500)
        .easing(TWEEN.Easing.Cubic.Out)
        .onComplete(() => {
          box.visible = false;
        })
        .start();
    new TWEEN.Tween({ eulerY: 0 })
        .to({ eulerY: 1.7 }, 500)
        .easing(TWEEN.Easing.Cubic.Out)
        .onUpdate((obj) => {
          box.rotation.set(0, obj.eulerY, 0);
        })
        .onComplete(() => {
          box.visible = false;
        })
        .start();
  }

  setupPatterns() {
    this.points = [];
    const x0 = (-App.COLS / 2 + Math.random() * App.COLS / 3) * App.SIZE;
    const y0 = (-App.ROWS / 2 + Math.random() * App.ROWS / 3) * App.SIZE;
    const x1 =
        (-App.COLS / 2 + Math.random() * App.COLS / 3 + App.COLS * 2 / 3) *
        App.SIZE;
    const y1 = (-App.ROWS / 2 + Math.random() * App.ROWS / 3) * App.SIZE;
    const x2 =
        (-App.COLS / 2 + Math.random() * App.COLS / 3 + App.COLS / 3) *
        App.SIZE;
    const y2 =
        (-App.ROWS / 2 + Math.random() * App.ROWS / 3 + App.ROWS * 2 / 3) *
        App.SIZE;
    const p = [];
    p.push([x0, y0]);
    p.push([x1, y1]);
    p.push([x2, y2]);
    p.push([x0, y0]);
    var path = Smooth(p, {
      method: Smooth.METHOD_LINEAR,
      clip: Smooth.CLIP_CLAMP,
    });
    for (let t = 0; t < p.length; t += .1) {
      const step = path(t);
      this.addPoint(step[0], step[1]);
    }
  }

  addPoint(x, y) {
    const ballGeometry = new THREE.SphereGeometry(2);
    const ballMaterial = new THREE.MeshStandardMaterial({
      color: 0xff6600,
      roughness: 0.7,
    });
    const ball = new THREE.Mesh(ballGeometry, ballMaterial);
    ball.castShadow = false;
    ball.receiveShadow = true;
    ball.position.set(x, y, App.SIZE / 3 * 2);
    this.scene.add(ball);
    this.points.push(ball);
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
