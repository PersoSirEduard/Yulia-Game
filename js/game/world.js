// The voxel island: grass, trees, flowers, fence and the pink Boba Farm house.

import * as THREE from '../../vendor/three.module.min.js';
import { CONFIG } from '../config.js';
import { box } from './voxel.js';

export const WORLD = {
  BOUND: 54,             // playable area is a square from -BOUND..BOUND
  HOUSE_POS: new THREE.Vector3(0, 0, -12),
  SPAWN_POS: new THREE.Vector3(0, 0, -3),
  HOUSE_RADIUS: 8,       // "you're home" distance
};

// Solid things characters can't walk through: circles (tree trunks)
// and axis-aligned boxes (the house).
export const colliders = [];

// Push `pos` out of any collider it overlaps. The push is perpendicular to
// the surface, so movement along it keeps its tangential component and
// characters slide around obstacles instead of sticking to them.
export function collide(pos, radius) {
  for (const c of colliders) {
    if (c.r !== undefined) {
      const dx = pos.x - c.x;
      const dz = pos.z - c.z;
      const d = Math.hypot(dx, dz);
      const min = c.r + radius;
      if (d < min) {
        if (d > 1e-4) {
          pos.x = c.x + (dx / d) * min;
          pos.z = c.z + (dz / d) * min;
        } else {
          pos.x = c.x + min;
        }
      }
    } else {
      const nx = Math.max(c.x - c.hx, Math.min(pos.x, c.x + c.hx));
      const nz = Math.max(c.z - c.hz, Math.min(pos.z, c.z + c.hz));
      const dx = pos.x - nx;
      const dz = pos.z - nz;
      const d = Math.hypot(dx, dz);
      if (d < radius) {
        if (d > 1e-4) {
          pos.x = nx + (dx / d) * radius;
          pos.z = nz + (dz / d) * radius;
        } else {
          // center is inside the box: exit along the shallowest axis
          const px = c.hx + radius - Math.abs(pos.x - c.x);
          const pz = c.hz + radius - Math.abs(pos.z - c.z);
          if (px < pz) pos.x = c.x + Math.sign(pos.x - c.x || 1) * (c.hx + radius);
          else pos.z = c.z + Math.sign(pos.z - c.z || 1) * (c.hz + radius);
        }
      }
    }
  }
}

function makeGrassTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#79c05a';
  ctx.fillRect(0, 0, 64, 64);
  const shades = ['#6cb14f', '#83cb63', '#74ba56', '#8fd46e', '#67aa4a'];
  for (let i = 0; i < 420; i++) {
    ctx.fillStyle = shades[(Math.random() * shades.length) | 0];
    ctx.fillRect((Math.random() * 16 | 0) * 4, (Math.random() * 16 | 0) * 4, 4, 4);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 14);
  return tex;
}

function makeSignTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#9a6b3f';
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = '#7a5230';
  ctx.fillRect(0, 0, 256, 10);
  ctx.fillRect(0, 118, 256, 10);
  ctx.fillRect(0, 0, 10, 128);
  ctx.fillRect(246, 0, 10, 128);
  ctx.fillStyle = '#ffe3ef';
  ctx.font = 'bold 42px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(CONFIG.ui.signTop, 128, 42);
  ctx.fillText(CONFIG.ui.signBottom, 128, 88);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}

function addTree(scene, x, z) {
  const tree = new THREE.Group();
  tree.add(box(1, 3.4, 1, '#7a4f2b', { pos: [0, 1.7, 0] }));
  tree.add(box(3.2, 2, 3.2, '#3e8e41', { pos: [0, 4.1, 0] }));
  tree.add(box(2.2, 1.4, 2.2, '#4ca64c', { pos: [0, 5.6, 0] }));
  tree.position.set(x, 0, z);
  tree.rotation.y = Math.random() * Math.PI;
  scene.add(tree);
  colliders.push({ x, z, r: 0.85 });
}

function addFlower(scene, x, z) {
  const colors = ['#f06292', '#fdd835', '#ef5350', '#ba68c8', '#ffffff'];
  const flower = new THREE.Group();
  flower.add(box(0.1, 0.5, 0.1, '#4ca64c', { pos: [0, 0.25, 0], cast: false }));
  flower.add(box(0.3, 0.26, 0.3, colors[(Math.random() * colors.length) | 0], { pos: [0, 0.56, 0], cast: false }));
  flower.position.set(x, 0, z);
  scene.add(flower);
}

