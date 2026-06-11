import { CONFIG } from './config.js';
import { startHearts } from './hearts.js';
import { initEnvelope } from './envelope.js';

document.title = CONFIG.pageTitle;

const stage1 = document.getElementById('stage1');
const stage2 = document.getElementById('stage2');
const heartsCtl = startHearts(document.getElementById('hearts-canvas'));

initEnvelope({
  onGift: async () => {
    // Load the 3D game (three.js comes from a CDN) before fading the letter out.
    const game = await import('./game/game.js');
    stage1.classList.add('fade-out');
    setTimeout(() => {
      heartsCtl.stop();
      stage1.classList.add('hidden');
      stage2.classList.remove('hidden');
      game.startGame();
    }, 700);
  },
});
