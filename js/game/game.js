// Stage 2: the 3D voxel game. Collect 50 bobas, fend off foxes,
// bring the flock home to the Boba Farm.

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { startHearts } from '../hearts.js';
import { WORLD, buildWorld, collide } from './world.js';
import { createPenguin } from './penguin.js';
import { Boba } from './boba.js';
import { Fox } from './fox.js';
import { Cat } from './cat.js';
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

  const { doorPivot } = buildWorld(scene);

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
  const cats = [];
  const burstHearts = [];
  let bobaSpawnT = 2;
  let foxSpawnT = 14;
  let catSpawnT = 25 + Math.random() * 25;
  let goalAnnounced = false;
  let foxAnnounced = false;
  let catAnnounced = false;
  let won = false;
  let cine = null; // finale cinematic state

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

  function spawnCat() {
    const cat = new Cat(randomSpawnPos());
    scene.add(cat.group);
    cats.push(cat);
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
    if (won || cine) return;
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 14) return;
    if (performance.now() - downTime > 450) return;

    pointerNdc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(pointerNdc, camera);
    const targets = [
      ...wild.map((b) => b.hit),
      ...followers.map((b) => b.hit),
      ...foxes.map((f) => f.hit),
      ...cats.map((c) => c.hit),
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
    } else if (owner.isCat && owner.state === 'sitting') {
      owner.startFollowing();
      sfx.meow();
      heartBurst(owner.pos, 3);
      if (!catAnnounced) {
        catAnnounced = true;
        showBanner(text('bannerCat'), 5500);
      }
    } else if (owner.isCat) {
      sfx.meow();
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

  // ---------- finale cinematic ----------
  // Everything is staged on the FRONT (+Z) side of the house: the walk-up
  // spot, the door, the boba parade and the kiss all happen at z > house
  // front face, and the camera shoots the facade from out front.
  const DOOR_POS = new THREE.Vector3(0, 0, -8.55);     // doorway, world space
  const DOOR_FRONT = new THREE.Vector3(0, 0, -6.5);    // queue point outside
  const DOOR_INSIDE = new THREE.Vector3(0, 0, -9.6);   // into the dark
  const CINE_SPOT = new THREE.Vector3(2.6, 0, -3.4);   // where our penguin watches
  const KISS_SPOT = new THREE.Vector3(0.2, 0, -3.4);   // partner stops here

  function startCinematic() {
    const route = [];
    // if the penguin is beside/behind the house, swing around the near side
    // first so the walk-up always arrives from the front
    if (penguin.group.position.z < -7.5) {
      route.push(new THREE.Vector3(penguin.group.position.x >= 0 ? 8.5 : -8.5, 0, -3));
    }
    route.push(CINE_SPOT);
    cine = {
      phase: 'walk',
      t: 0,
      route,
      queue: followers.slice(),  // bobas waiting to go inside
      entering: [],
      launchT: 0,
      launched: 0,
      heartT: 0,
      partner: null,
      partnerStage: 0,           // 0: step out the door, 1: walk to the kiss spot
    };
    for (const fox of foxes) if (fox.state === 'hunt') fox.startLeaving();
    document.getElementById('joystick-zone').style.display = 'none';
    document.getElementById('compass').style.display = 'none';
    showBanner(text('bannerHome'), 4000);
  }

  const cineMove = new THREE.Vector3();
  let cineAmount = 0;
  const _mid = new THREE.Vector3();

  function updateCinematic(dt) {
    cine.t += dt;
    cineMove.set(0, 0, 0);
    cineAmount = 0;

    if (cine.phase === 'walk') {
      const target = cine.route[0];
      _mid.subVectors(target, penguin.group.position).setY(0);
      if (_mid.length() > 0.4 && cine.t < 8) {
        cineMove.copy(_mid.normalize());
        cineAmount = 0.85;
      } else {
        cine.route.shift();
        if (cine.route.length === 0 || cine.t >= 8) {
          penguin.face(DOOR_POS);
          cine.phase = 'door';
          cine.t = 0;
          sfx.door();
        }
      }
    } else if (cine.phase === 'door') {
      doorPivot.rotation.y = -Math.min(1, cine.t / 0.9) * 2.0; // swing outward
      if (cine.t > 1.2) {
        cine.phase = 'bobas';
        cine.t = 0;
      }
    } else if (cine.phase === 'bobas') {
      // launch the flock through the door one by one, speeding up a little
      cine.launchT -= dt;
      if (cine.launchT <= 0 && cine.queue.length) {
        cine.launchT = Math.max(0.08, 0.18 - cine.launched * 0.002);
        cine.launched++;
        const boba = cine.queue.shift();
        followers.splice(followers.indexOf(boba), 1);
        boba.state = 'entering';
        boba.enterTarget = DOOR_FRONT.clone();
        cine.entering.push(boba);
        sfx.parade(cine.launched);
      }
      for (let i = cine.entering.length - 1; i >= 0; i--) {
        const boba = cine.entering[i];
        if (boba.pos.distanceTo(boba.enterTarget) < 0.6) {
          boba.enterTarget = DOOR_INSIDE; // reached the queue point: head inside
        }
        if (boba.pos.z < -8.55) {
          boba.removed = true;
          scene.remove(boba.group);
          cine.entering.splice(i, 1);
        }
      }
      if (!cine.queue.length && !cine.entering.length) {
        cine.phase = 'partner';
        cine.t = 0;
        cine.partner = createPenguin({ bow: true });
        cine.partner.group.scale.setScalar(0.95);
        cine.partner.group.position.copy(DOOR_INSIDE);
        cine.partner.group.rotation.y = 0; // facing +Z, out the door
        scene.add(cine.partner.group);
      }
    } else if (cine.phase === 'partner') {
      const target = cine.partnerStage === 0 ? DOOR_FRONT : KISS_SPOT;
      _mid.subVectors(target, cine.partner.group.position).setY(0);
      const d = _mid.length();
      if (d > 0.35) {
        _mid.normalize();
        cine.partner.group.position.addScaledVector(_mid, 5.5 * dt);
        cine.partner.update(dt, 0.85, _mid);
        penguin.face(cine.partner.group.position);
      } else if (cine.partnerStage === 0) {
        cine.partnerStage = 1; // out the door — now head to the sweetheart
      } else {
        cine.partner.face(penguin.group.position);
        penguin.face(cine.partner.group.position);
        cine.phase = 'kiss';
        cine.t = 0;
        sfx.kiss();
      }
    } else if (cine.phase === 'kiss') {
      const lean = 0.22 * Math.min(1, cine.t / 0.6);
      penguin.lean(lean);
      cine.partner.lean(lean);
      cine.partner.update(dt, 0, _mid.set(0, 0, 0));
      doorPivot.rotation.y = -Math.max(0, 2.0 - cine.t * 1.5); // door drifts shut
      cine.heartT -= dt;
      if (cine.heartT <= 0) {
        cine.heartT = 0.28;
        _mid.addVectors(penguin.group.position, cine.partner.group.position).multiplyScalar(0.5);
        _mid.y = 0.8;
        heartBurst(_mid, 2);
      }
      if (cine.t > 3) {
        cine.phase = 'end';
        win();
      }
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
  window.__game = {
    wild, followers, foxes, cats, camera, penguin, collectBoba, spawnFox, spawnCat,
    get cine() { return cine; },
  };

  // ---------- main loop ----------
  const clock = new THREE.Clock();
  const moveDir = new THREE.Vector3();
  const camPosT = new THREE.Vector3();
  const camLookT = new THREE.Vector3();
  const camLook = new THREE.Vector3().copy(WORLD.SPAWN_POS);

  function tick() {
    requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);

    // --- input (player, or the finale cinematic driving the penguin) ---
    let amount;
    if (cine) {
      updateCinematic(dt);
      moveDir.copy(cineMove);
      amount = cineAmount;
    } else {
      let mx = joystick.value.x;
      let mz = joystick.value.y;
      if (!joystick.active) {
        mx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
        mz = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
      }
      moveDir.set(mx, 0, mz);
      amount = Math.min(moveDir.length(), 1);
      if (won) amount = 0;
    }
    if (amount > 0.01) {
      moveDir.normalize();
      const p = penguin.group.position;
      p.addScaledVector(moveDir, PENGUIN_SPEED * amount * dt);
      p.x = THREE.MathUtils.clamp(p.x, -WORLD.BOUND, WORLD.BOUND);
      p.z = THREE.MathUtils.clamp(p.z, -WORLD.BOUND, WORLD.BOUND);
    }
    collide(penguin.group.position, 0.75);
    penguin.update(dt, amount, moveDir);

    // --- camera: follow normally, or frame the house facade for the finale ---
    if (cine) {
      if (cine.phase === 'walk' || cine.phase === 'door' || cine.phase === 'bobas') {
        camPosT.set(6.5, 9, 3.5);       // out front, framing door + flock
        camLookT.set(0, 1.2, -7.5);
      } else {
        camPosT.set(1.4, 4.8, 5.0);     // head-on: the couple in profile
        camLookT.set(1.4, 1.4, -3.4);
      }
    } else {
      camPosT.copy(penguin.group.position).add(CAM_OFFSET);
      camLookT.set(penguin.group.position.x, 1, penguin.group.position.z);
    }
    const camDamp = 1 - Math.exp(-(cine ? 2.2 : 6) * dt);
    camera.position.lerp(camPosT, camDamp);
    camLook.lerp(camLookT, camDamp);
    camera.lookAt(camLook);

    // --- creatures ---
    const ctx = {
      penguinPos: penguin.group.position,
      followers,
      onEat: onBobaEaten,
    };
    for (const boba of wild) boba.update(dt, ctx);
    for (const boba of followers) boba.update(dt, ctx);
    if (cine) for (const boba of cine.entering) boba.update(dt, ctx);
    for (let i = foxes.length - 1; i >= 0; i--) {
      foxes[i].update(dt, ctx);
      if (foxes[i].dead) {
        scene.remove(foxes[i].group);
        foxes.splice(i, 1);
      }
    }
    for (let i = cats.length - 1; i >= 0; i--) {
      cats[i].update(dt, ctx);
      if (cats[i].dead) {
        scene.remove(cats[i].group);
        cats.splice(i, 1);
      }
    }

    // --- Theo on guard: pounce when a hunting fox is about to reach a boba ---
    const guard = cats.find((c) => c.state === 'following');
    if (guard) {
      for (const fox of foxes) {
        if (fox.state !== 'hunt' || !fox.target) continue;
        if (distXZ(fox.pos, fox.target.pos) < 3.2) {
          fox.scare(guard.pos);   // flees away from the cat
          guard.defend(fox);      // and the cat runs it off the map
          sfx.meow();
          sfx.foxFlee();
          heartBurst(guard.pos, 3);
          break;                  // one defense per cat
        }
      }
    }

    // --- spawning ---
    if (!won && !cine && followers.length < goal && wild.length < WILD_TARGET) {
      bobaSpawnT -= dt;
      if (bobaSpawnT <= 0) {
        bobaSpawnT = 2 + Math.random() * 2;
        spawnWildBoba();
      }
    }
    // up to 3 foxes at once; they spawn faster the bigger your flock gets
    if (!won && !cine && followers.length >= 3 && foxes.length < 3) {
      foxSpawnT -= dt;
      if (foxSpawnT <= 0) {
        foxSpawnT = (10 + Math.random() * 8) * (12 / (12 + followers.length));
        spawnFox();
      }
    }

    // a rare visitor: at most one cat at a time, with a long random pause
    // after the previous one disappears
    if (!won && !cine && cats.length === 0) {
      catSpawnT -= dt;
      if (catSpawnT <= 0) {
        catSpawnT = 50 + Math.random() * 50;
        spawnCat();
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
    if (!cine) {
      compass.update(
        penguin.group.position,
        {
          boba: followers.length >= goal ? null : nearestWild && nearestWild.pos,
          fox: nearestFox && nearestFox.pos,
          house: WORLD.HOUSE_POS,
        },
        followers.length >= goal
      );
    }

    // --- finale check ---
    if (!won && !cine && followers.length >= goal &&
        distXZ(penguin.group.position, WORLD.HOUSE_POS) < WORLD.HOUSE_RADIUS) {
      startCinematic();
    }

    renderer.render(scene, camera);
  }
  tick();
}
