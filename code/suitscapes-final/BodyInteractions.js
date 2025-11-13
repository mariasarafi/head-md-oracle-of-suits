
// the blendshapes we are going to track
let leftEyeBlink = 0.0;
let rightEyeBlink = 0.0;
let jawOpen = 0.0;

// --- smile detection --- keep threshold around 0.50 - 0.65; if based on mouth-width fallback then 0.35-0.55
let SMILE_THRESH = 0.5;
let lastSmileScore = 0;
let isSmiling = false;
let SMILE_AUTOCALIB = true;
let smileBaseline = 0;
let calibFrames = 60;
let calibCount = 0;

// KISS DETECTION: scorer + updater + hook
let KISS_THRESH = 0.55;
let lastKissScore = 0;
let lastKissAt = 0;
let KISS_COOLDOWN_MS = 1000;
let kissBaseline = 0;

// ---------------------SADNESS DETECTION
let SADNESS_THRESH = 0.035; // tuned on normalized units (face-height). adjust as needed
let lastSadnessScore = 0;
let lastSadnessAt = 0;
let SADNESS_COOLDOWN_MS = 800;

// smoothing / hysteresis params
let smoothedSmileScore = 0;
let smoothedSadnessScore = 0;

// small cache / throttling for teeth detection
let _teethLastFrame = 0;
let _teethLastScore = 0;
const TEETH_CHECK_INTERVAL = 6; // check every N frames

const SMILE_ENTRY = 0.52;
const SMILE_EXIT  = 0.40;
const SADNESS_ENTRY = 0.28;
const SADNESS_EXIT  = 0.18;
const SCORE_SMOOTHING = 0.18; // lerp factor

// ANGER (teeth clenched but visible) detection
let smoothedAngerScore = 0;
const ANGER_ENTRY = 0.5;
const ANGER_EXIT = 0.36;

// show "Success" for a short time after a smile is detected
let showSuccessUntil = 0;

// Generic calibrator utility
const Calibrators = {}; // map kind -> { frames, count, sum, sampleFn, onComplete }

function startCalibration(kind, sampleFn, frames = 60, onComplete) {
  Calibrators[kind] = { frames, count: 0, sum: 0, sampleFn, onComplete };
}

function updateCalibration(kind) {
  const c = Calibrators[kind];
  if (!c) return null;
  try {
    const value = (typeof c.sampleFn === 'function') ? c.sampleFn() : 0;
    c.sum += value;
    c.count++;
    if (c.count >= c.frames) {
      const baseline = c.sum / c.count;
      delete Calibrators[kind];
      if (typeof c.onComplete === 'function') c.onComplete(baseline);
      return baseline;
    }
    return null;
  } catch (e) {
    delete Calibrators[kind];
    return null;
  }
}

function isCalibrating(kind) {
  return !!Calibrators[kind];
}

// ==================== MOUTH TRACKING ====================

/**
 * Draw mouth/lips landmarks in the CENTER of the canvas
 */
