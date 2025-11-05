// scenes/EndScene.js
//
// Final scene shown after the last season is completed.

class EndScene {
  constructor(gameState, sceneManager) {
    this.gameState = gameState;
    this.sceneManager = sceneManager;
  }

  enter() {
    // nothing special for now
  }

  draw(p) {
    p.background(0);

    p.fill(255);
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(32);
    p.text("Thank you.", p.width / 2, p.height / 2);

    p.textSize(16);
    p.text("Reload the page to restart.", p.width / 2, p.height / 2 + 40);
  }
}
