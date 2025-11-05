/* global GIF_FRAMES, gifImgs, gifEnabled, drawGifBackground, drawFallbackBackground,
   getFaceLandmarks, getSmileScore, calibrateSmile, drawEyes, drawMouth,
   updateSmile, isVideoReady, calibCount, calibFrames, isSmiling, setupFace, setupVideo, playBeep */

let bgFallbackImage = null; // fallback background image if GIF frames not loaded

function preload() {
  // load only the initial/seasonal background we want (Spring) immediately
  loadImage('Images/Jass/Jass-Summer.png',
    img => { bgFallbackImage = img; console.log('Loaded initial bg: Jass-Summer.png'); },
    err => { bgFallbackImage = null; console.warn('Jass-Summer.png not found'); }
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
    // CHANGED: always call drawGifBackground — it handles both GIF frames and persistent shield
    drawGifBackground();

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
}