function drawMouthLandmarks() {
  const faces = getFaceLandmarks();
  
  if (!faces || faces.length === 0) {
    return;
  }
  
  // Get mouth/lips rings for proper outline
  const lipsRings = getFeatureRings('FACE_LANDMARKS_LIPS', 0, true);
  
  if (!lipsRings) {
    return;
  }
  
  // Calculate bounding box of original mouth position
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  for (const ring of lipsRings) {
    for (const pt of ring) {
      minX = min(minX, pt.x);
      minY = min(minY, pt.y);
      maxX = max(maxX, pt.x);
      maxY = max(maxY, pt.y);
    }
  }
  
  // Calculate original mouth center
  const originalCenterX = (minX + maxX) / 2;
  const originalCenterY = (minY + minY) / 2;
  
  // Target position: CENTER of the canvas
  const targetCenterX = width / 2;
  const targetCenterY = height / 2;
  
  // Calculate translation offset
  const offsetX = targetCenterX - originalCenterX;
  const offsetY = targetCenterY - originalCenterY;
  
  // Optional: Scale up the mouth for better visibility
  const scaleMultiplier = 2.0; // Make mouth 2x bigger
  
  push();
  
  // Draw semi-transparent background circle
  fill(0, 0, 0, 100);
  noStroke();
  circle(targetCenterX, targetCenterY, 200);
  
  // Draw connections (red lines)
  stroke(255, 0, 0, 255);
  strokeWeight(6);
  noFill();
  
  for (let i = 0; i < lipsRings.length; i++) {
    const ring = lipsRings[i];
    beginShape();
    for (const pt of ring) {
      // Translate to center and scale
      const scaledX = (pt.x - originalCenterX) * scaleMultiplier + targetCenterX;
      const scaledY = (pt.y - originalCenterY) * scaleMultiplier + targetCenterY;
      vertex(scaledX, scaledY);
    }
    endShape(CLOSE);
  }
  
  // Draw landmark points (green circles)
  noStroke();
  fill(0, 255, 0, 255);
  
  for (const ring of lipsRings) {
    for (const pt of ring) {
      // Translate to center and scale
      const scaledX = (pt.x - originalCenterX) * scaleMultiplier + targetCenterX;
      const scaledY = (pt.y - originalCenterY) * scaleMultiplier + targetCenterY;
      circle(scaledX, scaledY, 15);
    }
  }
  
  pop();
}

