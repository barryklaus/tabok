import * as THREE from 'three';
import * as CANNON from './vendor/cannon-es.js';

const UP = new THREE.Vector3(0, 1, 0);
const NORMALS = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]].map(v => new THREE.Vector3(...v));
const STEP = 1 / 120;

function convexShape(geometry) {
  const vertices = [], faces = [], lookup = new Map();
  const positions = geometry.attributes.position;
  for (let face = 0; face < positions.count / 3; face++) {
    const indices = [];
    for (let corner = 0; corner < 3; corner++) {
      const v = new THREE.Vector3().fromBufferAttribute(positions, face * 3 + corner);
      const key = v.toArray().map(value => value.toFixed(5)).join(',');
      if (!lookup.has(key)) { lookup.set(key, vertices.length); vertices.push(new CANNON.Vec3(v.x, v.y, v.z)); }
      indices.push(lookup.get(key));
    }
    faces.push(indices);
  }
  return new CANNON.ConvexPolyhedron({ vertices, faces });
}

function faceFrame(die, face) {
  const normal = (die.userData.faceNormals || NORMALS)[face].clone();
  let tangent;
  if (die.userData.faceNormals) {
    const positions = die.children[0].geometry.attributes.position;
    const vertices = [0, 1, 2].map(i => new THREE.Vector3().fromBufferAttribute(positions, face * 3 + i));
    const center = vertices.reduce((sum, v) => sum.add(v), new THREE.Vector3()).multiplyScalar(1 / 3);
    tangent = vertices[0].clone().sub(center).normalize();
  } else {
    tangent = Math.abs(normal.x) > .5 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
  }
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(tangent, normal, tangent.clone().cross(normal)));
}

function upwardFace(die, quaternion) {
  let face = 0, alignment = -1;
  (die.userData.faceNormals || NORMALS).forEach((normal, index) => {
    const dot = normal.clone().applyQuaternion(quaternion).dot(UP);
    if (dot > alignment) { face = index; alignment = dot; }
  });
  return { face, alignment };
}

// The host has already selected the rules result. A constant symmetry of the
// cube/icosahedron relabels the recorded throw from its first frame, preserving
// every collision and avoiding a last-second turn or a change to the odds.
export function simulateDiceThrow(dice, random = Math.random) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -32, 0), allowSleep: true });
    world.solver.iterations = 16;
    world.defaultContactMaterial.friction = .48;
    world.defaultContactMaterial.restitution = .32;
    const floor = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
    floor.quaternion.setFromEuler(-Math.PI / 2, 0, 0); floor.position.y = .01; world.addBody(floor);
    for (const [x, z, hx, hz] of [[-5.55,0,.2,3.65],[5.55,0,.2,3.65],[0,-3.65,5.75,.2],[0,3.65,5.75,.2]]) {
      const wall = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(hx, 4, hz)) });
      wall.position.set(x, 4, z); world.addBody(wall);
    }
    const bodies = dice.map((die, index) => {
      const body = new CANNON.Body({
        mass: die.userData.faceNormals ? 1.35 : 1,
        shape: die.userData.faceNormals ? convexShape(die.children[0].geometry) : new CANNON.Box(new CANNON.Vec3(1.025,1.025,1.025)),
        linearDamping: .18, angularDamping: .24, sleepSpeedLimit: .18, sleepTimeLimit: .24
      });
      const x = (index - (dice.length - 1) / 2) * 3.1;
      body.position.set(x, 3.6 + index * .6 + random() * .8, -1.6 + random() * .4);
      body.quaternion.setFromEuler(random() * 6, random() * 6, random() * 6);
      body.velocity.set((random() - .5) * 3.2 - x * .15, -1.4, 2.5 + random() * 1.5);
      body.angularVelocity.set(7 + random() * 9, (random() - .5) * 16, (index % 2 ? -1 : 1) * (5 + random() * 8));
      world.addBody(body); return body;
    });
    const frames = [];
    const capture = () => frames.push(bodies.map(body => ({
      position: new THREE.Vector3(body.position.x, body.position.y, body.position.z),
      quaternion: new THREE.Quaternion(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w)
    })));
    capture();
    let collisions = 0;
    bodies.forEach(body => body.addEventListener('collide', () => collisions++));
    for (let step = 0; step < 960; step++) {
      world.step(STEP);
      if (step % 2 === 1) capture();
      if (step > 100 && bodies.every(body => body.sleepState === CANNON.Body.SLEEPING)) break;
    }
    capture();
    const last = frames.at(-1), upward = last.map((pose, index) => upwardFace(dice[index], pose.quaternion));
    // A cocked/stacked die is rethrown before playback, never snapped flat.
    if (upward.some(item => item.alignment < .999) || bodies.some(body => body.sleepState !== CANNON.Body.SLEEPING)) continue;
    if (last.some((pose, index) => pose.position.y > (dice[index].userData.restHeight || 1.025) + .09)) continue;
    const corrections = dice.map((die, index) => faceFrame(die, upward[index].face).multiply(faceFrame(die, die.userData.resultFace).invert()));
    for (const frame of frames) frame.forEach((pose, index) => pose.quaternion.multiply(corrections[index]));
    return { frames, collisions, seconds: (frames.length - 1) / 60, settled: true };
  }
  throw new Error('Dice could not settle flat in the tray.');
}

export function sampleDiceThrow(plan, progress) {
  const time = THREE.MathUtils.clamp(progress, 0, 1) * (plan.frames.length - 1);
  const index = Math.floor(time), next = Math.min(plan.frames.length - 1, index + 1), blend = time - index;
  return plan.frames[index].map((pose, die) => ({
    position: pose.position.clone().lerp(plan.frames[next][die].position, blend),
    quaternion: pose.quaternion.clone().slerp(plan.frames[next][die].quaternion, blend)
  }));
}
