// core/Deck.js
//
// Deck represents one historical era (one "deck").
// It owns multiple suits (Spring, Summer, etc. in that era).
//
// Responsibilities:
//  - keep deck metadata
//  - keep reference and load the deck intro/back image
//  - build its Suit objects and let them load their assets
//
// Note: We assume Suit.js is in the same core/ folder or adjust the import path accordingly.

class Deck {
  constructor(deckConfig) {
    this.id = deckConfig.id;
    this.label = deckConfig.label;   // e.g. "Ancient Age"
    this.order = deckConfig.order;   // deck order in historical timeline

    // deck intro card image path (what you show in StartScene)
    this.backImgPath = deckConfig.backImg || null;
    this.backImg = null;             // p5.Image after loadAssets()

    // Build Suit instances for each provided suitConfig
    this.suits = (deckConfig.suits || []).map(
      suitCfg => new Suit(suitCfg)
    );

    // Convenience lookup so we can say "give me the suit for 'spring'"
    this.suitsBySeasonName = {};
    this.suits.forEach(suit => {
      this.suitsBySeasonName[suit.seasonName] = suit;
    });
  }

  // Return e.g. the Spring suit, Summer suit, etc.
  getSuitForSeason(seasonName) {
    return this.suitsBySeasonName[seasonName];
  }

  // Load deck-level art (backImg) and tell each Suit to load its landscape image.
  loadAssets(p) {
    if (this.backImgPath) {
      this.backImg = p.loadImage(this.backImgPath);
    }

    this.suits.forEach(suit => suit.loadAssets(p));
  }
}