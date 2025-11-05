// core/Suit.js
//
// Represents one suit of a deck, which in your logic maps to one season
// (Spring, Summer, etc.) in that deck.
//
// The Suit holds:
//  - semantic info (seasonName, emotion, element, etc.)
//  - the path to the seasonal landscape image and the loaded p5.Image
//  - the list of interaction configs for this season
//
// It does NOT create FaceInteraction objects; that is done in LevelScene
// when that season is actually being played.

class Suit {
  constructor(suitConfig) {
    // e.g. "Love / Spring"
    this.name = suitConfig.name;

    // e.g. "spring"
    this.seasonName = suitConfig.seasonName;
    // 1, 2, 3, 4 (Spring=1, Summer=2, Autumn=3, Winter=4)
    this.seasonOrder = suitConfig.seasonOrder;

    // "water", "fire", etc.
    this.element = suitConfig.element;
    // "love", "joy", etc.
    this.emotion = suitConfig.emotion;

    // Path to the seasonal background/landscape image (string from config)
    this.landscapeImgPath = suitConfig.landscapeImg || null;
    // The actual loaded p5.Image goes here after loadAssets()
    this.landscapeImg = null;

    // Array of raw interaction configs, exactly as defined in deckData.js.
    // Example of one interaction config:
    // {
    //   type: "face",
    //   mode: "smile",
    //   gifFrames: [...optional...],
    //   textIntro: "...",
    //   textDuring: "...",
    //   durationSec: 5
    // }
    this.interactions = Array.isArray(suitConfig.interactions)
      ? suitConfig.interactions
      : [];
  }

  // Called from setup() after creating Deck/Suit instances.
  // p is the p5 instance (in global mode you can use `this` from setup()).
  loadAssets(p) {
    if (this.landscapeImgPath) {
      this.landscapeImg = p.loadImage(this.landscapeImgPath);
    }
  }
}