// the blendshapes we are going to track
let leftEyeBlink = 0.0;
let rightEyeBlink = 0.0;
let jawOpen = 0.0;

// --- smile detection --- keep threshold around 0.50 - 0.65; if based on mouth-width fallback then 0.35-0.55
const SMILE_THRESH = 0.55;
let lastSmileScore = 0;
let isSmiling = false;
let SMILE_AUTOCALIB = true;
let smileBaseline = 0;
let calibFrames = 60;
let calibCount = 0;

// audio context for beep (lazy init)
let audioCtx = null;

// show "Success" for a short time after a smile is detected
let showSuccessUntil = 0;

// GIF-like animation from two images (replace single bgImage usage)
// Configure these two filenames (place them in Images/)
const GIF_FRAMES = [
  'Images/01_ChatGPT Image Oct 14, 2025 at 12_03_08 PM.png', // change to your first image filename
  'Images/02_ChatGPT Image Oct 14, 2025 at 11_59_17 AM.png'  // change to your second image filename
];

let gifImgs = [];
const GIF_FPS = 6;          // frames per second for the GIF
const USE_CROSSFADE = false; // set false for hard cut between frames
// control how long each frame is shown (ms). Set to 2000 for 2 seconds per frame.
const GIF_FRAME_HOLD_MS = 500; // <-- change this value for longer/shorter interval

let bgFallbackImage = null;

function preload() {
  // load the two frames into gifImgs
  for (let i = 0; i < GIF_FRAMES.length; i++) {
    // loadImage will fail silently in callback; we store null on error
    gifImgs[i] = loadImage(
      GIF_FRAMES[i],
      img => { gifImgs[i] = img; console.log('Loaded', GIF_FRAMES[i]); },
      err => { console.warn('Failed to load', GIF_FRAMES[i], err); gifImgs[i] = null; }
    );
  }

  // load fallback background image (used instead of black)
  loadImage('Images/jass-summer.png',
    img => { bgFallbackImage = img; console.log('Loaded fallback bg: Images/jass-summer.png'); },
    err => { bgFallbackImage = null; console.warn('Images/jass-summer.png not found'); }
  );
}

