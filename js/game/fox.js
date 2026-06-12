// A Minecraft-style fox that sneaks in from the edge of the map and hunts
// bobas. Tap it to scare it off the map. Model faces +Z.

import * as THREE from '../../vendor/three.module.min.js';
import { box, hitSphere } from './voxel.js';
import { WORLD, collide } from './world.js';

const _v1 = new THREE.Vector3();

export class Fox {
  constructor(pos) {
    const g = new THREE.Group();
    this.legs = [];
    for (const [x, z] of [[-0.22, 0.42], [0.22, 0.42], [-0.22, -0.42], [0.22, -0.42]]) {
      const leg = box(0.17, 0.5, 0.17, '#3a2a1e', { pos: [x, 0.25, z] });
      this.legs.push(leg);
      g.add(leg);
    }
    g.add(box(0.62, 0.5, 1.35, '#e2823a', { pos: [0, 0.72, 0] }));            // body
    g.add(box(0.64, 0.28, 0.5, '#f4f4f4', { pos: [0, 0.6, 0.45], cast: false })); // white chest
    const head = new THREE.Group();
    head.position.set(0, 1.0, 0.85);
    head.add(box(0.72, 0.52, 0.5, '#e2823a', { pos: [0, 0, 0] }));
    head.add(box(0.3, 0.26, 0.32, '#f4f4f4', { pos: [0, -0.1, 0.36] }));      // snout
    head.add(box(0.13, 0.13, 0.07, '#16161c', { pos: [0, -0.04, 0.54] }));    // nose
    head.add(box(0.18, 0.26, 0.1, '#e2823a', { pos: [-0.24, 0.36, -0.1] }));  // ears
    head.add(box(0.18, 0.26, 0.1, '#e2823a', { pos: [0.24, 0.36, -0.1] }));
    head.add(box(0.07, 0.1, 0.05, '#16161c', { pos: [-0.2, 0.06, 0.26] }));   // eyes
    head.add(box(0.07, 0.1, 0.05, '#16161c', { pos: [0.2, 0.06, 0.26] }));
    g.add(head);
    this.head = head;
    this.tail = new THREE.Group();
    this.tail.position.set(0, 0.85, -0.68);
    const tailBody = box(0.24, 0.24, 0.85, '#e2823a', { pos: [0, 0, -0.42] });
    const tailTip = box(0.26, 0.26, 0.3, '#f4f4f4', { pos: [0, 0, -0.95] });
    this.tail.add(tailBody, tailTip);
    this.tail.rotation.x = -0.35;
    g.add(this.tail);
    this.hit = hitSphere(1.5, 0.8, this);
    g.add(this.hit);

    g.position.copy(pos);
    this.group = g;
    this.isFox = true;
    this.state = 'hunt';   // hunt -> (leave | flee)
    this.dead = false;
    this.target = null;
    this.retargetT = 0;
    this.eatPause = 0;     // short "chewing" stop after a catch
    this.carrying = false;
    this.moveDir = new THREE.Vector3();
    this.phase = Math.random() * 10;
  }

  get pos() {
    return this.group.position;
  }

  scare(penguinPos) {
    if (this.state === 'flee') return;
    this.state = 'flee';
    this.moveDir.subVectors(this.pos, penguinPos).setY(0);
    if (this.moveDir.lengthSq() < 0.01) this.moveDir.set(Math.random() - 0.5, 0, Math.random() - 0.5);
    this.moveDir.normalize();
  }

  carryChick() {
    if (this.carrying) return;
    this.carrying = true;
    // a sad little chick dangling from the mouth
    const chick = new THREE.Group();
    chick.add(box(0.3, 0.26, 0.3, '#f3e76f', { pos: [0, 0, 0], cast: false }));
    chick.add(box(0.12, 0.08, 0.1, '#f0962f', { pos: [0.18, 0, 0], cast: false }));
    chick.position.set(0, -0.28, 0.5);
    this.head.add(chick);
  }

  startLeaving() {
    this.state = 'leave';
    const pos = this.group.position;
    this.moveDir.copy(pos).setY(0);
    if (this.moveDir.lengthSq() < 1) this.moveDir.set(Math.random() - 0.5, 0, Math.random() - 0.5);
    this.moveDir.normalize();
  }

  update(dt, ctx) {
    const pos = this.group.position;
    let speed = 0;

    if (this.state === 'hunt') {
      // Foxes only hunt the player's flock. They keep hunting until tapped
      // or until the player has no bobas left.
      if (this.eatPause > 0) {
        this.eatPause -= dt;
      } else if (ctx.followers.length === 0) {
        this.startLeaving();
      } else {
        this.retargetT -= dt;
        if (this.retargetT <= 0 || !this.target || this.target.removed || this.target.state !== 'following') {
          this.retargetT = 0.6;
          this.target = null;
          let best = Infinity;
          for (const boba of ctx.followers) {
            const d = pos.distanceToSquared(boba.pos);
            if (d < best) {
              best = d;
              this.target = boba;
            }
          }
        }
        if (this.target) {
          _v1.subVectors(this.target.pos, pos).setY(0);
          const d = _v1.length();
          // sneak from afar, pounce up close
          speed = d > 20 ? 3 : d > 7 ? 5.2 : 6.6;
          this.moveDir.copy(_v1.normalize());
          if (d < 0.95) {
            ctx.onEat(this.target);
            this.carryChick();
            this.target = null;
            this.eatPause = 0.9;
            speed = 0;
          }
        }
      }
    } else if (this.state === 'leave') {
      speed = 6.5;
    } else {
      speed = 11; // fleeing after a tap
    }

    pos.addScaledVector(this.moveDir, speed * dt);
    collide(pos, 0.55);
    if (Math.abs(pos.x) > WORLD.BOUND + 10 || Math.abs(pos.z) > WORLD.BOUND + 10) {
      this.dead = true;
    }

    // face movement, trot animation, tail wag
    if (speed > 0.1) {
      const yaw = Math.atan2(this.moveDir.x, this.moveDir.z);
      let diff = yaw - this.group.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.group.rotation.y += diff * Math.min(1, dt * 10);
      this.phase += dt * (4 + speed * 1.6);
      for (let i = 0; i < 4; i++) {
        this.legs[i].rotation.x = Math.sin(this.phase + (i % 2 ? Math.PI : 0)) * 0.6;
      }
      pos.y = Math.abs(Math.sin(this.phase * 0.5)) * 0.05;
    }
    this.tail.rotation.y = Math.sin(this.phase * 0.7) * 0.3;
  }
}
