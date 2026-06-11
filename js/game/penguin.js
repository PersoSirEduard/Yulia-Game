// The player: a Pingu-inspired voxel penguin. Model faces +Z.

import * as THREE from 'three';
import { box, hitSphere } from './voxel.js';

export function createPenguin() {
  const group = new THREE.Group();
  const torso = new THREE.Group();
  group.add(torso);

  const footL = box(0.5, 0.22, 0.85, '#f29a2e', { pos: [-0.34, 0.11, 0.1] });
  const footR = box(0.5, 0.22, 0.85, '#f29a2e', { pos: [0.34, 0.11, 0.1] });
  group.add(footL, footR);

  torso.add(box(1.35, 1.55, 1.15, '#22262e', { pos: [0, 1.0, 0] }));        // body
  torso.add(box(0.95, 1.1, 0.18, '#f4f4f4', { pos: [0, 0.95, 0.56] }));     // belly
  const head = new THREE.Group();
  head.position.set(0, 2.15, 0);
  head.add(box(1.0, 0.85, 0.95, '#22262e', { pos: [0, 0, 0] }));
  head.add(box(0.18, 0.22, 0.06, '#ffffff', { pos: [-0.24, 0.1, 0.48] }));  // eyes
  head.add(box(0.18, 0.22, 0.06, '#ffffff', { pos: [0.24, 0.1, 0.48] }));
  head.add(box(0.08, 0.12, 0.05, '#101014', { pos: [-0.22, 0.08, 0.52] }));
  head.add(box(0.08, 0.12, 0.05, '#101014', { pos: [0.22, 0.08, 0.52] }));
  head.add(box(0.32, 0.2, 0.45, '#f29a2e', { pos: [0, -0.12, 0.6] }));      // beak
  torso.add(head);

  // flippers pivot at the shoulder so they flap outward and follow the
  // torso's waddle (they're children of the tilting torso)
  const flipL = new THREE.Group();
  flipL.position.set(-0.68, 1.72, 0);
  flipL.add(box(0.18, 0.95, 0.5, '#22262e', { pos: [-0.06, -0.42, 0] }));
  const flipR = new THREE.Group();
  flipR.position.set(0.68, 1.72, 0);
  flipR.add(box(0.18, 0.95, 0.5, '#22262e', { pos: [0.06, -0.42, 0] }));
  torso.add(flipL, flipR);

  const hit = hitSphere(1.6, 1.2, null);
  group.add(hit);

  let walkTime = 0;
  let targetYaw = 0;

  const penguin = {
    group,
    hit,
    update(dt, moveAmount, moveDir) {
      if (moveAmount > 0.01) {
        targetYaw = Math.atan2(moveDir.x, moveDir.z);
        walkTime += dt * (6 + 7 * moveAmount);
      } else {
        walkTime *= 1 - Math.min(1, dt * 10);
      }
      // shortest-path yaw lerp
      let diff = targetYaw - group.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      group.rotation.y += diff * Math.min(1, dt * 12);

      const wob = Math.sin(walkTime) * moveAmount;
      torso.rotation.z = wob * 0.12;                       // waddle
      torso.position.y = Math.abs(Math.sin(walkTime)) * 0.1 * moveAmount;
      footL.position.z = 0.1 + Math.sin(walkTime) * 0.3 * moveAmount;
      footR.position.z = 0.1 - Math.sin(walkTime) * 0.3 * moveAmount;
      const flap = (0.1 + Math.abs(Math.sin(walkTime)) * 0.5) * moveAmount;
      flipL.rotation.z = -(0.1 + flap); // negative z swings the left arm outward
      flipR.rotation.z = 0.1 + flap;
      head.rotation.z = -wob * 0.08;
    },
  };
  hit.userData.owner = penguin;
  penguin.isPenguin = true;
  return penguin;
}
