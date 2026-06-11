// HUD compass: indicators orbiting the center of the screen, pointing at the
// nearest wild boba, the nearest fox (with a warning badge), and the Boba Farm.

import { CONFIG } from '../config.js';

export class Compass {
  constructor(container) {
    this.items = {
      boba: this.makeItem(container, '🐤', ''),
      fox: this.makeItem(container, '🦊', '⚠️'),
      house: this.makeItem(container, '🏠', ''),
    };
  }

  makeItem(container, icon, badge) {
    const item = document.createElement('div');
    item.className = 'compass-item';
    item.innerHTML = `
      <div class="ci-rotor"><span class="ci-arrow">▲</span></div>
      <span class="ci-icon">${icon}${badge ? `<span class="ci-badge">${badge}</span>` : ''}</span>
      <span class="ci-dist"></span>`;
    container.appendChild(item);
    item.style.display = 'none';
    return {
      el: item,
      rotor: item.querySelector('.ci-rotor'),
      dist: item.querySelector('.ci-dist'),
    };
  }

  // targets: { boba: Vector3|null, fox: Vector3|null, house: Vector3 }
  update(penguinPos, targets, houseReady) {
    const radius = Math.min(window.innerWidth, window.innerHeight) * 0.17 + 46;
    for (const key of Object.keys(this.items)) {
      const item = this.items[key];
      const target = targets[key];
      if (!target) {
        item.el.style.display = 'none';
        continue;
      }
      const dx = target.x - penguinPos.x;
      const dz = target.z - penguinPos.z;
      const dist = Math.hypot(dx, dz);
      // Hide boba/fox markers when the target is basically on screen already.
      if (key !== 'house' && dist < 9) {
        item.el.style.display = 'none';
        continue;
      }
      item.el.style.display = 'flex';
      // Camera looks toward -Z, so world +X is screen-right and world +Z is screen-down.
      const nx = dx / dist;
      const ny = dz / dist;
      item.el.style.transform = `translate(${nx * radius}px, ${ny * radius}px)`;
      item.rotor.style.transform = `rotate(${Math.atan2(nx, -ny) * 180 / Math.PI}deg)`;
      item.dist.textContent = `${Math.round(dist)}${CONFIG.ui.distanceUnit}`;
    }
    this.items.house.el.classList.toggle('pulse', !!houseReady);
  }
}
