
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

// ==================== SMILE ====================
function detectSmile() {
  let score = 0;
  // Prefer blendshape values if available
  score = Math.max(
    getBlendshapeScore('mouthSmileLeft'),
    getBlendshapeScore('mouthSmileRight')
  );

  // Fallback: estimate from mouth geometry if blendshapes are not available
  if (!score || score <= 0.01) {
    const faces = getFaceLandmarks && getFaceLandmarks();
    if (faces && faces.length > 0) {
      const face = faces[0];
      if (face && face[61] && face[291]) {
        const left = face[61];
        const right = face[291];
        const mouthWidth = Math.abs(right.x - left.x) * width;
        score = constrain(map(mouthWidth, 20, width * 0.35, 0, 1), 0, 1);
      }
    }
  }

  // Smooth the intensity for natural transitions
  smoothedSmileIntensity = lerp(smoothedSmileIntensity, score, 0.2);
  isSmiling = smoothedSmileIntensity > 0.2; // Lower threshold for blendshapes

  return {
    isSmiling,
    intensity: smoothedSmileIntensity
  };
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

// ==================== PREVIOUS CODE ====================

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