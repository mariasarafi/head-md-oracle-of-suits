// scenes/StartScene.js
//
// This scene shows the intro/back image of the first deck in historical order.
// When the user clicks, we move to LevelScene for the first season of that deck.

class StartScene {
  constructor(gameState, sceneManager) {
    this.gameState = gameState;
    this.sceneManager = sceneManager;

    this.deckToShow = null;
  }

  enter() {
    // Pick the first deck by its "order" property.
    // We'll store a reference so we can draw it.
    if (!this.gameState.decks || !this.gameState.decks.length) {
      console.warn("StartScene.enter(): no decks available");
      this.deckToShow = null;
      return;
    }

    // find deck with min order
    let best = this.gameState.decks[0];
    let bestOrder = best.order ?? 9999;
    for (let i = 1; i < this.gameState.decks.length; i++) {
      const d = this.gameState.decks[i];
      const ord = d.order ?? 9999;
      if (ord < bestOrder) {
        best = d;
        bestOrder = ord;
      }
    }
    this.deckToShow = best;
  }

  draw(p) {
    p.background(0);

    // Draw the deck back image full screen if available,
    // otherwise just write text.
    if (this.deckToShow && this.deckToShow.backImg) {
      p.image(this.deckToShow.backImg, 0, 0, p.width, p.height);
    } else {
      p.fill(255);
      p.textAlign(p.CENTER, p.CENTER);
      p.textSize(28);
      p.text(
        "Click to begin the first era",
        p.width / 2,
        p.height / 2
      );
    }

    // Optional UI hint
    p.push();
    p.fill(255);
    p.textAlign(p.CENTER, p.BOTTOM);
    p.textSize(16);
    p.text("Click to continue", p.width / 2, p.height - 30);
    p.pop();
  }

  mousePressed(p) {
    // User clicked: lock in that first deck and go to first LevelScene.
    this.gameState.selectFirstDeckByOrder();

    // after selecting deck, we're positioned at suit index 0 (Spring)
    this.sceneManager.setScene(
      new LevelScene(this.gameState, this.sceneManager)
    );
  }
}