// helper: compute basic mouth metrics from landmarks (normalized by face height/width)
function _computeMouthMetrics() {
  try {
    const rings = (typeof getFeatureRings === 'function') ? getFeatureRings('FACE_LANDMARKS_LIPS') : null;
    const faces = (typeof getFaceLandmarks === 'function') ? getFaceLandmarks() : null;
    const facePts = (faces && faces[0]) ? faces[0] : null;
    if (!rings || !rings[0] || !rings[1] || !facePts) return null;

    const outer = rings[0];
    const inner = rings[1];

    // outer width
    let oMinX = Infinity, oMaxX = -Infinity;
    for (let p of outer) { oMinX = min(oMinX, p.x); oMaxX = max(oMaxX, p.x); }
    const outerW = oMaxX - oMinX;

    // inner height
    let iMinY = Infinity, iMaxY = -Infinity;
    for (let p of inner) { iMinY = min(iMinY, p.y); iMaxY = max(iMaxY, p.y); }
    const innerH = iMaxY - iMinY;

    // corners and mouth center Y
    let leftCorner = outer[0], rightCorner = outer[0];
    for (let p of outer) {
      if (p.x <= oMinX + 1e-6) leftCorner = p;
      if (p.x >= oMaxX - 1e-6) rightCorner = p;
    }
    let mMinY = Infinity, mMaxY = -Infinity;
    for (let p of outer) { mMinY = min(mMinY, p.y); mMaxY = max(mMaxY, p.y); }
    const mouthCenterY = (mMinY + mMaxY) / 2;

    // face bbox height/width
    let fMinY = Infinity, fMaxY = -Infinity, fMinX = Infinity, fMaxX = -Infinity;
    for (let p of facePts) {
      fMinY = min(fMinY, p.y); fMaxY = max(fMaxY, p.y);
      fMinX = min(fMinX, p.x); fMaxX = max(fMaxX, p.x);
    }
    const faceH = Math.max(1e-4, fMaxY - fMinY);
    const faceW = Math.max(1e-4, fMaxX - fMinX);

    const normOuterW = constrain(outerW / faceW, 0, 1);
    const leftCornerDy = leftCorner.y - mouthCenterY;
    const rightCornerDy = rightCorner.y - mouthCenterY;
    const cornerAvgDy = (leftCornerDy + rightCornerDy) / 2;
    const normCornerDy = cornerAvgDy / faceH; // positive => corners down, negative => corners up

    return {
      normOuterW,
      normInnerH: constrain(innerH / faceH, 0, 1),
      normCornerDy
    };
  } catch (e) {
    return null;
  }
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

function updateSmile() {
  let raw = 0;
  if (typeof getBlendshapeScore === 'function') {
    raw = getBlendshapeScore('mouthSmileLeft') || getBlendshapeScore('mouthSmileRight') || 0;
  }
  if (!raw || raw <= 0.01) {
    const m = _computeMouthMetrics();
    if (m) {
      const widthScore = constrain(map(m.normOuterW, 0.08, 0.32, 0, 1), 0, 1) * 0.25; // de-emphasize width
      const cornerUp = constrain(-m.normCornerDy * 6.0, 0, 1); // require corners above center
      const cornerDown = constrain(m.normCornerDy * 8.0, 0, 1); // penalize down
      raw = widthScore + cornerUp * 0.8 - cornerDown * 1.0;
      raw = constrain(raw, 0, 1);
    }
  }

  smoothedSmileScore = lerp(smoothedSmileScore || 0, raw, SCORE_SMOOTHING);

  if (!updateSmile._active && smoothedSmileScore > SMILE_ENTRY) {
    updateSmile._active = true;
    if (typeof onSmile === 'function') onSmile(smoothedSmileScore);
  } else if (updateSmile._active && smoothedSmileScore < SMILE_EXIT) {
    updateSmile._active = false;
  }
  return smoothedSmileScore;
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

// ------------------KISS----------------------------------
function getKissScore() {
  // prefer blendshapes
  if (typeof getBlendshapeScore === 'function') {
    const b = getBlendshapeScore('mouthKiss') || getBlendshapeScore('lipPucker') || getBlendshapeScore('mouthPucker') || 0;
    if (b && b > 0.01) return constrain(b, 0, 1);
  }

  // fallback: narrow outer-mouth width + small inner-mouth height
  try {
    const mouthRings = (typeof getFeatureRings === 'function') ? getFeatureRings('FACE_LANDMARKS_LIPS') : null;
    const faces = (typeof getFaceLandmarks === 'function') ? getFaceLandmarks() : null;
    const facePts = (faces && faces[0]) ? faces[0] : null;
    if (!mouthRings || !mouthRings[0] || !mouthRings[1] || !facePts) return 0;

    // outer width
    let oMinX = Infinity, oMaxX = -Infinity;
    for (let p of mouthRings[0]) { oMinX = min(oMinX, p.x); oMaxX = max(oMaxX, p.x); }
    const outerWidth = oMaxX - oMinX;

    // inner height
    let iMinY = Infinity, iMaxY = -Infinity;
    for (let p of mouthRings[1]) { iMinY = min(iMinY, p.y); iMaxY = max(iMaxY, p.y); }
    const innerHeight = iMaxY - iMinY;

    // face bbox
    let fMinX = Infinity, fMaxX = -Infinity, fMinY = Infinity, fMaxY = -Infinity;
    for (let p of facePts) {
      fMinX = min(fMinX, p.x); fMaxX = max(fMaxX, p.x);
      fMinY = min(fMinY, p.y); fMaxY = max(fMaxY, p.y);
    }
    const faceW = Math.max(0.0001, fMaxX - fMinX);
    const faceH = Math.max(0.0001, fMaxY - fMinY);

    const normOuterW = constrain(outerWidth / faceW, 0, 1); // smaller when puckered
    const normInnerH = constrain(innerHeight / faceH, 0, 1); // smaller when lips together

    const widthComp = 1 - normOuterW;
    const heightComp = 1 - normInnerH;

    return constrain(widthComp * 0.6 + heightComp * 0.4, 0, 1);
  } catch (e) {
    return 0;
  }
}

function updateKiss() {
  const score = getKissScore();
  const now = (typeof millis === 'function') ? millis() : Date.now();
  if (score > KISS_THRESH && lastKissScore <= KISS_THRESH && (now - lastKissAt) > KISS_COOLDOWN_MS) {
    lastKissAt = now;
    if (typeof onKiss === 'function') onKiss(score);
  }
  lastKissScore = score;
  return score;
}

function onKiss(score) {
  // placeholder: override in sketch.js if you want to react
}

// ---------------------SADNESS DETECTION
function getSadnessScore() {
  // Prefer blendshapes if available
  if (typeof getBlendshapeScore === 'function') {
    const left = getBlendshapeScore('mouthFrownLeft') || 0;
    const right = getBlendshapeScore('mouthFrownRight') || 0;
    const b = Math.max(left, right);
    if (b && b > 0.01) return constrain(b, 0, 1);
  }

  // Fallback: compute corner-down displacement relative to mouth center normalized by face height
  try {
    const mouthRings = (typeof getFeatureRings === 'function') ? getFeatureRings('FACE_LANDMARKS_LIPS') : null;
    const faces = (typeof getFaceLandmarks === 'function') ? getFaceLandmarks() : null;
    const facePts = (faces && faces[0]) ? faces[0] : null;
    if (!mouthRings || !mouthRings[0] || !facePts) return 0;

    const outer = mouthRings[0];
    // find leftmost and rightmost points as corners
    let minX = Infinity, maxX = -Infinity;
    let leftPt = null, rightPt = null;
    for (let p of outer) {
      if (p.x < minX) { minX = p.x; leftPt = p; }
      if (p.x > maxX) { maxX = p.x; rightPt = p; }
    }

    // mouth center Y (use bbox center)
    let mMinY = Infinity, mMaxY = -Infinity;
    for (let p of outer) { mMinY = min(mMinY, p.y); mMaxY = max(mMaxY, p.y); }
    const mouthCenterY = (mMinY + mMaxY) / 2;

    // face height for normalization
    let fMinY = Infinity, fMaxY = -Infinity;
    for (let p of facePts) { fMinY = min(fMinY, p.y); fMaxY = max(fMaxY, p.y); }
    const faceH = Math.max(0.0001, fMaxY - fMinY);

    // average corner downward offset (positive when corners are lower than center; p.y increases downward)
    const cornerAvgY = ((leftPt ? leftPt.y : 0) + (rightPt ? rightPt.y : 0)) / 2;
    const cornerDown = cornerAvgY - mouthCenterY;

    // normalized score (clamp reasonable range)
    const norm = constrain(cornerDown / faceH, 0, 0.12); // 0..0.12 is typical; adjust
    // map to 0..1 with a soft thresholding
    const score = constrain(map(norm, 0.01, 0.08, 0, 1), 0, 1);
    lastSadnessScore = score;
    return score;
  } catch (e) {
    return 0;
  }
}

function updateSadness() {
  let raw = 0;
  if (typeof getBlendshapeScore === 'function') {
    raw = getBlendshapeScore('mouthFrownLeft') || getBlendshapeScore('mouthFrownRight') || 0;
  }
  if (!raw || raw <= 0.01) {
    const m = _computeMouthMetrics();
    if (m) {
      const cornerDown = constrain(m.normCornerDy * 8.0, 0, 1);
      const widthPenalty = 1 - constrain(map(m.normOuterW, 0.08, 0.32, 0, 1), 0, 1); // sadness often not wide
      raw = cornerDown * 0.75 + widthPenalty * 0.25;
      raw = constrain(raw, 0, 1);
    }
  }

  smoothedSadnessScore = lerp(smoothedSadnessScore || 0, raw, SCORE_SMOOTHING);

  if (!updateSadness._active && smoothedSadnessScore > SADNESS_ENTRY) {
    updateSadness._active = true;
    if (typeof onSadness === 'function') onSadness(smoothedSadnessScore);
  } else if (updateSadness._active && smoothedSadnessScore < SADNESS_EXIT) {
    updateSadness._active = false;
  }
  return smoothedSadnessScore;
}



function onSadness(score) {
  // placeholder — override in sketch.js if you want to react to sadness events
}


// ---------------------ANGER DETECTION-----------------------------

// estimate teeth visibility by sampling video pixels inside inner-mouth polygon
function getTeethVisibilityScore(sampleScale = 0.18, brightThresh = 200, satThresh = 60) {
  try {
    const frameIndex = (typeof millis === 'function') ? Math.floor(millis() / (1000 / 60)) : 0;
    if (frameIndex - _teethLastFrame < TEETH_CHECK_INTERVAL && _teethLastScore !== undefined) {
      return _teethLastScore;
    }
    _teethLastFrame = frameIndex;

    const rings = (typeof getFeatureRings === 'function') ? getFeatureRings('FACE_LANDMARKS_LIPS') : null;
    if (!rings || !rings[1] || rings[1].length === 0) { _teethLastScore = 0; return 0; }
    const inner = rings[1];

    // find video element
    const vid = window.videoElement || document.querySelector('video');
    if (!vid || vid.readyState < 2 || !vid.videoWidth) { _teethLastScore = 0; return 0; }

    // compute pixel bbox of inner mouth
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const pts = inner.map(p => {
      const x = (p.x <= 1 ? p.x * vid.videoWidth : p.x);
      const y = (p.y <= 1 ? p.y * vid.videoHeight : p.y);
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      return { x, y };
    });

    minX = Math.max(0, Math.floor(minX));
    minY = Math.max(0, Math.floor(minY));
    maxX = Math.min(vid.videoWidth - 1, Math.ceil(maxX));
    maxY = Math.min(vid.videoHeight - 1, Math.ceil(maxY));
    if (maxX <= minX || maxY <= minY) { _teethLastScore = 0; return 0; }

    const sw = Math.max(8, Math.floor((maxX - minX) * sampleScale));
    const sh = Math.max(8, Math.floor((maxY - minY) * sampleScale));

    const c = document.createElement('canvas');
    c.width = sw; c.height = sh;
    const ctx = c.getContext('2d');
    ctx.drawImage(vid, minX, minY, maxX - minX, maxY - minY, 0, 0, sw, sh);
    const img = ctx.getImageData(0, 0, sw, sh).data;

    // polygon scaled
    const poly = pts.map(p => ({ x: (p.x - minX) * (sw / (maxX - minX)), y: (p.y - minY) * (sh / (maxY - minY)) }));

    function pointInPoly(x, y, poly) {
      let inside = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
        const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi + 1e-9) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    }

    let whiteCount = 0, sampleCount = 0;
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        if (!pointInPoly(x + 0.5, y + 0.5, poly)) continue;
        const idx = (y * sw + x) * 4;
        const r = img[idx], g = img[idx + 1], b = img[idx + 2];
        const bright = (r + g + b) / 3;
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        const sat = mx - mn;
        sampleCount++;
        if (bright >= brightThresh && sat <= satThresh) whiteCount++;
      }
    }

    _teethLastScore = (sampleCount === 0) ? 0 : constrain(whiteCount / sampleCount, 0, 1);
    return _teethLastScore;
  } catch (e) {
    _teethLastScore = 0;
    return 0;
  }
}