function setup() {
  // full window canvas
  createCanvas(windowWidth, windowHeight);
  // initialize MediaPipe
  setupFace();
  setupVideo();

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
    // draw GIF background instead of camera
    drawGifBackground();

    // Instruction at top (same styling as "Try again!")
    push();
    textAlign(CENTER, TOP);
    textSize(28);
    fill(255, 50, 120); // same color as "Try again!"
    noStroke();
    text('Smile please :)', width * 0.5, 80); // 80 instead of 12
    pop();

    // get detected faces (guard if helper missing)
    let faces = [];
    if (typeof getFaceLandmarks === 'function') {
      try { faces = getFaceLandmarks() || []; } catch(e) { console.warn('getFaceLandmarks failed', e); faces = []; }
    }

    // calibration + face drawing only if face present
    if (faces && faces.length > 0) {
      if (calibCount < calibFrames) {
        const s = getSmileScore();
        calibrateSmile(s);
        push();
        textAlign(CENTER, CENTER);
        textSize(18);
        fill(255, 200, 0);
        text('Calibrating — please hold a neutral face...', width / 2, 40);
        pop();
      }

      try {
        drawEyes(faces[0]);
        drawMouth(faces[0]);
      } catch (e) {
        console.error('drawEyes/drawMouth error:', e);
      }
    }

    // update smile detection and UI feedback
    try { updateSmile(); } catch (e) { console.error('updateSmile error:', e); }

    if (showSuccessUntil > millis()) {
      push();
      textAlign(CENTER, CENTER);
      textSize(32);
      fill(0, 255, 140);
      noStroke();
      text('Success', width * 0.5, height - 80);
      pop();
    } else if (!isSmiling) {
      push();
      textAlign(CENTER, CENTER);
      textSize(28);
      fill(255, 50, 120);
      noStroke();
      text('Try again!', width * 0.5, height - 80);
      pop();
    }

    // optional debug pulse when calibration complete
    if (calibCount >= calibFrames) {
      push();
      noStroke();
      fill(0, 255, 0, 40);
      ellipse(width - 40, 40, 18, 18);
      pop();
    }

    // existing bubbles, stars, explosions draws (if you have them) should still be called elsewhere
    // e.g. updateAndDrawBubbles(); updateAndDrawStars(); updateAndDrawExplosions();

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

// Safe draw() wrapper with diagnostics to avoid silent freeze
/*function draw() {
  // minimal frame-based watchdog text (helps diagnose freeze timing)
  if (frameCount % 120 === 0) {
    // every 120 frames print a heartbeat
    console.log('frame', frameCount);
  }

  // wrap entire frame in try/catch so one error won't stop draw()
  try {
    // clear the canvas
    background(128);

    if (typeof isVideoReady === 'function' && isVideoReady()) {
      // show video frame if available
      if (typeof videoElement !== 'undefined' && videoElement) {
        image(videoElement, 0, 0);
      }
    }

    // get detected faces (guard if helper missing)
    let faces = [];
    if (typeof getFaceLandmarks === 'function') {
      try { faces = getFaceLandmarks() || []; } catch(e) { console.warn('getFaceLandmarks failed', e); faces = []; }
    }

    // calibration + face drawing only if face present
    if (faces && faces.length > 0) {
      if (calibCount < calibFrames) {
        const s = getSmileScore();
        calibrateSmile(s);
        // optional visual hint while calibrating
        push();
        textAlign(CENTER, CENTER);
        textSize(18);
        fill(255, 200, 0);
        text('Calibrating — please hold a neutral face...', width / 2, 40);
        pop();
      }

      // draw face overlays with try/catch to avoid exceptions killing the loop
      try {
        drawEyes(faces[0]);
        drawMouth(faces[0]);
      } catch (e) {
        console.error('drawEyes/drawMouth error:', e);
      }
    }

    // update smile detection (guard)
    try { updateSmile(); } catch (e) { console.error('updateSmile error:', e); }

    // feedback text (show Success briefly on smile; otherwise show Try again when not smiling)
    if (showSuccessUntil > millis()) {
      push();
      textAlign(CENTER, CENTER);
      textSize(32);
      fill(0, 255, 140);
      noStroke();
      text('Success', width * 0.5, height - 80);
      pop();
    } else if (!isSmiling) {
      push();
      textAlign(CENTER, CENTER);
      textSize(28);
      fill(255, 50, 120);
      noStroke();
      text('Try again!', width * 0.5, height - 80);
      pop();
    }

    // optional: draw debug pulse if calibration complete
    if (calibCount >= calibFrames) {
      push();
      noStroke();
      fill(0, 255, 0, 40);
      ellipse(width - 40, 40, 18, 18);
      pop();
    }

  } catch (err) {
    // general safety net: log and show message but keep loop running
    console.error('Unhandled draw error:', err);
    background(0);
    push();
    fill(255, 80, 80);
    textAlign(CENTER, CENTER);
    textSize(18);
    text('An error occurred — check console', width/2, height/2);
    pop();
  }
} */

function drawBlendshapeScores() {
  fill(255);
  noStroke();
  textSize(16);
  text("leftEyeBlink: " + leftEyeBlink.toFixed(2), 10, height - 60);
  text("rightEyeBlink: " + rightEyeBlink.toFixed(2), 10, height - 40);
  text("jawOpen: " + jawOpen.toFixed(2), 10, height - 20);
}

function drawEyes() {

  // ordered rings (outer loop first) from the helper
  const leftEye = getFeatureRings('FACE_LANDMARKS_LEFT_EYE');
  const rightEye = getFeatureRings('FACE_LANDMARKS_RIGHT_EYE');
  const leftIris = getFeatureRings('FACE_LANDMARKS_LEFT_IRIS');
  const rightIris = getFeatureRings('FACE_LANDMARKS_RIGHT_IRIS');

  if (!leftEye || !rightEye) return;

  // --- outline the sockets (no fill) ---
  noFill();
  stroke(255, 255, 0);
  strokeWeight(1);

  // left eye outline
  beginShape();
  for (let p of leftEye[0]) {
    vertex(p.x, p.y);
  }
  endShape(CLOSE);

  // right eye outline
  beginShape();
  for (let p of rightEye[0]) {
    vertex(p.x, p.y);
  }
  endShape(CLOSE);

  // fill the irises only if the eyes aren’t blinking
  if (leftEyeBlink < 0.5) {
    noStroke();
    fill(0, 255, 0); // left
    beginShape();
    for (let p of leftIris[0]) {
      vertex(p.x, p.y);
    }
    endShape(CLOSE);
  }

  if (rightEyeBlink < 0.5) {
    noStroke();
    fill(0, 0, 255); // right
    beginShape();
    for (let p of rightIris[0]) {
      vertex(p.x, p.y);
    }
    endShape(CLOSE);
  }
}

function drawMouth() {

  let mouth = getFeatureRings('FACE_LANDMARKS_LIPS');
  // make sure we have mouth data
  if (!mouth) return;

  // set fill and stroke based on jawOpen value
  if (jawOpen > 0.5) {
    fill(0, 255, 255, 64);
    stroke(0, 255, 255);
  } else {
    fill(255, 255, 0, 64);
    stroke(255, 255, 0);
  }

  // there are two rings: outer lip and inner lip
  let outerLip = mouth[0];
  let innerLip = mouth[1];

  // draw outer lip
  beginShape();
  for (const p of outerLip) {
    vertex(p.x, p.y);
  }

  // draw inner lip as a hole
  beginContour();
  // we need to go backwards around the inner lip
  for (let j = innerLip.length - 1; j >= 0; j--) {
    const p = innerLip[j];
    vertex(p.x, p.y);
  }
  endContour();
  endShape(CLOSE);

  // if jaw is open
  if (jawOpen > 0.5) {
    // fuchsia fill
    fill(255, 0, 255);
  } else {
    // yellow fill
    fill(255, 255, 0);
  }

  // fill inner mouth
  beginShape();
  for (const p of innerLip) {
    vertex(p.x, p.y);
  }
  endShape(CLOSE);

}

// returns a 0..1 smile score (prefers blendshapes, falls back to mouth-width heuristic)
function getSmileScore() {
  let score = 0;
  // prefer blendshape values if available
  if (typeof getBlendshapeScore === 'function') {
    const left = getBlendshapeScore('mouthSmileLeft') || getBlendshapeScore('smileLeft') || 0;
    const right = getBlendshapeScore('mouthSmileRight') || getBlendshapeScore('smileRight') || 0;
    score = max(left, right);
  }

  // fallback: estimate from mouth outer lip ring width
  if (!score || score <= 0.01) {
    let mouth = null;
    try { mouth = getFeatureRings('FACE_LANDMARKS_LIPS'); } catch (e) { mouth = null; }
    if (mouth && mouth[0] && mouth[0].length) {
      const ring = mouth[0];
      let minX = Infinity, maxX = -Infinity;
      for (let p of ring) { minX = min(minX, p.x); maxX = max(maxX, p.x); }
      const mouthWidthPx = maxX - minX;
      // adjust these values if needed for your camera/face size
      score = constrain(map(mouthWidthPx, 20, width * 0.35, 0, 1), 0, 1);
    }
  }

  return score;
}

// call this each frame (after blendshapes are read) to update isSmiling and fire onSmile()
function updateSmile() {
  const score = getSmileScore();
  // rising edge detection
  if (score > SMILE_THRESH && lastSmileScore <= SMILE_THRESH) {
    onSmile(score);
  }
  isSmiling = (score > SMILE_THRESH);
  lastSmileScore = score;
  return score;
}


// hook called when a smile is detected (rising edge)
function onSmile(score) {
  // play short beep
  playBeep(900 + score * 400, 0.12, 'sine');

  // show success text for 1.2s
  showSuccessUntil = millis() + 1200;

  // you can still call spawnStarsAt here if desired
  if (typeof spawnStarsAt === 'function') {
    let cx = width * 0.5, cy = height * 0.6;
    let mouth = null;
    try { mouth = getFeatureRings('FACE_LANDMARKS_LIPS'); } catch (e) { mouth = null; }
    if (mouth && mouth[0] && mouth[0].length) {
      const ring = mouth[0];
      let sx = 0, sy = 0;
      for (let p of ring) { sx += p.x; sy += p.y; }
      cx = sx / ring.length;
      cy = sy / ring.length;
    }
    spawnStarsAt(cx, cy);
  }
}

  function playBeep(freq = 880, duration = 0.12, type = 'sine') {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    // resume if suspended (browsers require user gesture sometimes)
    if (audioCtx.state === 'suspended' && typeof audioCtx.resume === 'function') {
      audioCtx.resume().catch(() => {});
    }
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.stop(now + duration + 0.02);
  } catch (e) {
    console.warn('Beep failed:', e);
  }
}

