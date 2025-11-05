
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

// --- blow detection ---
let BLOW_THRESH = 0.18;         // tune 0..1
let lastBlowScore = 0;
let lastBlowAt = 0;
let BLOW_COOLDOWN_MS = 1000;   // prevent rapid repeated triggers
let blowMouthBaseline = 0;     // normalized mouth width baseline collected during calibration

// show "Success" for a short time after a smile is detected
let showSuccessUntil = 0;

// stop GIF after success
let gifEnabled = true;

// interaction mode: 'smile' or 'blow' (default 'smile')
let interactionMode = 'smile';
function setInteractionMode(mode) {
  if (mode === 'smile' || mode === 'blow') {
    interactionMode = mode;
    console.log('Interaction mode set to', interactionMode);
  } else {
    console.warn('Unknown interaction mode:', mode);
  }
}

// helper: call the active interaction update (smile or blow)
function updateInteraction() {
  if (interactionMode === 'blow') return updateBlow();
  return updateSmile();
}

//------------------------ SMILE DETECTION -------------------------------------------------
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
  //showSuccessUntil = millis() + 1200;

  gifEnabled = false;

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

//------------------------ BLOW DETECTION ----------------------------------------------

// compute normalized mouth width (mouthWidth / faceWidth) from landmarks
function getMouthWidthNormalized() {
  try {
    if (typeof getFeatureRings === 'function') {
      const mouthRings = getFeatureRings('FACE_LANDMARKS_LIPS');
      const faces = getFaceLandmarks ? getFaceLandmarks() : null;
      let facePts = (faces && faces[0]) ? faces[0] : null;

      // compute mouth width from ring if available
      if (mouthRings && mouthRings[0] && mouthRings[0].length && facePts) {
        let minX = Infinity, maxX = -Infinity;
        for (let p of mouthRings[0]) { minX = min(minX, p.x); maxX = max(maxX, p.x); }
        const mouthW = maxX - minX;
        // face width from facePts bounding box
        let fMinX = Infinity, fMaxX = -Infinity;
        for (let p of facePts) { fMinX = min(fMinX, p.x); fMaxX = max(fMaxX, p.x); }
        const faceW = fMaxX - fMinX;
        if (faceW > 0) return constrain(mouthW / faceW, 0, 1);
      }
    }

    // fallback: try to compute from getFaceLandmarks bounding boxes if available
    if (typeof getFaceLandmarks === 'function') {
      const faces = getFaceLandmarks();
      if (!faces || !faces[0] || !faces[0].length) return 0;
      const pts = faces[0];
      let minX = Infinity, maxX = -Infinity;
      // attempt to pick mouth-area points by y position median heuristic
      let ys = pts.map(p => p.y).sort((a,b)=>a-b);
      const midY = ys[Math.floor(ys.length*0.6)]; // rough mouth vertical region
      for (let p of pts) {
        if (p.y > midY - 20 && p.y < midY + 40) {
          minX = min(minX, p.x);
          maxX = max(maxX, p.x);
        }
      }
      // if mouth region not found, fallback to whole-face bbox
      if (!isFinite(minX) || !isFinite(maxX)) {
        minX = Infinity; maxX = -Infinity;
        for (let p of pts) { minX = min(minX, p.x); maxX = max(maxX, p.x); }
      }
      const mouthW = (maxX - minX);
      let fMinX = Infinity, fMaxX = -Infinity;
      for (let p of pts) { fMinX = min(fMinX, p.x); fMaxX = max(fMaxX, p.x); }
      const faceW = fMaxX - fMinX;
      if (faceW > 0) return constrain(mouthW / faceW, 0, 1);
    }
  } catch (e) {
    // silent fallback
  }
  return 0;
}

// returns 0..1 blow score (prefer blendshape values, fallback to mouth-width change relative to baseline)
function getBlowScore() {
  let score = 0;
  // prefer explicit blendshapes if available
  if (typeof getBlendshapeScore === 'function') {
    score = getBlendshapeScore('mouthPucker') || getBlendshapeScore('cheekPuff') || 0;
  }

  // fallback: use normalized mouth width reduction relative to baseline
  if (!score || score <= 0.01) {
    const mw = getMouthWidthNormalized();
    if (blowMouthBaseline > 0 && mw >= 0) {
      const diff = (blowMouthBaseline - mw) / blowMouthBaseline;
      score = constrain(diff, 0, 1);
    } else {
      score = 0;
    }
  }

  return score;
}

// call each frame to update blow state (rising edge detection)
function updateBlow() {
  const score = getBlowScore();
  const now = millis();
  if (score > BLOW_THRESH && lastBlowScore <= BLOW_THRESH && (now - lastBlowAt) > BLOW_COOLDOWN_MS) {
    lastBlowAt = now;
    onBlow(score);
  }
  lastBlowScore = score;
  return score;
}

// hook called when blow is detected
function onBlow(score) {
  console.log('Blow detected, score:', score);
  if (typeof playBeep === 'function') {
    playBeep(520, 0.18, 'sine');
  }
  // default: do not change gifEnabled; customize here if needed
}

//------------------------ DRAW FACE -------------------------------------------------
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