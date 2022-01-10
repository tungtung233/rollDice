import "./style.css";
import * as THREE from "three";
import * as CANNON from "cannon-es";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { threeToCannon } from "three-to-cannon";
import { ConvexGeometry } from "three/examples/jsm/geometries/ConvexGeometry";

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

// Textures
const cubeTextureLoader = new THREE.CubeTextureLoader();

//the order in which these images are loaded cannot change
const environmentMapTexture = cubeTextureLoader.load([
  "/textures/environmentMaps/px.png", //positive x
  "/textures/environmentMaps/nx.png", //negative x
  "/textures/environmentMaps/py.png", //positive y
  "/textures/environmentMaps/ny.png", //negative y
  "/textures/environmentMaps/pz.png", //positive z
  "/textures/environmentMaps/nz.png", //negative z
]);

// Physics #######
const world = new CANNON.World();

//currently, the broadphase is set to NaiveBroadPhase by default (part of Cannon), which means that collision testing is being done by every object with every other object - a lot of unnecessary calculations, especially if you know your objects will never even collide with each other
world.broadphase = new CANNON.SAPBroadphase(world);
//makes bodies go to sleep when they've been inactive - means that Cannon will stop collision testing it constantly, until another force re-activates it
world.allowSleep = true;
world.gravity.set(0, -9.82, 0); //gravity goes down on the y axis

const defaultMaterial = new CANNON.Material("default");

const defaultContactMaterial = new CANNON.ContactMaterial(
  defaultMaterial,
  defaultMaterial,
  {
    friction: 0.1,
    restitution: 0.6,
  }
);
world.addContactMaterial(defaultContactMaterial);
world.defaultContactMaterial = defaultContactMaterial;

// Floor Body
const floorShape = new CANNON.Plane(); // a plane's size in Cannon is infinite - it doesn't have edges and just keep going on and on
const floorBody = new CANNON.Body();
floorBody.mass = 0; //0 = tells Cannon that this element is static - you can throw anything at it and it won't move
floorBody.addShape(floorShape);
// rotating the plane as it's default starting position is standing up
floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(-1, 0, 0), Math.PI * 0.5);
world.addBody(floorBody);

// Floor Rims
const floorRimShape = new CANNON.Plane();
const floorRimBody = new CANNON.Body();

const q1 = new CANNON.Quaternion();
q1.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI * 0.5);

const q2 = new CANNON.Quaternion();
q2.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI);

const q3 = new CANNON.Quaternion();
q3.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI * 1.5);

floorRimBody.addShape(floorRimShape, new CANNON.Vec3(0, 0, -3)); //top
floorRimBody.addShape(floorRimShape, new CANNON.Vec3(-8, 0, 0), q1); //left
floorRimBody.addShape(floorRimShape, new CANNON.Vec3(0, 0, 3), q2); //bottom
floorRimBody.addShape(floorRimShape, new CANNON.Vec3(8, 0, 0), q3); //right

world.addBody(floorRimBody);

// Floor
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(18, 9),
  new THREE.MeshStandardMaterial({
    color: "#000000",
  })
);
floor.rotation.x = -Math.PI * 0.5;
scene.add(floor);

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

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 2.75);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 4);
directionalLight.position.set(5, 8, 5);
scene.add(directionalLight);

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor("#141414");

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

// Utils
// Create an array that contains all objects that need to be updated
const objectsToUpdate = [];

const convexGeoToBody = (gltfScene, positionArg) => {
  const position = gltfScene.children[0].geometry.attributes.position.array;
  const vertices = [];

  //get vertices
  for (let i = 0; i < position.length; i += 3) {
    vertices.push(
      new THREE.Vector3(position[i], position[i + 1], position[i + 2])
    );
  }

  const convexGeometry = new ConvexGeometry(vertices);

  const convexHull = new THREE.Mesh(
    convexGeometry,
    new THREE.MeshBasicMaterial({
      // giving the convexHull a material - so you can see the wireframe
      color: 0x00ff00,
      wireframe: true,
    })
  );
  convexHull.scale.copy(gltfScene.children[0].scale);
  // scene.add(convexHull); // show the hull

  convexHull.position.copy(gltfScene.position);

  const cannon_shape = threeToCannon(gltfScene.children[0]);

  const body = new CANNON.Body({
    shape: cannon_shape.shape,
    mass: 10,
    material: defaultMaterial,
    position: new CANNON.Vec3(0, 3, 0),
  });
  body.position.copy(positionArg);

  return { body, convexHull };
};