function getAngerScore() {
  // prefer blendshapes if they strongly indicate clench
  if (typeof getBlendshapeScore === 'function') {
    const b = getBlendshapeScore('jawClench') || getBlendshapeScore('mouthPress') || 0;
    if (b && b > 0.45) return constrain(b, 0, 1);
  }

  const m = _computeMouthMetrics();
  if (!m) return 0;

  // teeth visibility (throttled)
  const teeth = getTeethVisibilityScore();

  // require teeth visible reasonably and lips tight
  const innerTight = constrain(1 - m.normInnerH, 0, 1);
  const cornerDown = constrain(m.normCornerDy * 6.0, 0, 1);

  // teeth must be present to form a strong anger signal (clenched but visible)
  const raw = constrain(teeth * 0.7 + cornerDown * 0.2 + innerTight * 0.1, 0, 1);
  return raw;
}

function updateAnger() {
  const raw = getAngerScore();
  smoothedAngerScore = lerp(smoothedAngerScore || 0, raw, SCORE_SMOOTHING);

  if (!updateAnger._active && smoothedAngerScore > ANGER_ENTRY) {
    updateAnger._active = true;
    if (typeof onAnger === 'function') onAnger(smoothedAngerScore);
  } else if (updateAnger._active && smoothedAngerScore < ANGER_EXIT) {
    updateAnger._active = false;
  }
  return smoothedAngerScore;
}


