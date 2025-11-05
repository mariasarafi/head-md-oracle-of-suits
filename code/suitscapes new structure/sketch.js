// sketch.js
//
// p5 global entrypoint.
// Assumes the following scripts have already run (in this order):
//  - p5.min.js, p5.sound.min.js
//  - camera_utils.js, face_landmark.js
//  - MediaPipeFace.js
//  - config/deckData.js          (defines DECK_CONFIG)
//  - core/Suit.js                (defines class Suit)
//  - core/Deck.js                (defines class Deck)
//  - core/GameState.js           (defines class GameState)
//  - core/UIController.js        (defines class UIController)
//  - scenes/SceneManager.js      (defines class SceneManager)
//  - visuals/GIFOverlay.js       (defines class GIFOverlay)
//  - interactions/FaceInteraction.js (defines class FaceInteraction)
//  - scenes/EndScene.js          (class EndScene)
//  - scenes/LevelScene.js        (class LevelScene)
//  - scenes/StartScene.js        (class StartScene)
// Then *this* file.
//
// Resulting flow in runtime:
//  1. We create decks from DECK_CONFIG, which includes suits/seasons and interactions
//  2. We load images for deck.backImg and suit.landscapeImg using p5.loadImage()
//  3. We create GameState(decks)
//  4. We create SceneManager(p5) and set StartScene
//  5. StartScene shows the first deck intro card and waits for a mouse click
//  6. On click, StartScene tells GameState to select the first deck in historical order,
//     and SceneManager switches to LevelScene
//  7. LevelScene starts the first season (Spring), starts camera+face tracking
//     through FaceInteraction, and runs smile detection.
//  8. After success it auto-advances to next season (Summer). After last season,
//     we go to EndScene.

let gameState = null;
let sceneManager = null;
let decks = [];

// Helper to create Deck instances from DECK_CONFIG and prepare GameState.
function setupDecksAndGameState(p) {
  // Build all Deck objects from config.
  // Each Deck internally builds its Suit objects.
  decks = DECK_CONFIG.map(cfg => new Deck(cfg));

  // Ask each Deck to load its assets:
  //  - Deck.backImg (intro card art)
  //  - Suit.landscapeImg (per-season background)
  decks.forEach(d => {
    d.loadAssets(p);
  });

  // Create the global game state tracker.
  gameState = new GameState(decks);

  // We do NOT immediately select a deck here, because
  // StartScene will pick the first one on click.
}

// p5 preload() is empty for now. If we ever need to hard-block image loading
// before showing the first frame, we could move some of Deck.loadAssets()
// into here.
function preload() {
  // currently unused
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);

  setupDecksAndGameState(this);

  // Build the scene manager (needs the p5 instance)
  sceneManager = new SceneManager(this);

  // Start on the intro / deck card scene
  sceneManager.setScene(
    new StartScene(gameState, sceneManager)
  );
}

function draw() {
  // Heartbeat / watchdog log every ~2 seconds at 60fps.
  // This is similar to your original "if (frameCount % 120 === 0) console.log(...)"
  if (frameCount % 120 === 0) {
    console.log("frame", frameCount);
  }

  if (sceneManager) {
    sceneManager.draw();
  } else {
    // fallback frame in case something went wrong
    background(0);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(24);
    text("Initializing…", width / 2, height / 2);
  }
}

// Forward mouse presses to the active scene.
// StartScene uses this to go to LevelScene when you click the deck card.
function mousePressed() {
  if (sceneManager) {
    sceneManager.mousePressed();
  }
}

// Keep canvas responsive
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

/* global GIF_FRAMES, gifImgs, gifEnabled, drawGifBackground, drawFallbackBackground,
   getFaceLandmarks, getSmileScore, calibrateSmile, drawEyes, drawMouth,
   updateSmile, isVideoReady, calibCount, calibFrames, isSmiling, setupFace, setupVideo, playBeep */

