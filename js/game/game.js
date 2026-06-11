// Stage 2: the 3D voxel game. Collect 50 bobas, fend off foxes,
// bring the flock home to the Boba Farm.

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { startHearts } from '../hearts.js';
import { WORLD, buildWorld, collide } from './world.js';
import { createPenguin } from './penguin.js';
import { Boba } from './boba.js';
import { Fox } from './fox.js';
import { Joystick } from './joystick.js';
import { Compass } from './compass.js';
import { sfx } from './audio.js';
import { distXZ } from './voxel.js';

const PENGUIN_SPEED = 7.5;
const WILD_TARGET = 8;          // wild bobas kept on the map
const CAM_OFFSET = new THREE.Vector3(0, 23, 17);

export function startGame() {
  // ---------- renderer / scene / camera ----------
  const container = document.getElementById('game-container');
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  // Native-res rendering keeps edges sharp; the Minecraft look comes from the
  // blocky geometry and nearest-filtered textures, not a low-res framebuffer.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.BasicShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#9fd8ef');
  scene.fog = new THREE.Fog('#9fd8ef', 70, 180);

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.5, 400);

  scene.add(new THREE.HemisphereLight('#cfe8ff', '#7fb069', 0.95));
  const sun = new THREE.DirectionalLight('#fff3d6', 1.5);
  sun.position.set(45, 70, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = sc.bottom = -75;
  sc.right = sc.top = 75;
  sc.near = 10;
  sc.far = 200;
  scene.add(sun);

  buildWorld(scene);

  const penguin = createPenguin();
  penguin.group.position.copy(WORLD.SPAWN_POS);
  scene.add(penguin.group);
  camera.position.copy(penguin.group.position).add(CAM_OFFSET);
  camera.lookAt(penguin.group.position);

  // ---------- state ----------
  const goal = CONFIG.bobaGoal;
  const wild = [];
  const followers = [];
  const foxes = [];
  const burstHearts = [];
  let bobaSpawnT = 2;
  let foxSpawnT = 14;
  let goalAnnounced = false;
  let foxAnnounced = false;
  let won = false;

  // ---------- HUD ----------
  const counterEl = document.getElementById('boba-counter');
  const bannerEl = document.getElementById('banner');
  const compass = new Compass(document.getElementById('compass'));
  const joystick = new Joystick(
    document.getElementById('joystick-zone'),
    document.getElementById('joystick-knob')
  );

  const muteBtn = document.getElementById('mute-btn');
  muteBtn.addEventListener('click', () => {
    sfx.muted = !sfx.muted;
    muteBtn.textContent = sfx.muted ? '🔇' : '🔊';
  });
  document.getElementById('replay-btn').addEventListener('click', () => location.reload());

  let bannerTimeout = 0;
  function showBanner(text, ms = 4000) {
    bannerEl.textContent = text;
    bannerEl.classList.add('show');
    clearTimeout(bannerTimeout);
    bannerTimeout = setTimeout(() => bannerEl.classList.remove('show'), ms);
  }

  const text = (key) => CONFIG.ui[key].replaceAll('{goal}', goal);

  function updateCounter() {
    counterEl.textContent = `${CONFIG.ui.counterIcon} ${followers.length}/${goal}`;
    counterEl.classList.remove('pop');
    void counterEl.offsetWidth;
    counterEl.classList.add('pop');
  }
  updateCounter();

  showBanner(text('bannerMove'), 3600);
  setTimeout(() => showBanner(text('bannerCollect'), 4500), 4000);

  // ---------- keyboard (desktop bonus) ----------
  const keys = {};
  window.addEventListener('keydown', (e) => (keys[e.code] = true));
  window.addEventListener('keyup', (e) => (keys[e.code] = false));

  // ---------- spawning ----------
  function randomSpawnPos() {
    for (let tries = 0; tries < 20; tries++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 16 + Math.random() * (WORLD.BOUND - 18);
      const p = new THREE.Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
      if (distXZ(p, WORLD.HOUSE_POS) < 14) continue;
      if (distXZ(p, penguin.group.position) < 10) continue;
      return p;
    }
    return new THREE.Vector3(20, 0, 20);
  }

  function spawnWildBoba() {
    const boba = new Boba(randomSpawnPos());
    scene.add(boba.group);
    wild.push(boba);
  }
  for (let i = 0; i < WILD_TARGET; i++) spawnWildBoba();

  function spawnFox() {
    const edge = WORLD.BOUND + 4;
    const side = (Math.random() * 4) | 0;
    const t = (Math.random() * 2 - 1) * edge;
    const pos = [
      new THREE.Vector3(t, 0, -edge),
      new THREE.Vector3(t, 0, edge),
      new THREE.Vector3(-edge, 0, t),
      new THREE.Vector3(edge, 0, t),
    ][side];
    const fox = new Fox(pos);
    scene.add(fox.group);
    foxes.push(fox);
    if (!foxAnnounced) {
      foxAnnounced = true;
      showBanner(text('bannerFox'), 5000);
    }
  }

  // ---------- events: collect / eat / scare ----------
  function collectBoba(boba) {
    wild.splice(wild.indexOf(boba), 1);
    followers.push(boba);
    boba.setFollowing();
    sfx.collect();
    heartBurst(boba.pos, 4);
    updateCounter();
    if (followers.length >= goal && !goalAnnounced) {
      goalAnnounced = true;
      sfx.goal();
      showBanner(text('bannerGoal'), 6000);
    }
  }

  function onBobaEaten(boba) {
    const inWild = wild.indexOf(boba);
    if (inWild !== -1) wild.splice(inWild, 1);
    const inFlock = followers.indexOf(boba);
    if (inFlock !== -1) {
      followers.splice(inFlock, 1);
      updateCounter();
    }
    boba.removed = true;
    scene.remove(boba.group);
    sfx.eat();
  }

  // ---------- tap / click handling ----------
  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();
  let downX = 0;
  let downY = 0;
  let downTime = 0;

  renderer.domElement.addEventListener('pointerdown', (e) => {
    sfx.unlock();
    downX = e.clientX;
    downY = e.clientY;
    downTime = performance.now();
  });

  renderer.domElement.addEventListener('pointerup', (e) => {
    if (won) return;
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 14) return;
    if (performance.now() - downTime > 450) return;

    pointerNdc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(pointerNdc, camera);
    const targets = [
      ...wild.map((b) => b.hit),
      ...followers.map((b) => b.hit),
      ...foxes.map((f) => f.hit),
      penguin.hit,
    ];
    const hits = raycaster.intersectObjects(targets, false);
    if (!hits.length) return;
    const owner = hits[0].object.userData.owner;

    if (owner.isBoba && owner.state === 'wild') {
      collectBoba(owner);
    } else if (owner.isFox) {
      owner.scare(penguin.group.position);
      sfx.foxFlee();
      heartBurst(owner.pos, 2);
    } else if (owner.isBoba || owner.isPenguin) {
      sfx.chirp();
      heartBurst(owner.isPenguin ? penguin.group.position : owner.pos, 2);
    }
  });

  // ---------- 3D heart bursts ----------
  const heartTexture = (() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 16;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#e8597e';
    const pattern = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
    pattern.forEach((row, r) => {
      [...row].forEach((c, i) => {
        if (c === 'X') ctx.fillRect(1 + i * 2, 2 + r * 2, 2, 2);
      });
    });
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    return tex;
  })();
  const heartMat = new THREE.SpriteMaterial({ map: heartTexture, transparent: true });

  function heartBurst(pos, count) {
    for (let i = 0; i < count; i++) {
      const sprite = new THREE.Sprite(heartMat.clone());
      sprite.position.set(pos.x + (Math.random() - 0.5), pos.y + 1 + Math.random(), pos.z + (Math.random() - 0.5));
      sprite.scale.setScalar(0.9);
      scene.add(sprite);
      burstHearts.push({ sprite, life: 0.9 });
    }
  }

  // ---------- win ----------
  function win() {
    won = true;
    sfx.win();
    document.getElementById('win-title').textContent = CONFIG.winTitle;
    document.getElementById('win-message').textContent = CONFIG.winMessage;
    document.getElementById('win-emoji').textContent = CONFIG.ui.winEmoji;
    document.getElementById('replay-btn').textContent = CONFIG.ui.replayButton;
    document.getElementById('win-overlay').classList.remove('hidden');
    startHearts(document.getElementById('win-hearts'), 1.4);
  }

  // ---------- resize ----------
  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  // debug/testing handle (not used by the game itself)
  window.__game = { wild, followers, foxes, camera, penguin, collectBoba, spawnFox };

  // ---------- main loop ----------
  const clock = new THREE.Clock();
  const moveDir = new THREE.Vector3();
  const camTarget = new THREE.Vector3();

  function tick() {
    requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);

    // --- input ---
    let mx = joystick.value.x;
    let mz = joystick.value.y;
    if (!joystick.active) {
      mx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
      mz = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
    }
    moveDir.set(mx, 0, mz);
    let amount = Math.min(moveDir.length(), 1);
    if (won) amount = 0;
    if (amount > 0.01) {
      moveDir.normalize();
      const p = penguin.group.position;
      p.addScaledVector(moveDir, PENGUIN_SPEED * amount * dt);
      p.x = THREE.MathUtils.clamp(p.x, -WORLD.BOUND, WORLD.BOUND);
      p.z = THREE.MathUtils.clamp(p.z, -WORLD.BOUND, WORLD.BOUND);
    }
    collide(penguin.group.position, 0.75);
    penguin.update(dt, amount, moveDir);

    // --- camera follow ---
    camTarget.copy(penguin.group.position).add(CAM_OFFSET);
    camera.position.lerp(camTarget, 1 - Math.exp(-6 * dt));
    camera.lookAt(penguin.group.position.x, 1, penguin.group.position.z);

    // --- creatures ---
    const ctx = {
      penguinPos: penguin.group.position,
      followers,
      onEat: onBobaEaten,
    };
    for (const boba of wild) boba.update(dt, ctx);
    for (const boba of followers) boba.update(dt, ctx);
    for (let i = foxes.length - 1; i >= 0; i--) {
      foxes[i].update(dt, ctx);
      if (foxes[i].dead) {
        scene.remove(foxes[i].group);
        foxes.splice(i, 1);
      }
    }

    // --- spawning ---
    if (!won && followers.length < goal && wild.length < WILD_TARGET) {
      bobaSpawnT -= dt;
      if (bobaSpawnT <= 0) {
        bobaSpawnT = 2 + Math.random() * 2;
        spawnWildBoba();
      }
    }
    // up to 3 foxes at once; they spawn faster the bigger your flock gets
    if (!won && followers.length >= 3 && foxes.length < 3) {
      foxSpawnT -= dt;
      if (foxSpawnT <= 0) {
        foxSpawnT = (10 + Math.random() * 8) * (12 / (12 + followers.length));
        spawnFox();
      }
    }

    // --- heart particles ---
    for (let i = burstHearts.length - 1; i >= 0; i--) {
      const h = burstHearts[i];
      h.life -= dt;
      h.sprite.position.y += dt * 1.6;
      h.sprite.material.opacity = Math.max(0, h.life / 0.9);
      if (h.life <= 0) {
        scene.remove(h.sprite);
        h.sprite.material.dispose();
        burstHearts.splice(i, 1);
      }
    }

    // --- compass ---
    let nearestWild = null;
    let bestW = Infinity;
    for (const boba of wild) {
      const d = distXZ(boba.pos, penguin.group.position);
      if (d < bestW) {
        bestW = d;
        nearestWild = boba;
      }
    }
    let nearestFox = null;
    let bestF = Infinity;
    for (const fox of foxes) {
      if (fox.state !== 'hunt') continue;
      const d = distXZ(fox.pos, penguin.group.position);
      if (d < bestF) {
        bestF = d;
        nearestFox = fox;
      }
    }
    compass.update(
      penguin.group.position,
      {
        boba: followers.length >= goal ? null : nearestWild && nearestWild.pos,
        fox: nearestFox && nearestFox.pos,
        house: WORLD.HOUSE_POS,
      },
      followers.length >= goal
    );

    // --- win check ---
    if (!won && followers.length >= goal &&
        distXZ(penguin.group.position, WORLD.HOUSE_POS) < WORLD.HOUSE_RADIUS) {
      win();
    }

    renderer.render(scene, camera);
  }
  tick();
}