function onAnger(score) {
  // override in sketch.js to react to anger if needed
}
//------------------------ DRAW FACE -------------------------------------------------
// 
/**
 * Draw mouth/lips landmarks in the CENTER of the canvas
 */
function drawMouthLandmarks() {
  const faces = getFaceLandmarks();
  
  if (!faces || faces.length === 0) {
    return;
  }
  
  // Get mouth/lips rings for proper outline
  const lipsRings = getFeatureRings('FACE_LANDMARKS_LIPS', 0, true);
  
  if (!lipsRings) {
    return;
  }
  
  // Calculate bounding box of original mouth position
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  for (const ring of lipsRings) {
    for (const pt of ring) {
      minX = min(minX, pt.x);
      minY = min(minY, pt.y);
      maxX = max(maxX, pt.x);
      maxY = max(maxY, pt.y);
    }
  }
  
  // Calculate original mouth center
  const originalCenterX = (minX + maxX) / 2;
  const originalCenterY = (minY + minY) / 2;
  
  // Target position: CENTER of the canvas
  const targetCenterX = width / 2;
  const targetCenterY = height / 2;
  
  // Calculate translation offset
  const offsetX = targetCenterX - originalCenterX;
  const offsetY = targetCenterY - originalCenterY;
  
  // Optional: Scale up the mouth for better visibility
  const scaleMultiplier = 2.0; // Make mouth 2x bigger
  
  push();
  
  // Draw semi-transparent background circle
  fill(0, 0, 0, 100);
  noStroke();
  circle(targetCenterX, targetCenterY, 200);
  
  // Draw connections (red lines)
  stroke(255, 0, 0, 255);
  strokeWeight(6);
  noFill();
  
  for (let i = 0; i < lipsRings.length; i++) {
    const ring = lipsRings[i];
    beginShape();
    for (const pt of ring) {
      // Translate to center and scale
      const scaledX = (pt.x - originalCenterX) * scaleMultiplier + targetCenterX;
      const scaledY = (pt.y - originalCenterY) * scaleMultiplier + targetCenterY;
      vertex(scaledX, scaledY);
    }
    endShape(CLOSE);
  }
  
  // Draw landmark points (green circles)
  noStroke();
  fill(0, 255, 0, 255);
  
  for (const ring of lipsRings) {
    for (const pt of ring) {
      // Translate to center and scale
      const scaledX = (pt.x - originalCenterX) * scaleMultiplier + targetCenterX;
      const scaledY = (pt.y - originalCenterY) * scaleMultiplier + targetCenterY;
      circle(scaledX, scaledY, 15);
    }
  }
  
  pop();
}

