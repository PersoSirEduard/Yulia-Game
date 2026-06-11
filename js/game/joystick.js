// On-screen mini joystick. Pointer events => works with both touch and mouse.

export class Joystick {
  constructor(zoneEl, knobEl) {
    this.zone = zoneEl;
    this.knob = knobEl;
    this.value = { x: 0, y: 0 };
    this.active = false;
    this.pointerId = null;

    zoneEl.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.pointerId = e.pointerId;
      this.active = true;
      zoneEl.setPointerCapture(e.pointerId);
      this.track(e);
    });
    zoneEl.addEventListener('pointermove', (e) => {
      if (this.active && e.pointerId === this.pointerId) this.track(e);
    });
    const release = (e) => {
      if (e.pointerId === this.pointerId) this.reset();
    };
    zoneEl.addEventListener('pointerup', release);
    zoneEl.addEventListener('pointercancel', release);
  }

  track(e) {
    const rect = this.zone.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const max = rect.width / 2;
    const len = Math.hypot(dx, dy);
    if (len > max) {
      dx = (dx / len) * max;
      dy = (dy / len) * max;
    }
    this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
    this.value.x = dx / max;
    this.value.y = dy / max;
  }

  reset() {
    this.active = false;
    this.pointerId = null;
    this.value.x = 0;
    this.value.y = 0;
    this.knob.style.transform = 'translate(0px, 0px)';
  }
}
