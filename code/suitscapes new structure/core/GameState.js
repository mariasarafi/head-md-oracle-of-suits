 // core/GameState.js
//
// GameState tracks which deck is active and which season (suit) within that deck
// the player is currently in. It provides helpers LevelScene and StartScene use.
//
// Assumptions:
// - You load all decks from deckData.js and pass them to GameState.
// - Only one deck is active at a time (the first deck for now).
// - Suits inside a deck each correspond to a season and have seasonOrder 1..4.

class GameState {
  constructor(decks) {
    this.decks = decks || [];

    // Which deck is currently being played (index in this.decks)
    this.currentDeckIndex = 0;

    // Which suit index within that deck is currently active.
    // We'll not assume suits are already sorted, so we'll build an ordered list.
    this.currentSuitIndex = 0;

    // Pre-sort each deck's suits by seasonOrder so Spring(1), Summer(2), Autumn(3), Winter(4).
    this.decks.forEach(deck => {
      deck.suits.sort((a, b) => {
        const ao = (a.seasonOrder ?? 999);
        const bo = (b.seasonOrder ?? 999);
        return ao - bo;
      });
    });
  }

  // Pick the first deck according to historical order (deck.order)
  // Call this right after StartScene click.
  selectFirstDeckByOrder() {
    if (!this.decks.length) return;

    // find min order
    let bestIdx = 0;
    let bestOrder = this.decks[0].order ?? 9999;
    for (let i = 1; i < this.decks.length; i++) {
      const ord = this.decks[i].order ?? 9999;
      if (ord < bestOrder) {
        bestOrder = ord;
        bestIdx = i;
      }
    }

    this.currentDeckIndex = bestIdx;
    this.currentSuitIndex = 0;
  }

  // Convenience getters
  get currentDeck() {
    return this.decks[this.currentDeckIndex];
  }

  get currentSuit() {
    const d = this.currentDeck;
    if (!d) return null;
    return d.suits[this.currentSuitIndex] || null;
  }

  // Advance to next suit/season in the same deck.
  // Returns true if there IS a next suit, false if we've finished all suits.
  advance() {
    const d = this.currentDeck;
    if (!d) return false;

    this.currentSuitIndex += 1;

    if (this.currentSuitIndex < d.suits.length) {
      return true; // there is another season to play
    }

    // No more suits -> stay at last valid index just in case,
    // but signal completion.
    this.currentSuitIndex = d.suits.length - 1;
    return false;
  }
}