// ==================== HAND WAVE DETECTION ====================

/**
 * Improved hand wave detection with pattern recognition
 * Requires actual waving motion (left-right-left pattern)
 * @returns {boolean} True if wave gesture detected
 */
function detectHandWaveGesture() {
  if (!detections || !detections.multiHandLandmarks || detections.multiHandLandmarks.length === 0) {
    handWaveHistory = [];
    return false;
  }

  // Only check FIRST hand to avoid double-triggering
  const hand = detections.multiHandLandmarks[0];
  const indexTip = hand[8];
  const wrist = hand[0];
  
  // 1. Hand must be raised (index finger above wrist)
  const isHandRaised = indexTip.y < wrist.y - 0.05;
  
  // 2. Check if hand is open (fingers extended)
  const handIsOpen = isHandOpen(hand);
  
  if (!isHandRaised || !handIsOpen) {
    handWaveHistory = [];
    return false;
  }
  
  // 3. Track horizontal position over time
  const now = millis();
  handWaveHistory.push({ x: indexTip.x, time: now });
  
  // Keep only last 15 frames (~0.5 seconds at 30fps)
  if (handWaveHistory.length > 15) {
    handWaveHistory.shift();
  }
  
  // 4. Need enough history to detect a pattern
  if (handWaveHistory.length < 10) {
    return false;
  }
  
  // 5. Detect left-right-left OR right-left-right motion
  let directionChanges = 0;
  let lastDirection = 0;
  let totalMovement = 0;
  
  for (let i = 1; i < handWaveHistory.length; i++) {
    const movement = handWaveHistory[i].x - handWaveHistory[i - 1].x;
    totalMovement += Math.abs(movement);
    
    // Ignore tiny movements
    if (Math.abs(movement) < 0.015) continue;
    
    const currentDirection = movement > 0 ? 1 : -1;
    
    if (lastDirection !== 0 && currentDirection !== lastDirection) {
      directionChanges++;
    }
    lastDirection = currentDirection;
  }
  
  // 6. Wave detected: at least 2 direction changes + cooldown + significant movement
  const cooldownPeriod = 3000; // 3 seconds between waves
  const hasSignificantMovement = totalMovement > 0.2;
  
  if (directionChanges >= 2 && hasSignificantMovement && now - lastHandWaveDetectionTime > cooldownPeriod) {
    console.log('👋 WAVE DETECTED! Direction changes:', directionChanges, 'Total movement:', totalMovement.toFixed(3));
    lastHandWaveDetectionTime = now;
    handWaveHistory = [];
    return true;
  }
  
  return false;
}

