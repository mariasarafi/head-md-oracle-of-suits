// Add these constants (place near the top, after other globals)
const FINGER_TIPS = { thumb: 4, index: 8, middle: 12, ring: 16, pinky: 20 };
const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20],
  [0,17]
];

// the blendshapes we are going to track
let leftEyeBlink = 0.0;
let rightEyeBlink = 0.0;
let jawOpen = 0.0;

function setup() {
  // full window canvas
  createCanvas(windowWidth, windowHeight);
  // initialize MediaPipe
  setupFace();
  setupVideo();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {

  // clear the canvas
  background(128);

  if (isVideoReady()) {
    // show video frame
    image(videoElement, 0, 0);
  }

  // get detected faces
  let faces = getFaceLandmarks();

  // see blendshapes.txt for full list of possible blendshapes
  leftEyeBlink = getBlendshapeScore('eyeBlinkLeft');
  rightEyeBlink = getBlendshapeScore('eyeBlinkRight');
  jawOpen = getBlendshapeScore('jawOpen');

  // if we have at least one face
  if (faces && faces.length > 0) {
    // draw eyes and mouth for the first face
    drawEyes(faces[0]);
    drawMouth(faces[0]);
  }

  // use thicker lines for drawing hand connections
  strokeWeight(2);

  // draw blendshape values
  drawBlendshapeScores();

  // make sure we have detections to draw
  if (detections && detections.multiHandLandmarks && detections.multiHandLandmarks.length) {
    for (let hand of detections.multiHandLandmarks) {
      if (!hand) continue;
      // defensive: only call helpers when landmarks exist
      if (typeof drawIndex === 'function') drawIndex(hand);
      if (typeof drawThumb === 'function') drawThumb(hand);
      if (typeof drawTips === 'function') drawTips(hand);
      if (typeof drawConnections === 'function') drawConnections(hand);
      if (typeof drawLandmarks === 'function') drawLandmarks(hand);
    } // end of hands loop
  } // end of if detections

}

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

// Safer hand drawing helpers (replace your current functions)
function _videoSizeFallback() {
  const vw = (videoElement && (videoElement.videoWidth || videoElement.width)) || width;
  const vh = (videoElement && (videoElement.videoHeight || videoElement.height)) || height;
  return { vw, vh };
}

// only the index finger tip landmark
function drawIndex(landmarks) {
  if (!landmarks || !landmarks[FINGER_TIPS.index]) return;
  const mark = landmarks[FINGER_TIPS.index];
  noStroke();
  fill(0, 255, 255);

  const vw = (videoElement && (videoElement.videoWidth || videoElement.width)) || width;
  const vh = (videoElement && (videoElement.videoHeight || videoElement.height)) || height;
  const x = mark.x * vw;
  const y = mark.y * vh;
  circle(x, y, 20);
}

// draw the thumb finger tip landmark
function drawThumb(landmarks) {
  if (!landmarks || !landmarks[FINGER_TIPS.thumb]) return;
  const mark = landmarks[FINGER_TIPS.thumb];
  noStroke();
  fill(255, 255, 0);

  const vw = (videoElement && (videoElement.videoWidth || videoElement.width)) || width;
  const vh = (videoElement && (videoElement.videoHeight || videoElement.height)) || height;
  const x = mark.x * vw;
  const y = mark.y * vh;
  circle(x, y, 20);
}

function drawConnections(landmarks) {
  if (!landmarks) return;
  stroke(0, 255, 0);
  strokeWeight(2);

  const vw = (videoElement && (videoElement.videoWidth || videoElement.width)) || width;
  const vh = (videoElement && (videoElement.videoHeight || videoElement.height)) || height;

  for (let connection of HAND_CONNECTIONS) {
    const a = landmarks[connection[0]];
    const b = landmarks[connection[1]];
    if (!a || !b) continue;
    const ax = a.x * vw;
    const ay = a.y * vh;
    const bx = b.x * vw;
    const by = b.y * vh;
    line(ax, ay, bx, by);
  }
}