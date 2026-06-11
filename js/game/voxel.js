// Tiny helper for building voxel-style models out of boxes,
// with shared geometries/materials so 50+ chicks stay cheap.

import * as THREE from 'three';

const geoCache = new Map();
const matCache = new Map();

export function box(w, h, d, color, opts = {}) {
  const gKey = `${w}|${h}|${d}`;
  let geo = geoCache.get(gKey);
  if (!geo) {
    geo = new THREE.BoxGeometry(w, h, d);
    geoCache.set(gKey, geo);
  }
  let mat = matCache.get(color);
  if (!mat) {
    mat = new THREE.MeshLambertMaterial({ color });
    matCache.set(color, mat);
  }
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = opts.cast !== false;
  mesh.receiveShadow = opts.receive === true;
  if (opts.pos) mesh.position.set(opts.pos[0], opts.pos[1], opts.pos[2]);
  return mesh;
}

// Invisible-but-tappable sphere used as a generous hit target for raycasting.
const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });

export function hitSphere(radius, y, owner) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 6, 5), hitMat);
  mesh.position.y = y;
  mesh.userData.owner = owner;
  return mesh;
}

export function distXZ(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.hypot(dx, dz);
}
