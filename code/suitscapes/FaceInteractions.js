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

// show "Success" for a short time after a smile is detected
let showSuccessUntil = 0;

// stop GIF after success
let gifEnabled = true;

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
  showSuccessUntil = millis() + 1200;

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
