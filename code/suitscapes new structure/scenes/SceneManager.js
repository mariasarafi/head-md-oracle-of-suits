// scenes/SceneManager.js
//
// Minimal scene manager.
// You give it p5 instance 'p' (in global mode that's just the p5 global).
// You call sceneManager.draw() inside draw().
// You forward mousePressed() calls to it.

class SceneManager {
  constructor(p) {
    this.p = p;
    this.currentScene = null;
  }

  setScene(sceneInstance) {
    this.currentScene = sceneInstance;
    if (this.currentScene && this.currentScene.enter) {
      this.currentScene.enter();
    }
  }

  draw() {
    if (this.currentScene && this.currentScene.draw) {
      this.currentScene.draw(this.p);
    }
  }

  mousePressed() {
    if (this.currentScene && this.currentScene.mousePressed) {
      this.currentScene.mousePressed(this.p);
    }
  }
}
