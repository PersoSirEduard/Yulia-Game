// Falling pixel-heart particles on a 2D canvas (stage 1 background + win screen).

const HEART_PATTERN = [
  '.XX.XX.',
  'XXXXXXX',
  'XXXXXXX',
  '.XXXXX.',
  '..XXX..',
  '...X...',
];
const COLORS = ['#e25b6e', '#ef8ba1', '#d94f63', '#f6aec4', '#ce4257', '#f08080'];

export function startHearts(canvas, density = 1) {
  const ctx = canvas.getContext('2d');
  let w = 0;
  let h = 0;
  let hearts = [];
  let raf = 0;
  let last = performance.now();
  let stopped = false;

  function spawn(anywhere) {
    const px = 2 + Math.random() * 3.5;
    return {
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : -8 * px,
      px,
      speed: 22 + Math.random() * 48,
      swayAmp: 8 + Math.random() * 26,
      swayFreq: 0.5 + Math.random() * 1.2,
      phase: Math.random() * Math.PI * 2,
      color: COLORS[(Math.random() * COLORS.length) | 0],
      alpha: 0.35 + Math.random() * 0.5,
    };
  }

  function resize() {
    w = canvas.width = canvas.clientWidth;
    h = canvas.height = canvas.clientHeight;
    const count = Math.max(12, Math.min(80, Math.round((w * h) / 22000 * density)));
    while (hearts.length < count) hearts.push(spawn(true));
    hearts.length = count;
  }

  function draw(heart, t) {
    const x = heart.x + Math.sin(t * heart.swayFreq + heart.phase) * heart.swayAmp;
    ctx.globalAlpha = heart.alpha;
    ctx.fillStyle = heart.color;
    const s = heart.px;
    for (let r = 0; r < HEART_PATTERN.length; r++) {
      const row = HEART_PATTERN[r];
      for (let c = 0; c < row.length; c++) {
        if (row[c] === 'X') ctx.fillRect(x + c * s, heart.y + r * s, s + 0.5, s + 0.5);
      }
    }
  }

  function frame(now) {
    if (stopped) return;
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    const t = now / 1000;
    ctx.clearRect(0, 0, w, h);
    for (const heart of hearts) {
      heart.y += heart.speed * dt;
      if (heart.y > h + 10) Object.assign(heart, spawn(false));
      draw(heart, t);
    }
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener('resize', resize);
  raf = requestAnimationFrame(frame);

  return {
    stop() {
      stopped = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    },
  };
}
