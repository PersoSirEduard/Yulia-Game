// The voxel island: grass, trees, flowers, fence and the pink Boba Farm house.

import * as THREE from 'three';
import { box } from './voxel.js';

export const WORLD = {
  BOUND: 54,             // playable area is a square from -BOUND..BOUND
  HOUSE_POS: new THREE.Vector3(0, 0, -12),
  SPAWN_POS: new THREE.Vector3(0, 0, -3),
  HOUSE_RADIUS: 8,       // "you're home" distance
};

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
  ctx.fillText('BOBA', 128, 42);
  ctx.fillText('FARM', 128, 88);
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
  // door + windows on the front (+Z)
  house.add(box(2, 3.2, 0.35, '#7a4f2b', { pos: [0, 1.6, 3.45], cast: false }));
  house.add(box(0.3, 0.3, 0.2, '#ffd97a', { pos: [0.6, 1.7, 3.65], cast: false }));
  house.add(box(1.7, 1.7, 0.35, '#bfe8ff', { pos: [-2.8, 2.8, 3.45], cast: false }));
  house.add(box(1.7, 1.7, 0.35, '#bfe8ff', { pos: [2.8, 2.8, 3.45], cast: false }));
  // little chimney with a heart-pink top
  house.add(box(1, 2.2, 1, '#e87fae', { pos: [3, 7.4, -1.5] }));
  // sign: BOBA FARM
  const sign = new THREE.Group();
  sign.add(box(0.25, 1.8, 0.25, '#7a5230', { pos: [0, 0.9, 0] }));
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 1.7, 0.2),
    new THREE.MeshLambertMaterial({ map: makeSignTexture() })
  );
  board.position.set(0, 2.2, 0);
  board.castShadow = true;
  sign.add(board);
  sign.position.set(6.4, 0, 3.2);
  house.add(sign);

  house.position.copy(WORLD.HOUSE_POS);
  scene.add(house);
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

  buildHouse(scene);
}