function buildHouse(scene) {
  const house = new THREE.Group();
  // walls
  const base = box(9, 5, 7, '#f5a8c5', { pos: [0, 2.5, 0], receive: true });
  house.add(base);
  // stepped voxel roof
  for (let i = 0; i < 4; i++) {
    house.add(box(11 - i * 2.4, 1.1, 9 - i * 2, '#d3589b', { pos: [0, 5.5 + i * 1.05, 0] }));
  }
  // doorway: a dark "interior" panel sits proud of the solid wall (voxel
  // trick — the wall has no real hole), with the door hinged in front of it
  // so it can swing OUTWARD and reveal the darkness
  house.add(box(2.3, 3.5, 0.12, '#190f13', { pos: [0, 1.75, 3.52], cast: false }));
  const doorPivot = new THREE.Group();
  doorPivot.position.set(-1, 0, 3.64); // hinge on the left edge of the doorway
  doorPivot.add(box(2, 3.2, 0.16, '#7a4f2b', { pos: [1, 1.6, 0], cast: false }));
  doorPivot.add(box(0.3, 0.3, 0.18, '#ffd97a', { pos: [1.6, 1.7, 0.1], cast: false }));
  house.add(doorPivot);
  // windows on the front (+Z)
  house.add(box(1.7, 1.7, 0.35, '#bfe8ff', { pos: [-2.8, 2.8, 3.45], cast: false }));
  house.add(box(1.7, 1.7, 0.35, '#bfe8ff', { pos: [2.8, 2.8, 3.45], cast: false }));
  // little chimney with a heart-pink top
  house.add(box(1, 2.2, 1, '#e87fae', { pos: [3, 7.4, -1.5] }));
  // sign: BOBA FARM (text on the front face only, plain wood elsewhere)
  const sign = new THREE.Group();
  sign.add(box(0.25, 1.8, 0.25, '#7a5230', { pos: [0, 0.9, 0] }));
  const wood = new THREE.MeshLambertMaterial({ color: '#9a6b3f' });
  const face = new THREE.MeshLambertMaterial({ map: makeSignTexture() });
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 1.7, 0.2),
    [wood, wood, wood, wood, face, wood] // +x, -x, +y, -y, +z (front), -z
  );
  board.position.set(0, 2.2, 0.24); // in front of the post, no intersection
  board.castShadow = true;
  sign.add(board);
  sign.position.set(6.4, 0, 3.2);
  house.add(sign);

  house.position.copy(WORLD.HOUSE_POS);
  scene.add(house);
  colliders.push({
    x: WORLD.HOUSE_POS.x,
    z: WORLD.HOUSE_POS.z,
    hx: 4.7,
    hz: 3.7,
  });
  return doorPivot;
}

export function buildWorld(scene) {
  const size = WORLD.BOUND * 2 + 16;

  // grass top
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshLambertMaterial({ map: makeGrassTexture() })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // dirt rim under the island + water all around
  const dirt = box(size, 3, size, '#8a5a33', { pos: [0, -1.52, 0], cast: false });
  scene.add(dirt);
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(600, 600),
    new THREE.MeshLambertMaterial({ color: '#4aa3df' })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = -1.8;
  scene.add(water);

  // fence posts around the edge
  const fenceAt = WORLD.BOUND + 2;
  for (let i = -fenceAt; i <= fenceAt; i += 4) {
    for (const [x, z] of [[i, -fenceAt], [i, fenceAt], [-fenceAt, i], [fenceAt, i]]) {
      scene.add(box(0.4, 1.5, 0.4, '#9a6b3f', { pos: [x, 0.75, z] }));
    }
  }

  // trees + flowers + rocks, keeping the area near the house/spawn clear
  const clear = (x, z) => Math.hypot(x - WORLD.HOUSE_POS.x, z - WORLD.HOUSE_POS.z) < 16;
  for (let i = 0; i < 26; i++) {
    const x = (Math.random() * 2 - 1) * (WORLD.BOUND - 4);
    const z = (Math.random() * 2 - 1) * (WORLD.BOUND - 4);
    if (clear(x, z)) continue;
    addTree(scene, x, z);
  }
  for (let i = 0; i < 50; i++) {
    const x = (Math.random() * 2 - 1) * (WORLD.BOUND - 2);
    const z = (Math.random() * 2 - 1) * (WORLD.BOUND - 2);
    if (clear(x, z)) continue;
    addFlower(scene, x, z);
  }
  for (let i = 0; i < 10; i++) {
    const x = (Math.random() * 2 - 1) * (WORLD.BOUND - 4);
    const z = (Math.random() * 2 - 1) * (WORLD.BOUND - 4);
    if (clear(x, z)) continue;
    const s = 0.7 + Math.random() * 1;
    scene.add(box(s, s * 0.7, s, '#9aa0a6', { pos: [x, s * 0.34, z] }));
  }

  return { doorPivot: buildHouse(scene) };
}
