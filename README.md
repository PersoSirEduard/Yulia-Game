# 🐧💌 The Boba Farm — a gift game

A two-stage gift game for web and mobile (touch + mouse):

1. **The Letter** — a sealed envelope on a beige background with pixel hearts
   drifting down. Tap it and the flap opens, the letter slides out and grows
   into a card with a personal message and a 🎁 button.
2. **The Game** — a 3D Minecraft-style voxel world. You play a Pingu-inspired
   penguin (on-screen mini joystick, or WASD/arrows on desktop) and must
   collect **50 wild bobas** (baby chicks) by tapping them — they're skittish
   and run from you, but you're faster. Collected bobas follow you around as a
   little boid flock. **Foxes** (up to 3 at once, spawning faster the bigger
   your flock) sneak in from the edges of the map to hunt your flock, and only
   retreat when you tap them or your flock is gone. Rarely, **Theo the
   Siamese cat** appears sitting somewhere on the map (no compass marker —
   he's a secret): tap him and he follows you, then pounces on the next fox
   that gets too close and chases it off the map. Once you
   have all 50, bring the flock back to the pink **Boba Farm** house at the
   spawn point — a little finale plays out: the door opens, the bobas hop
   inside one by one, and a second penguin comes out for a kiss before the
   win screen. A compass around the middle of the screen points to the
   nearest wild boba 🐤, the nearest fox 🦊⚠️ and the farm 🏠, with distances.

No build step, no server-side code — it's a fully static site. Three.js is
vendored in `vendor/`, so it even works offline once loaded.

## ✏️ Personalize it

Everything she will read lives in **`js/config.js`**: her name, the letter
title and message, the gift button text, the win-screen message, and the boba
goal (50 by default). The `ui` section holds every other string in the game —
tutorial banners, the fox warning, the HUD counter icon, compass distance
unit, the wooden sign by the house, and the win screen's emoji and replay
button. Edit that one file and you're done.

## ▶️ Run locally

ES modules need an HTTP server (opening `index.html` from disk won't work):

```bash
npx serve .          # or: python3 -m http.server 8000
```

Then open http://localhost:8000 (or whatever port it prints).

## 🚀 Deploy (pick one)

- **GitHub Pages** — push to GitHub, then *Settings → Pages → Deploy from
  branch*, pick your branch and `/ (root)`. Your gift goes live at
  `https://<user>.github.io/<repo>/`.
- **Netlify / Vercel / Cloudflare Pages** — drag-and-drop the folder or link
  the repo; no build command, output dir is the repo root.

Send her the link. 💕

## 🗂 Project layout

```
index.html            both stages' markup
css/style.css         envelope animation, HUD, overlays
js/config.js          ← the file you edit
js/main.js            stage switching
js/hearts.js          falling pixel-heart particles (stage 1 + win screen)
js/envelope.js        envelope open / letter reveal sequence
js/game/game.js       game loop, input, spawning, win logic
js/game/world.js      voxel island, trees, fence, the pink Boba Farm
js/game/penguin.js    the player character
js/game/boba.js       baby-chick: wild wander + boid following
js/game/fox.js        fox AI: sneak, hunt, eat, flee
js/game/joystick.js   on-screen joystick (pointer events: touch + mouse)
js/game/compass.js    HUD direction indicators
js/game/audio.js      chiptune sound effects (WebAudio, no files)
js/game/voxel.js      shared box-building helpers
vendor/               three.js r160 (vendored)
```
