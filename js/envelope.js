// Stage 1: the envelope opening sequence and the letter reveal.

import { CONFIG } from './config.js';

export function initEnvelope({ onGift }) {
  const envelope = document.getElementById('envelope');
  const hint = document.getElementById('open-hint');
  const giftBtn = document.getElementById('gift-btn');

  document.getElementById('letter-title').textContent = CONFIG.letterTitle;
  document.getElementById('letter-message').textContent = CONFIG.letterMessage;
  giftBtn.textContent = CONFIG.giftButtonText;

  let opened = false;
  let gifted = false;

  envelope.addEventListener('click', () => {
    if (opened) return;
    opened = true;
    hint.classList.add('gone');
    envelope.classList.add('open');                                    // flap lifts
    setTimeout(() => envelope.classList.add('letter-out'), 550);       // letter slides up
    setTimeout(() => envelope.classList.add('revealed'), 1450);        // letter grows + text fades in
  });

  giftBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (gifted || !envelope.classList.contains('revealed')) return;
    gifted = true;
    giftBtn.textContent = 'Loading your gift… 🐧';
    onGift();
  });
}
