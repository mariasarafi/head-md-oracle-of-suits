// scenes/LevelScene.js
//
// LevelScene = one "season step":
//   - shows the current suit's seasonal landscape background
//   - runs its first interaction (FaceInteraction for now)
//   - shows an instructional GIF overlay for that interaction (if provided)
//   - after success, hides the overlay and advances
//   - auto-progresses to the next season in GameState
//   - after the last season, goes to EndScene.
//
// Dependencies:
//   - GameState (gives us current deck, current suit, and advance())
//   - UIController (draws header + prompt text boxes)
//   - FaceInteraction (logic for smile, calibration, completion)
//   - GIFOverlay (renders looping instructional frames if any)
//   - EndScene (final scene after last step)

class LevelScene {
  constructor(gameState, sceneManager) {
    this.gameState = gameState;
    this.sceneManager = sceneManager;

    this.ui = new UIController();

    this.currentInteractionIndex = 0;
    this.currentInteraction = null;

    this.levelComplete = false;
    this._transitionStartMs = null;

    // We'll draw the animated cue via this overlay.
    this.overlay = new GIFOverlay({
      frameHoldMs: 500,
      useCrossfade: false,
      displayHeightRatio: 0.5,
      allowUpscale: false
    });

    // We'll store the currently active landscape image for the suit.
    this.currentLandscapeImg = null;
  }

  // Called when this scene becomes active.
  enter() {
    this.currentInteractionIndex = 0;
    this.levelComplete = false;
    this.currentInteraction = null;
    this._transitionStartMs = null;

    // Get the suit for the current season in the chosen deck
    const suit = this.gameState.currentSuit;

    // Suit assets should already be loaded in setup() via suit.loadAssets(p).
    // We'll just keep a reference for drawing
    this.currentLandscapeImg = suit.landscapeImg || null;

    // Kick off the first interaction for this suit
    this._startCurrentInteraction();
  }

  // Internal: start (or restart) the appropriate interaction step
  _startCurrentInteraction() {
    const suit = this.gameState.currentSuit;
    const interactions = suit.interactions || [];

    if (!interactions.length) {
      // No interactions defined for this season: mark done immediately
      this._finishLevelAndScheduleNext();
      return;
    }

    const cfg = interactions[this.currentInteractionIndex];

    // For now, all interactions are face-based. Later you can branch on cfg.type.
    this.currentInteraction = new FaceInteraction(cfg);

    // Ask the interaction to load its GIF frames (if any)
    this.currentInteraction.loadAssets(this.sceneManager.p);

    // Give these frames to the overlay so it knows what to draw
    this.overlay.setFrames(this.currentInteraction.getGifFrames());

    // Start the face tracking / calibration
    const maybePromise = this.currentInteraction.start?.(this.sceneManager.p);
    if (maybePromise && typeof maybePromise.then === "function") {
      // Catch so we don't get stuck forever if camera fails
      maybePromise.catch(err => {
        console.warn("LevelScene: FaceInteraction.start() failed:", err);
        this._advanceInteractionOrFinishLevel();
      });
    }
  }

  // Move to the next interaction in the SAME suit, or finish the suit if there is no next
  _advanceInteractionOrFinishLevel() {
    const suit = this.gameState.currentSuit;
    const interactions = suit.interactions || [];

    if (this.currentInteractionIndex < interactions.length - 1) {
      // There is another step in this same season
      this.currentInteractionIndex += 1;
      this.currentInteraction = null;
      this._startCurrentInteraction();
      return;
    }

    // No more interactions in this suit/season
    this._finishLevelAndScheduleNext();
  }

  // Mark this season/level done and prep auto-transition
  _finishLevelAndScheduleNext() {
    this.levelComplete = true;
    this.currentInteraction = null;
    this._transitionStartMs = null;
  }

  // After we declare the level complete, call this each frame
  // to see if we should move on to the next season or to EndScene
  _maybeAdvanceToNextScene() {
    if (!this.levelComplete) return;

    if (this._transitionStartMs === null) {
      this._transitionStartMs = millis();
      return;
    }

    const elapsed = millis() - this._transitionStartMs;
    const WAIT_MS = 2000; // pause duration before switching scenes

    if (elapsed >= WAIT_MS) {
      // Ask GameState to advance (spring -> summer)
      const hasMore = this.gameState.advance();

      if (hasMore) {
        // There is another season to show
        this.sceneManager.setScene(
          new LevelScene(this.gameState, this.sceneManager)
        );
      } else {
        // No more seasons -> go to final scene
        this.sceneManager.setScene(
          new EndScene(this.gameState, this.sceneManager)
        );
      }
    }
  }

  // p is the p5 instance (in global mode, "this" from sketch.js)
  draw(p) {
    const suit = this.gameState.currentSuit;
    const deck = this.gameState.currentDeck;

    // 1. Draw the seasonal background full screen
    if (this.currentLandscapeImg) {
      p.image(this.currentLandscapeImg, 0, 0, p.width, p.height);
    } else {
      p.background(0);
    }

    // 2. Draw the animated overlay IF active
    //    Note: even if overlayVisible is true, if the interaction had no gifFrames,
    //    this.overlay.draw() will early-return and draw nothing. That's OK.
    let overlayVisible = false;
    if (this.currentInteraction && this.currentInteraction.isGifActive) {
      overlayVisible = this.currentInteraction.isGifActive();
    }
    this.overlay.draw(p, overlayVisible);

    // 3. Draw UI header (deck era, season name, element, emotion)
    this.ui.drawHeader(
      p,
      deck.label,        // e.g. "Ancient Age"
      suit.seasonName,   // e.g. "spring"
      suit.element,      // e.g. "water"
      suit.emotion       // e.g. "love"
    );

    // 4. If this level is already complete, show transition message and advance after delay
    if (this.levelComplete) {
      this.ui.showPrompt(
        p,
        "Stage complete.\nPreparing next step..."
      );
      this._maybeAdvanceToNextScene();
      return;
    }

    // 5. Otherwise, drive the active interaction
    if (this.currentInteraction) {
      // Update face tracking/calibration/smile detection
      this.currentInteraction.update(p);

      // Ask the interaction what prompt text we should display right now
      let displayText = "";
      if (this.currentInteraction.getDisplayTextDuring) {
        displayText = this.currentInteraction.getDisplayTextDuring(p);
      } else if (this.currentInteraction.config) {
        // fallback to config text if method not defined
        const cfg = this.currentInteraction.config;
        displayText = cfg.textDuring || cfg.textIntro || "";
      }

      // Draw the bottom prompt box
      this.ui.showPrompt(p, displayText);

      // Check whether the interaction step is done
      if (this.currentInteraction.checkCompletion()) {
        if (this.currentInteraction.stop) {
          this.currentInteraction.stop();
        }
        this._advanceInteractionOrFinishLevel();
      }

    } else {
      // Safety fallback if something went wrong with the interaction
      this.ui.showPrompt(p, "...");
      this._advanceInteractionOrFinishLevel();
    }
  }
}