const createD6 = (positionArg) => {
  d6Loader.load("/models/d6.gltf", (gltf) => {
    const gltfScene = gltf.scene;

    gltfScene.children[0].scale.set(0.65, 0.65, 0.65);
    gltfScene.children[0].material.envMap = environmentMapTexture;
    gltfScene.children[0].material.envMapIntensity = 2;

    const { body, convexHull } = convexGeoToBody(gltfScene, positionArg);

    // Save in objectsToUpdate
    objectsToUpdate.push({ gltfScene, body, convexHull });
    world.addBody(body);

    scene.add(gltfScene);
  });
};

// Button
const button = document
  .getElementById("dice-roll-button")
  .addEventListener("click", () => {
    createD6({
      //position
      x: Math.random() - 0.5 + -3,
      y: Math.random() + 3,
      z: Math.random() - 0.5 + -5,
    });
  });

// Raycaster
const raycaster1 = new THREE.Raycaster();

// Dice totals
let dice1Roll = 0;

// UV coordinates of dice numbers on texture
const uv1x = "0.1667";
const uv1y = "0.4961";
const uv2x = "0.8333";
const uv2y = "0.4961";
const uv3x = "0.5000";
const uv3y = "0.4961";
const uv4x = "0.8333";
const uv4y = "0.8320";
const uv5x = "0.5000";
const uv5y = "0.8320";
const uv6x = "0.1667";
const uv6y = "0.8320";

const determineDiceRoll = (diceUVCoordinates) => {
  if (
    diceUVCoordinates.uv.x.toFixed(4) === uv1x &&
    diceUVCoordinates.uv.y.toFixed(4) === uv1y
  ) {
    return 1;
  } else if (
    diceUVCoordinates.uv.x.toFixed(4) === uv2x &&
    diceUVCoordinates.uv.y.toFixed(4) === uv2y
  ) {
    return 2;
  } else if (
    diceUVCoordinates.uv.x.toFixed(4) === uv3x &&
    diceUVCoordinates.uv.y.toFixed(4) === uv3y
  ) {
    return 3;
  } else if (
    diceUVCoordinates.uv.x.toFixed(4) === uv4x &&
    diceUVCoordinates.uv.y.toFixed(4) === uv4y
  ) {
    return 4;
  } else if (
    diceUVCoordinates.uv.x.toFixed(4) === uv5x &&
    diceUVCoordinates.uv.y.toFixed(4) === uv5y
  ) {
    return 5;
  } else if (
    diceUVCoordinates.uv.x.toFixed(4) === uv6x &&
    diceUVCoordinates.uv.y.toFixed(4) === uv6y
  ) {
    return 6;
  } else {
    return 0;
  }
};

// Animation
const clock = new THREE.Clock();
let oldElapsedTime = 0;

const tick = () => {
  const elapsedTime = clock.getElapsedTime();
  const deltaTime = elapsedTime - oldElapsedTime;
  oldElapsedTime = elapsedTime;

  // Update physics world
  // '1/60' = 60fps
  // how much time has passed since the last frame/tick
  // maxSubSteps?
  world.step(1 / 60, deltaTime, 3);

  for (const object of objectsToUpdate) {
    //matching the mesh's position to the body's position
    object.gltfScene.children[0].position.copy(object.body.position);
    //match the body's rotation too
    object.gltfScene.children[0].quaternion.copy(object.body.quaternion);

    object.convexHull.position.copy(object.body.position);
    object.convexHull.quaternion.copy(object.body.quaternion);
  }

  // Cast a ray
  if (objectsToUpdate.length === 1) {
    const dice1 = objectsToUpdate[0].gltfScene;
    let rayOrigin1 = dice1.children[0].position;
    let rayDirection1 = new THREE.Vector3(0, 1, 0);
    raycaster1.set(rayOrigin1, rayDirection1);
    const intersectDice1 = raycaster1.intersectObject(dice1);

    if (intersectDice1[0]) {
      dice1Roll = determineDiceRoll(intersectDice1[0]);
    }
  }

  // Render
  renderer.render(scene, camera);

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();
