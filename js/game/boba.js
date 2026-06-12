// A "boba": a Minecraft-style baby chick. Wild ones wander and peck;
// collected ones follow the penguin in a little boid flock. Model faces +Z.

import * as THREE from 'three';
import { box, hitSphere } from './voxel.js';
import { WORLD, collide } from './world.js';

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();

export class Boba {
  constructor(pos) {
    const g = new THREE.Group();
    g.add(box(0.07, 0.2, 0.07, '#f0962f', { pos: [-0.09, 0.1, 0], cast: false }));
    g.add(box(0.07, 0.2, 0.07, '#f0962f', { pos: [0.09, 0.1, 0], cast: false }));
    g.add(box(0.36, 0.32, 0.46, '#f3e76f', { pos: [0, 0.36, -0.04] }));      // body
    this.wingL = box(0.07, 0.24, 0.36, '#e8d95c', { pos: [-0.23, 0.4, -0.04], cast: false });
    this.wingR = box(0.07, 0.24, 0.36, '#e8d95c', { pos: [0.23, 0.4, -0.04], cast: false });
    g.add(this.wingL, this.wingR);
    this.head = new THREE.Group();
    this.head.position.set(0, 0.68, 0.08);
    this.head.add(box(0.42, 0.38, 0.36, '#f3e76f', { pos: [0, 0, 0] }));
    this.head.add(box(0.06, 0.09, 0.05, '#16161c', { pos: [-0.14, 0.05, 0.19] }));
    this.head.add(box(0.06, 0.09, 0.05, '#16161c', { pos: [0.14, 0.05, 0.19] }));
    this.head.add(box(0.16, 0.1, 0.14, '#f0962f', { pos: [0, -0.04, 0.24] }));
    g.add(this.head);
    this.hit = hitSphere(1.0, 0.45, this);
    g.add(this.hit);

    g.position.copy(pos);
    this.group = g;
    this.isBoba = true;
    this.state = 'wild';
    this.removed = false;
    this.vel = new THREE.Vector3();
    this.wanderT = 0;
    this.wanderTarget = pos.clone();
    this.peckT = 1 + Math.random() * 3;
    this.peckAnim = 0;
    this.phase = Math.random() * 10;
  }

  get pos() {
    return this.group.position;
  }

  setFollowing() {
    this.state = 'following';
  }

  update(dt, ctx) {
    const pos = this.group.position;

    if (this.state === 'wild') {
      // skittish: run from the penguin when it gets close (slower than the
      // player, so you can corner one and tap it)
      _v1.subVectors(pos, ctx.penguinPos).setY(0);
      const dPenguin = _v1.length();
      if (dPenguin < 5.5) {
        this.vel.copy(_v1.normalize().multiplyScalar(4.2));
        this.wanderT = 0.5 + Math.random(); // re-pick a wander spot after escaping
      } else {
        this.wanderT -= dt;
        if (this.wanderT <= 0) {
          this.wanderT = 1.5 + Math.random() * 3;
          this.wanderTarget.set(
            THREE.MathUtils.clamp(pos.x + (Math.random() * 12 - 6), -WORLD.BOUND, WORLD.BOUND),
            0,
            THREE.MathUtils.clamp(pos.z + (Math.random() * 12 - 6), -WORLD.BOUND, WORLD.BOUND)
          );
        }
        _v1.subVectors(this.wanderTarget, pos).setY(0);
        if (_v1.length() > 0.4) {
          this.vel.copy(_v1.normalize().multiplyScalar(1.3));
        } else {
          this.vel.set(0, 0, 0);
          // peck the ground while idle
          this.peckT -= dt;
          if (this.peckT <= 0) {
            this.peckT = 2 + Math.random() * 4;
            this.peckAnim = 0.5;
          }
        }
      }
    } else if (this.state === 'entering') {
      // finale: march to an assigned point (set by the cinematic), ignoring
      // the house collider so it can walk through the doorway
      _v1.subVectors(this.enterTarget, pos).setY(0);
      if (_v1.length() > 0.35) {
        this.vel.copy(_v1.normalize().multiplyScalar(7.5));
      } else {
        this.vel.set(0, 0, 0);
      }
    } else {
      // boid follow: seek the penguin, separate from flock-mates
      _v1.subVectors(ctx.penguinPos, pos).setY(0);
      const d = _v1.length();
      const desired = _v2.set(0, 0, 0);
      if (d > 2.1) {
        const speed = d > 16 ? 13 : 6.8;
        desired.copy(_v1.normalize().multiplyScalar(speed));
      }
      for (const other of ctx.followers) {
        if (other === this) continue;
        const dx = pos.x - other.pos.x;
        const dz = pos.z - other.pos.z;
        const dd = dx * dx + dz * dz;
        if (dd > 0.0001 && dd < 1.21) {
          const inv = 1 / Math.sqrt(dd);
          desired.x += dx * inv * 2.8;
          desired.z += dz * inv * 2.8;
        }
      }
      this.vel.lerp(desired, 1 - Math.exp(-5 * dt));
      if (this.vel.length() > 13) this.vel.setLength(13);
    }

    pos.addScaledVector(this.vel, dt);
    pos.x = THREE.MathUtils.clamp(pos.x, -WORLD.BOUND, WORLD.BOUND);
    pos.z = THREE.MathUtils.clamp(pos.z, -WORLD.BOUND, WORLD.BOUND);
    if (this.state !== 'entering') collide(pos, 0.3);

    // hop + face direction of travel
    const speed = Math.hypot(this.vel.x, this.vel.z);
    if (speed > 0.2) {
      this.phase += dt * (5 + speed * 2.2);
      pos.y = Math.abs(Math.sin(this.phase)) * 0.16;
      const yaw = Math.atan2(this.vel.x, this.vel.z);
      let diff = yaw - this.group.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.group.rotation.y += diff * Math.min(1, dt * 10);
      this.wingL.rotation.z = 0.4 + Math.sin(this.phase * 2) * 0.3;
      this.wingR.rotation.z = -0.4 - Math.sin(this.phase * 2) * 0.3;
    } else {
      pos.y = 0;
      this.wingL.rotation.z = 0;
      this.wingR.rotation.z = 0;
    }

    if (this.peckAnim > 0) {
      this.peckAnim -= dt;
      this.head.rotation.x = Math.sin(Math.PI * Math.max(0, this.peckAnim) / 0.5) * 0.9;
    } else {
      this.head.rotation.x = 0;
    }
  }
}
