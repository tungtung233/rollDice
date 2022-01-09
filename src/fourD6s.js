import "./style.css";
import * as THREE from "three";

// Sizes
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

// Canvas
const canvas = document.querySelector("canvas.webgl");

// Scene
const scene = new THREE.Scene();

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
