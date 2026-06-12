// ===========================================================
//  EDIT THIS FILE to personalize the gift! 💝
//  Everything she will read lives here.
// ===========================================================

export const CONFIG = {
  // Her name (used in the game messages)
  herName: 'Yulia',

  // Browser tab title
  pageTitle: 'A gift for Yulia 💌',

  // The letter (stage 1)
  letterTitle: 'For my dearest Yulia ❤️',
  letterMessage: `Every day with you feels like a little adventure,
so I made you one of your very own.

You make my world softer, warmer and a whole lot cuter —
just like the little friends you are about to meet.

I love you more than all the bobas in the world. 💕

— Your penguin`,

  // The button at the bottom of the letter
  giftButtonText: '🎁 Tap to open your gift',

  // How many bobas she has to collect to win
  bobaGoal: 50,

  // Shown when she wins
  winTitle: 'YOU SAVED ALL THE BOBAS!',
  winMessage: `You brought every single boba home safely…
just like you found your way into my heart.

I love you, Yulia. Forever your penguin. 🐧💖`,

  // ---- every other text in the game ----
  ui: {
    // stage 1
    openHint: 'Tap the envelope to open it ✨',
    loadingGift: 'Loading your gift… 🐧',

    // in-game banners ({goal} is replaced with bobaGoal)
    bannerMove: 'Waddle around with the joystick 🕹️🐧',
    bannerCollect: 'Tap wild bobas to befriend them — collect {goal}! 🐤',
    bannerFox: '⚠️ A fox is hunting your bobas! Tap it to scare it away! 🦊',
    bannerGoal: 'All {goal} bobas! Bring them home to the Boba Farm! 🏠💕',
    bannerCat: '🐱 You found Theo the cat! He will pounce on the next fox that gets too close 💕',

    // HUD
    counterIcon: '🐤',          // shown before "12/50"
    distanceUnit: 'm',          // suffix on compass distances

    // the wooden sign next to the house (two short lines)
    signTop: 'BOBA',
    signBottom: 'FARM',

    // win screen
    winEmoji: '🐧💕🐤',
    replayButton: 'Play again 💕',
  },
};