function calibrateSmile(score) {
  try {
    if (!SMILE_AUTOCALIB || calibCount >= calibFrames) return;
    smileBaseline = (smileBaseline * calibCount + score) / (calibCount + 1);
    calibCount++;
    if (calibCount === calibFrames) {
      SMILE_THRESH = constrain(smileBaseline + 0.18, 0.3, 0.8);
      // use console.log safely (nf may not be present in some contexts)
      try {
        console.log('Smile baseline', typeof nf === 'function' ? nf(smileBaseline,1,3) : smileBaseline,
                    'threshold set to', typeof nf === 'function' ? nf(SMILE_THRESH,1,3) : SMILE_THRESH);
      } catch(e) {
        console.log('Smile baseline', smileBaseline, 'threshold set to', SMILE_THRESH);
      }
    }
  } catch (e) {
    console.error('calibrateSmile error:', e);
    // disable auto-calibration to avoid repeated errors
    SMILE_AUTOCALIB = false;
  }
}

// helper to draw the animated background (call from draw instead of image(bgImage,...))
/*function drawGifBackground() {
  const frames = gifImgs.filter(f => f);
  if (!frames.length) { background(0); return; }

  // frameDuration: prefer explicit hold ms if defined
  const frameDuration = (typeof GIF_FRAME_HOLD_MS !== 'undefined' && GIF_FRAME_HOLD_MS > 0)
    ? GIF_FRAME_HOLD_MS
    : (1000 / GIF_FPS);

  const t = millis();
  const totalIndex = floor(t / frameDuration);
  const idx = totalIndex % frames.length;

  if (!USE_CROSSFADE || frames.length === 1) {
    image(frames[idx], 0, 0, width, height);
  } else {
    const next = (idx + 1) % frames.length;
    const progress = (t % frameDuration) / frameDuration; // 0..1 across the hold period
    push();
    tint(255, 255 * (1 - progress));
    image(frames[idx], 0, 0, width, height);
    tint(255, 255 * progress);
    image(frames[next], 0, 0, width, height);
    pop();
    noTint();
  }
}*/

