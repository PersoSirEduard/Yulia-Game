// Theo: a rare Siamese cat found sitting on the map. Tap him and he follows
// the penguin; when a fox gets too close to a boba he pounces, chases the fox
// off the map and disappears with it. One defense per cat. Model faces +Z.

import * as THREE from 'three';
import { box, hitSphere } from './voxel.js';
import { WORLD, collide } from './world.js';

const _v1 = new THREE.Vector3();
const CREAM = '#ead9bd';
const POINT = '#4a3526'; // the dark "points" of a Siamese: ears, mask, paws, tail

export class Cat {
  constructor(pos) {
    const g = new THREE.Group();

    this.legs = [];
    for (const [x, z] of [[-0.17, 0.34], [0.17, 0.34], [-0.17, -0.3], [0.17, -0.3]]) {
      const leg = box(0.14, 0.44, 0.14, POINT, { pos: [x, 0.22, z] });
      this.legs.push(leg);
      g.add(leg);
    }
    this.body = box(0.52, 0.46, 0.98, CREAM, { pos: [0, 0.64, 0] });
    g.add(this.body);

    this.head = new THREE.Group();
    this.head.position.set(0, 1.04, 0.5);
    this.head.add(box(0.5, 0.44, 0.4, CREAM, { pos: [0, 0, 0] }));
    this.head.add(box(0.32, 0.22, 0.07, POINT, { pos: [0, -0.07, 0.2], cast: false }));   // face mask
    this.head.add(box(0.16, 0.22, 0.09, POINT, { pos: [-0.16, 0.31, -0.04] }));           // ears
    this.head.add(box(0.16, 0.22, 0.09, POINT, { pos: [0.16, 0.31, -0.04] }));
    this.head.add(box(0.07, 0.1, 0.05, '#5db7e8', { pos: [-0.13, 0.05, 0.21], cast: false })); // blue eyes
    this.head.add(box(0.07, 0.1, 0.05, '#5db7e8', { pos: [0.13, 0.05, 0.21], cast: false }));
    this.head.add(box(0.09, 0.06, 0.05, '#d98f9f', { pos: [0, -0.05, 0.24], cast: false }));   // nose
    g.add(this.head);

    this.tail = new THREE.Group();
    this.tail.position.set(0, 0.74, -0.46);
    this.tail.add(box(0.12, 0.12, 0.68, POINT, { pos: [0, 0.16, -0.26] }));
    g.add(this.tail);

    this.hit = hitSphere(1.4, 0.7, this);
    g.add(this.hit);

    g.position.copy(pos);
    g.rotation.y = Math.random() * Math.PI * 2;
    this.group = g;
    this.isCat = true;
    this.state = 'sitting';  // sitting -> following -> chasing
    this.dead = false;
    this.vel = new THREE.Vector3();
    this.chaseTarget = null;
    this.chaseDir = new THREE.Vector3();
    this.phase = Math.random() * 10;
    this.setPose('sit');
  }

  get pos() {
    return this.group.position;
  }

  setPose(pose) {
    if (pose === 'sit') {
      // haunches down, front legs straight, tail raised
      this.body.rotation.x = -0.5;
      this.body.position.set(0, 0.66, -0.06);
      this.head.position.set(0, 1.22, 0.38);
      this.tail.rotation.x = 1.1;
      this.legs[2].scale.y = this.legs[3].scale.y = 0.55;
      this.legs[2].position.y = this.legs[3].position.y = 0.12;
    } else {
      this.body.rotation.x = 0;
      this.body.position.set(0, 0.64, 0);
      this.head.position.set(0, 1.04, 0.5);
      this.tail.rotation.x = 0.55;
      this.legs[2].scale.y = this.legs[3].scale.y = 1;
      this.legs[2].position.y = this.legs[3].position.y = 0.22;
    }
  }

  startFollowing() {
    this.state = 'following';
    this.setPose('stand');
  }

  // Pounce: send the fox running and run right after it.
  defend(fox) {
    this.state = 'chasing';
    this.chaseTarget = fox;
    this.setPose('stand');
  }

  update(dt, ctx) {
    const pos = this.group.position;
    this.phase += dt * 2;

    if (this.state === 'sitting') {
      this.tail.rotation.y = Math.sin(this.phase) * 0.3;  // idle tail flick
      this.head.rotation.y = Math.sin(this.phase * 0.4) * 0.25;
      return;
    }

    let speed = 0;
    if (this.state === 'following') {
      _v1.subVectors(ctx.penguinPos, pos).setY(0);
      const d = _v1.length();
      if (d > 2.6) {
        speed = d > 16 ? 13 : 8;
        this.vel.lerp(_v1.normalize().multiplyScalar(speed), 1 - Math.exp(-6 * dt));
      } else {
        this.vel.multiplyScalar(Math.max(0, 1 - dt * 8));
      }
      pos.addScaledVector(this.vel, dt);
      pos.x = THREE.MathUtils.clamp(pos.x, -WORLD.BOUND, WORLD.BOUND);
      pos.z = THREE.MathUtils.clamp(pos.z, -WORLD.BOUND, WORLD.BOUND);
      collide(pos, 0.45);
      speed = Math.hypot(this.vel.x, this.vel.z);
    } else {
      // chasing: run after the fleeing fox and off the map with it
      if (this.chaseTarget && !this.chaseTarget.dead) {
        this.chaseDir.subVectors(this.chaseTarget.pos, pos).setY(0);
        if (this.chaseDir.lengthSq() > 0.01) this.chaseDir.normalize();
      }
      speed = 10.5;
      pos.addScaledVector(this.chaseDir, speed * dt);
      collide(pos, 0.45);
      if (Math.abs(pos.x) > WORLD.BOUND + 10 || Math.abs(pos.z) > WORLD.BOUND + 10) {
        this.dead = true;
      }
      this.vel.copy(this.chaseDir).multiplyScalar(speed);
    }

    // face movement, trot, tail streams behind when running
    if (speed > 0.2) {
      const yaw = Math.atan2(this.vel.x, this.vel.z);
      let diff = yaw - this.group.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.group.rotation.y += diff * Math.min(1, dt * 10);
      this.phase += dt * speed * 1.6;
      for (let i = 0; i < 4; i++) {
        this.legs[i].rotation.x = Math.sin(this.phase + (i % 2 ? Math.PI : 0)) * 0.6;
      }
      this.tail.rotation.x = THREE.MathUtils.lerp(this.tail.rotation.x, 0.25, dt * 5);
    }
    this.tail.rotation.y = Math.sin(this.phase * 0.6) * 0.2;
  }
}
