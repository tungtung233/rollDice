import "./style.css";
import * as THREE from "three";
import * as CANNON from "cannon-es";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

// Sizes
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

// Models
const d6Loader = new GLTFLoader();

// Canvas
const canvas = document.querySelector("canvas.webgl");

// Scene
const scene = new THREE.Scene();

// Physics #######
const world = new CANNON.World();

//currently, the broadphase is set to NaiveBroadPhase by default (part of Cannon), which means that collision testing is being done by every object with every other object - a lot of unnecessary calculations, especially if you know your objects will never even collide with each other
world.broadphase = new CANNON.SAPBroadphase(world);
//makes bodies go to sleep when they've been inactive - means that Cannon will stop collision testing it constantly, until another force re-activates it
world.allowSleep = true;
world.gravity.set(0, -9.82, 0); //gravity goes down on the y axis

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 2.75);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 4);
directionalLight.position.set(5, 8, 5);
scene.add(directionalLight);

// Floor
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 10),
  new THREE.MeshStandardMaterial()
);
floor.rotation.x = -Math.PI * 0.5;

// Camera
const camera = new THREE.PerspectiveCamera(
  55,
  sizes.width / sizes.height,
  0.1,
  100
);
camera.position.set(0, 10, 0);
camera.lookAt(floor.position);
scene.add(camera);

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

window.addEventListener("resize", () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

const createD6 = (positionArg) => {
  d6Loader.load("/models/d6.gltf", (gltf) => {
    const gltfScene = gltf.scene;

    gltfScene.children[0].scale.set(0.65, 0.65, 0.65);
    gltfScene.children[0].position.set(
      positionArg.x,
      positionArg.y,
      positionArg.z
    );

    scene.add(gltfScene);
  });
};

// Button
const button = document
  .getElementById("dice-roll-button")
  .addEventListener("click", () => {
    createD6({
      //position
      x: 1,
      y: 1,
      z: 1,
    });
  });

// Animation
const clock = new THREE.Clock();

const tick = () => {
  const elapsedTime = clock.getElapsedTime();

  // Render
  renderer.render(scene, camera);

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();