function drawGifBackground() {
  const frames = gifImgs.filter(f => f);
  if (!frames.length) {
    // draw fallback image centered at natural size (scale down if larger than canvas)
    if (bgFallbackImage) {
      const iw = bgFallbackImage.width;
      const ih = bgFallbackImage.height;
      const scale = min(1, min(width / iw, height / ih)); // only scale down
      const w = iw * scale;
      const h = ih * scale;
      const x = (width - w) / 2;
      const y = (height - h) / 2;
      background(0); // keep black behind the image edges
      image(bgFallbackImage, x, y, w, h);
    } else {
      background(0); // fallback if image not present
    }
    return;
  }

  // frameDuration: prefer explicit hold ms if defined
  const frameDuration = (typeof GIF_FRAME_HOLD_MS !== 'undefined' && GIF_FRAME_HOLD_MS > 0)
    ? GIF_FRAME_HOLD_MS
    : (1000 / GIF_FPS);

  const t = millis();
  const totalIndex = floor(t / frameDuration);
  const idx = totalIndex % frames.length;
  const next = (idx + 1) % frames.length;

  function computeDrawRect(img) {
    const iw = img.width;
    const ih = img.height;
    const scale = min(1, min(width / iw, height / ih));
    const w = iw * scale;
    const h = ih * scale;
    const x = (width - w) / 2;
    const y = (height - h) / 2;
    return { x, y, w, h };
  }

  if (!USE_CROSSFADE || frames.length === 1) {
    const r = computeDrawRect(frames[idx]);
    // draw fallback image behind the frame if available, otherwise black
    if (bgFallbackImage) {
      // draw fallback first (centered)
      const fb = computeDrawRect(bgFallbackImage);
      image(bgFallbackImage, fb.x, fb.y, fb.w, fb.h);
    } else {
      background(0);
    }
    image(frames[idx], r.x, r.y, r.w, r.h);
  } else {
    const progress = (t % frameDuration) / frameDuration; // 0..1 across the hold period
    const r1 = computeDrawRect(frames[idx]);
    const r2 = computeDrawRect(frames[next]);

    // draw fallback behind both frames
    if (bgFallbackImage) {
      const fb = computeDrawRect(bgFallbackImage);
      image(bgFallbackImage, fb.x, fb.y, fb.w, fb.h);
    } else {
      background(0);
    }

    // overlay crossfading frames
    push();
    tint(255, 255 * (1 - progress));
    image(frames[idx], r1.x, r1.y, r1.w, r1.h);
    tint(255, 255 * progress);
    image(frames[next], r2.x, r2.y, r2.w, r2.h);
    pop();
    noTint();
  }
}