/*let bgFallbackImage = null; // fallback background image if GIF frames not loaded

function preload() {
  // load only the initial/seasonal background we want (Spring) immediately
  loadImage('assets/images/Jass/Jass-Spring.png',
    img => { bgFallbackImage = img; console.log('Loaded initial bg: Jass-Spring.png'); },
    err => { bgFallbackImage = null; console.warn('Jass-Spring.png not found'); }
  );

  // existing GIF frame loads (keep them)
  for (let i = 0; i < GIF_FRAMES.length; i++) gifImgs[i] = null;
  for (let i = 0; i < GIF_FRAMES.length; i++) {
    loadImage(GIF_FRAMES[i],
      img => { gifImgs[i] = img; console.log('Loaded GIF frame:', GIF_FRAMES[i]); },
      err => { console.warn('Failed to load GIF frame:', GIF_FRAMES[i], err); }
    );
  }
}  

function setup() {
  // full window canvas
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  
  // initialize MediaPipe
  if (typeof setupFace === 'function') setupFace();
  if (typeof setupVideo === 'function') setupVideo();

  if (typeof setInteractionMode === 'function') {
    setInteractionMode('smile');
  } else {
    window.pendingInteractionMode = 'smile';
  }
  window.userSelected = true; // allow draw() to proceed immediately

  // ensure we reference and hide the video element off-screen (so detection continues)
  // do not use display:none (can suspend video in some browsers)
  setTimeout(() => {
    const v = window.videoElement || document.querySelector('video');
    if (v) {
      window.videoElement = v;
      v.style.position = 'absolute';
      v.style.left = '-9999px';
      v.style.top = '-9999px';
      v.style.width = '1px';
      v.style.height = '1px';
      v.style.opacity = '0';
      console.log('Video hidden off-screen to use GIF background while keeping detection running.');
    } else {
      console.warn('No video element found to hide.');
    }
  }, 300);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  // heartbeat log (optional)
  if (frameCount % 120 === 0) console.log('frame', frameCount);

  try {
    // draw GIF background only if enabled; otherwise draw fallback
    if (gifEnabled) {
      drawGifBackground();
    } else {
      drawFallbackBackground();
    }

    // get detected faces (guard if helper missing)
    let faces = [];
    if (typeof getFaceLandmarks === 'function') {
      try { faces = getFaceLandmarks() || []; } catch(e) { console.warn('getFaceLandmarks failed', e); faces = []; }
    }

    // If GIF still enabled, perform calibration and smile detection.
    if (gifEnabled) {
      // Instruction at top — show only when camera is really ready
  
  // --- Camera readiness and UI: keep calibration message, show "Please smile" only when camera ready AND calibration finished
      let cameraReady = false;
      if (typeof isVideoReady === 'function') {
        try { cameraReady = isVideoReady(); } catch (e) { cameraReady = false; }
      } else {
        const v = window.videoElement || document.querySelector('video');
        cameraReady = !!(v && (v.readyState >= 2 || (v.videoWidth > 0 && v.videoHeight > 0)));
      }

      // calibration message (still shown while calibrating)
      if (faces && faces.length > 0 && calibCount < calibFrames && gifEnabled) {
        push();
        textAlign(CENTER, CENTER);
        textSize(18);
        fill(255, 200, 0);
        noStroke();
        text('Calibrating — please hold a neutral face...', width / 2, 40);
        pop();

        const s = getSmileScore();
        calibrateSmile(s);
      }

      // show "Please smile" only when BOTH camera is ready AND calibration finished
      if (cameraReady && (calibCount >= calibFrames) && gifEnabled) {
        push();
        textAlign(CENTER, TOP);
        textSize(28);
        fill(255, 50, 120);
        noStroke();
        text('Please smile', width * 0.5, 80); // positioned below calibration message
        pop();
      }
      
      // draw face overlays if face present
      if (faces && faces.length > 0) {
        try {
          drawEyes(faces[0]);
          drawMouth(faces[0]);
        } catch (e) {
          console.error('drawEyes/drawMouth error:', e);
        }
      }

      // update smile detection and UI feedback only while gifEnabled
      try { updateSmile(); } catch (e) { console.error('updateSmile error:', e); }
      
      // don't show success message anymore; just "Try again!" if not smiling
      /*if (showSuccessUntil > millis()) {
        push();
        textAlign(CENTER, CENTER);
        textSize(32);
        fill(0, 255, 140);
        noStroke();
        text('Success', width * 0.5, height - 80);
        pop();
      } else */ 
       /*
      if (!isSmiling) {
        push();
        textAlign(CENTER, CENTER);
        textSize(28);
        fill(255, 50, 120);
        noStroke();
        text('Try again!', width * 0.5, height - 80);
        pop();
      }

    } else {
      // gif disabled: still draw face overlays but skip all smile logic
      if (faces && faces.length > 0) {
        try {
          drawEyes(faces[0]);
          drawMouth(faces[0]);
        } catch (e) {
          console.error('drawEyes/drawMouth error:', e);
        }
      }
      // ensure smile state is cleared/ignored
      isSmiling = false;
    }

    // optional debug pulse when calibration complete
    if (calibCount >= calibFrames) {
      push();
      noStroke();
      fill(0, 255, 0, 40);
      ellipse(width - 40, 40, 18, 18);
      pop();
    }

  } catch (err) {
    console.error('Unhandled draw error:', err);
    background(0);
    push();
    fill(255, 80, 80);
    textAlign(CENTER, CENTER);
    textSize(18);
    text('An error occurred — check console', width/2, height/2);
    pop();
  }
}*/