/**
 * Check if hand is open (all fingers extended)
 * @param {Array} landmarks - Hand landmarks array
 * @returns {boolean} True if hand is open
 */
function isHandOpen(landmarks) {
  const fingerTips = [4, 8, 12, 16, 20];
  const fingerBases = [2, 6, 10, 14, 18];
  
  let extendedFingers = 0;
  
  // Check fingers (not thumb)
  for (let i = 1; i < fingerTips.length; i++) {
    const tip = landmarks[fingerTips[i]];
    const base = landmarks[fingerBases[i]];
    
    if (tip.y < base.y) {
      extendedFingers++;
    }
  }
  
  // Check thumb separately (horizontal movement)
  const thumbTip = landmarks[4];
  const thumbBase = landmarks[2];
  if (Math.abs(thumbTip.x - thumbBase.x) > 0.05) {
    extendedFingers++;
  }
  
  return extendedFingers >= 4;
}

/**
 * Draw hand landmarks on canvas
 */
function drawHandLandmarks() {
  if (!detections || !detections.multiHandLandmarks) return;
  
  push();
  
  for (let hand of detections.multiHandLandmarks) {
    // Draw connections
    stroke(0, 255, 0);
    strokeWeight(2);
    for (let connection of HAND_CONNECTIONS) {
      const start = hand[connection[0]];
      const end = hand[connection[1]];
      
      const x1 = start.x * width;
      const y1 = start.y * height;
      const x2 = end.x * width;
      const y2 = end.y * height;
      
      line(x1, y1, x2, y2);
    }
    
    // Draw landmark points
    for (let i = 0; i < hand.length; i++) {
      const landmark = hand[i];
      const x = landmark.x * width;
      const y = landmark.y * height;
      
      const isTip = Object.values(FINGER_TIPS).includes(i);
      
      fill(isTip ? color(255, 0, 0) : color(0, 255, 0));
      noStroke();
      circle(x, y, isTip ? 12 : 8);
    }
  }
  
  pop();
}