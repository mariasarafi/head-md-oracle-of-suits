
const PALETTE_RGB = [
  [0, 255, 255],   // neon cyan
  [255, 0, 255],   // neon magenta / fuchsia
  [0, 255, 0],     // neon green
  [255, 255, 0],   // neon yellow
  [0, 180, 255],   // electric blue
  [255, 50, 180]   // neon pink
];

// add explosion/particle support (place after bubbles globals)
let explosions = [];
const MAX_EXPLOSION_PARTS = 400;
let lastLeftBlinkTime = 0;
let lastRightBlinkTime = 0;
const BLINK_THRESHOLD = 0.65;
const BLINK_COOLDOWN = 500; // ms

const MAX_BUBBLES = 40;
const BUBBLE_COOLDOWN = 600; // ms between mouth-triggered bursts
let lastBubbleTime = 0;
let lastJawOpen = 0;
let bubbles = [];

class Bubble {
  constructor(x, y, r) {
    this.x = x;
    this.y = y;
    this.r = r;
    const ang = random(TWO_PI);
    const sp = random(0.2, 1.0);
    this.vx = cos(ang) * sp;
    this.vy = sin(ang) * sp * 0.6;

    const p1 = PALETTE_RGB[floor(random(PALETTE_RGB.length))];
    const p2 = PALETTE_RGB[floor(random(PALETTE_RGB.length))];
    const c1 = color(p1[0], p1[1], p1[2]);
    const c2 = color(p2[0], p2[1], p2[2]);

    this.bodyColor = lerpColor(c1, c2, random());
    this.bodyColor.setAlpha(80);      // stronger neon glow
    this.outlineColor = lerpColor(c1, c2, random());
    this.outlineColor.setAlpha(255);  // vivid outline
    this.highlightColor = lerpColor(this.bodyColor, color(255,255,255), 0.6);
    this.highlightColor.setAlpha(160); // bright highlight
  }

  update() {
    // gentle buoyant rise + slight noise
    this.vy -= 0.002; // slight upward acceleration
    this.vx += random(-0.01, 0.01);
    this.vy += random(-0.01, 0.01);
    this.x += this.vx;
    this.y += this.vy;

    // keep bubbles fully inside canvas with soft bounce/damping
    if (this.x - this.r < 0) {
      this.x = this.r;
      this.vx = Math.abs(this.vx) * 0.6;
    }
    if (this.x + this.r > width) {
      this.x = width - this.r;
      this.vx = -Math.abs(this.vx) * 0.6;
    }
    if (this.y - this.r < 0) {
      this.y = this.r;
      this.vy = Math.abs(this.vy) * 0.6;
    }
    if (this.y + this.r > height) {
      this.y = height - this.r;
      this.vy = -Math.abs(this.vy) * 0.6;
    }
  }

  draw() {
    push();
    noStroke();
    fill(this.bodyColor);
    ellipse(this.x, this.y, this.r * 2, this.r * 2);
    stroke(this.outlineColor);
    strokeWeight(2);
    noFill();
    ellipse(this.x, this.y, this.r * 2, this.r * 2);
    noStroke();
    fill(this.highlightColor);
    ellipse(this.x - this.r * 0.35, this.y - this.r * 0.45, this.r * 0.4, this.r * 0.25);
    pop();
  }
}

class ExplosionParticle {
  constructor(x, y, col) {
    this.x = x;
    this.y = y;
    const ang = random(TWO_PI);
    const sp = random(1, 6);
    this.vx = cos(ang) * sp;
    this.vy = sin(ang) * sp;
    this.life = random(500, 1200); // ms
    this.birth = millis();
    this.col = col || color(255, 200);
    this.r = random(4, 12);
  }
  update() {
    // simple motion + drag + gravity
    this.vx *= 0.99;
    this.vy += 0.03; // gravity
    this.x += this.vx;
    this.y += this.vy;
  }
  draw() {
    const age = millis() - this.birth;
    const t = constrain(1 - age / this.life, 0, 1);
    push();
    noStroke();
    const c = color(red(this.col), green(this.col), blue(this.col), 255 * t);
    fill(c);
    ellipse(this.x, this.y, this.r * t, this.r * t);
    pop();
  }
  isDead() {
    return (millis() - this.birth) > this.life;
  }
}

// --- STARS (spawn on smile) ---
let stars = [];
const STAR_COUNT_ON_SMILE = 30;
const STAR_SPAWN_COOLDOWN = 1000; // ms
let lastStarSpawn = 0;

class Star {
  constructor(x, y, col, size, vx, vy) {
    this.x = x; this.y = y;
    this.col = col;
    this.size = size || random(4,10);
    this.vx = vx !== undefined ? vx : random(-3,3);
    this.vy = vy !== undefined ? vy : random(-3,3);
    this.birth = millis();
  }
  update() {
    // simple motion, slight drag
    this.vx *= 0.995;
    this.vy *= 0.995;
    this.x += this.vx;
    this.y += this.vy;
    // optional gentle gravity
    this.vy += 0.01;
  }
  draw() {
    push();
    noStroke();
    fill(this.col);
    // draw star as small cross for a stylized star
    translate(this.x, this.y);
    ellipse(0, 0, this.size, this.size*0.4);
    rotate(PI/4);
    ellipse(0, 0, this.size, this.size*0.4);
    pop();
  }
}

function updateAndDrawBubbles() {
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i];
    b.update();
    b.draw();
    // remove only if extremely small
    if (b.r <= 0.5) bubbles.splice(i, 1);
  }
}

function spawnExplosionAt(x, y, paletteColor, strength = 1) {
  // limit total particles
  const total = explosions.length;
  if (total > MAX_EXPLOSION_PARTS) return;
  const parts = floor(map(strength, 0.2, 1.0, 8, 28));
  for (let i = 0; i < parts; i++) {
    const pcol = paletteColor || color(
      PALETTE_RGB[floor(random(PALETTE_RGB.length))][0],
      PALETTE_RGB[floor(random(PALETTE_RGB.length))][1],
      PALETTE_RGB[floor(random(PALETTE_RGB.length))][2]
    );
    explosions.push(new ExplosionParticle(x + random(-6,6), y + random(-6,6), pcol));
    if (explosions.length > MAX_EXPLOSION_PARTS) break;
  }
}

// spawn explosions for all bubbles on a side ("left" or "right")
function explodeBubblesOnSide(side) {
  const now = millis();
  if (side === 'left' && (now - lastLeftBlinkTime) < BLINK_COOLDOWN) return;
  if (side === 'right' && (now - lastRightBlinkTime) < BLINK_COOLDOWN) return;

  // collect indexes to remove, and spawn explosions at each bubble pos
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i];
    const onLeft = b.x < width / 2;
    const onRight = b.x >= width / 2;
    if ((side === 'left' && onLeft) || (side === 'right' && onRight)) {
      // pick palette color based on bubble outlineColor if available
      const pcol = b.outlineColor || color(
        PALETTE_RGB[floor(random(PALETTE_RGB.length))][0],
        PALETTE_RGB[floor(random(PALETTE_RGB.length))][1],
        PALETTE_RGB[floor(random(PALETTE_RGB.length))][2]
      );
      spawnExplosionAt(b.x, b.y, pcol, constrain(b.r / 60, 0.2, 1.0));
      // remove the bubble
      bubbles.splice(i, 1);
    }
  }

  if (side === 'left') lastLeftBlinkTime = now;
  else lastRightBlinkTime = now;
}

function updateAndDrawExplosions() {
  for (let i = explosions.length - 1; i >= 0; i--) {
    const p = explosions[i];
    p.update();
    p.draw();
    if (p.isDead()) explosions.splice(i, 1);
  }
}

// spawn STAR_COUNT_ON_SMILE stars at cx,cy going roughly in four directions
function spawnStarsAt(cx, cy) {
  const now = millis();
  if (now - lastStarSpawn < STAR_SPAWN_COOLDOWN) return;
  lastStarSpawn = now;

  for (let i = 0; i < STAR_COUNT_ON_SMILE; i++) {
    if (stars.length > 300) break; // safety cap

    // choose color from palette
    const p = PALETTE_RGB[floor(random(PALETTE_RGB.length))];
    const col = color(p[0], p[1], p[2], 220);

    // decide quadrant: divide into 4 groups to enforce four-direction spread
    const group = i % 4;
    let ang;
    if (group === 0) ang = random(-PI/6, PI/6);         // right
    else if (group === 1) ang = random(PI/2 - PI/6, PI/2 + PI/6); // down
    else if (group === 2) ang = random(PI - PI/6, PI + PI/6);     // left
    else ang = random(-PI/2 - PI/6, -PI/2 + PI/6);      // up

    const speed = random(2.5, 5.5);
    const vx = cos(ang) * speed;
    const vy = sin(ang) * speed;
    const sz = random(4, 10);
    stars.push(new Star(cx + random(-12,12), cy + random(-12,12), col, sz, vx, vy));
  }
}

// explode stars on a given side ('left' | 'right') — spawn explosion particles and remove stars
function explodeStarsOnSide(side) {
  for (let i = stars.length - 1; i >= 0; i--) {
    const s = stars[i];
    const onLeft = s.x < width / 2;
    const onRight = s.x >= width / 2;
    if ((side === 'left' && onLeft) || (side === 'right' && onRight)) {
      // spawn an explosion at star position (reuse spawnExplosionAt)
      spawnExplosionAt(s.x, s.y, s.col, 1.0);
      stars.splice(i, 1);
    }
  }
}

// update & draw stars
function updateAndDrawStars() {
  for (let i = stars.length - 1; i >= 0; i--) {
    const s = stars[i];
    s.update();
    s.draw();
    if (s.x < -200 || s.x > width + 200 || s.y < -200 || s.y > height + 200) stars.splice(i, 1);
  }
}

// --- SMILE DETECTION & SPAWN (try blendshapes, fallback to mouth width heuristic) ---
// ...existing code...

// robust smile check + debug logging + spawn
let SMILE_THRESH = 0.55;
let SMILE_DEBUG = false; // set true to print values to console

function checkSmileAndSpawnStars() {
  // get blendshape scores if available
  let leftSmile = 0, rightSmile = 0;
  if (typeof getBlendshapeScore === 'function') {
    // try common names, adapt if your helper uses different keys
    leftSmile = getBlendshapeScore('mouthSmileLeft') || getBlendshapeScore('smileLeft') || 0;
    rightSmile = getBlendshapeScore('mouthSmileRight') || getBlendshapeScore('smileRight') || 0;
  }

  // primary score (max of the two)
  let smileScore = max(leftSmile, rightSmile);

  // fallback: estimate from mouth outer ring width mapped to 0..1
  if (!smileScore || smileScore <= 0.01) {
    let mouth = null;
    try { mouth = getFeatureRings('FACE_LANDMARKS_LIPS'); } catch (e) { mouth = null; }
    if (mouth && mouth[0] && mouth[0].length) {
      const ring = mouth[0];
      let minX = Infinity, maxX = -Infinity;
      for (let p of ring) { minX = min(minX, p.x); maxX = max(maxX, p.x); }
      const mouthWidthPx = maxX - minX;
      // normalize by canvas width (adjust min/max to your camera/face size)
      smileScore = constrain(map(mouthWidthPx, 30, width * 0.35, 0, 1), 0, 1);
      if (SMILE_DEBUG) console.log('mouthWidthPx', mouthWidthPx, 'smileScore(fallback)', smileScore);
    }
  }

  if (SMILE_DEBUG) console.log('smile blendshapes', leftSmile, rightSmile, 'use', smileScore);

  // rising-edge detection
  if (smileScore > SMILE_THRESH && lastSmileScore <= SMILE_THRESH) {
    // compute mouth center in canvas coords for spawn
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
    // spawn stars (uses STAR_COUNT_ON_SMILE constant)
    spawnStarsAt(cx, cy);
  }

  lastSmileScore = smileScore;
}

// integrate star explosion into eye blink handling
// modify checkEyeClicks to also call explodeStarsOnSide — if you already replaced checkEyeClicks, ensure it calls:
//    explodeStarsOnSide('left') and/or explodeStarsOnSide('right')
// Below is a safe wrapper to call from checkEyeClicks (it won't duplicate if already invoked)
function maybeExplodeStarsOnSide(side) {
  explodeStarsOnSide(side);
}

// detect left/right eye "click" (blink crossing) and trigger explosions
let lastLeftEyeBlink = 0;
let lastRightEyeBlink = 0;
function checkEyeClicks() {
  // uses leftEyeBlink/rightEyeBlink from existing logic
  const now = millis();

  if (leftEyeBlink > BLINK_THRESHOLD && lastLeftEyeBlink <= BLINK_THRESHOLD && (now - lastLeftBlinkTime) > BLINK_COOLDOWN) {
    explodeBubblesOnSide('left');
    explodeStarsOnSide('left');   
    lastLeftBlinkTime = now;
  }
  if (rightEyeBlink > BLINK_THRESHOLD && lastRightEyeBlink <= BLINK_THRESHOLD && (now - lastRightBlinkTime) > BLINK_COOLDOWN) {
    explodeBubblesOnSide('right');
    explodeStarsOnSide('right');  
    lastRightBlinkTime = now;
  }

  lastLeftEyeBlink = leftEyeBlink;
  lastRightEyeBlink = rightEyeBlink;
}

// the blendshapes we are going to track
let leftEyeBlink = 0.0;
let rightEyeBlink = 0.0;
let jawOpen = 0.0;

/*function setup() {
  // full window canvas
  createCanvas(windowWidth, windowHeight);
  // initialize MediaPipe
  setupFace();
  setupVideo();
}*/

let bgImage = null;

function preload() {
  // try png then jpg
  loadImage('Images/background_03.png',
    img => { bgImage = img; console.log('Loaded background: Images/background_03.png'); },
    err => {
      loadImage('Images/background_03.jpg',
        img2 => { bgImage = img2; console.log('Loaded background: Images/background_03.jpg'); },
        err2 => { bgImage = null; console.warn('background_03 not found in Images/'); }
      );
    }
  );
}

function setup() {
  // full window canvas
  createCanvas(windowWidth, windowHeight);
  // initialize MediaPipe
  setupFace();
  setupVideo();

  // hide the DOM video element so the camera preview is not visible on screen
  // (we still use the detection results from the hidden video)
  setTimeout(() => {
    const v = window.videoElement || document.querySelector('video');
    if (v && v.style) v.style.display = 'none';
  }, 500);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

/*function draw() {

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

  // spawn bubbles when mouth opens
  checkJawAndSpawn();

  // if we have at least one face
  if (faces && faces.length > 0) {
    // draw eyes and mouth for the first face
    drawEyes(faces[0]);
    drawMouth(faces[0]);
  }

  // draw blendshape values
  drawBlendshapeScores();

  // check eye "clicks" (close) and trigger explosions when detected
  if (typeof checkEyeClicks === 'function') checkEyeClicks();

  // draw all bubbles on top
  updateAndDrawBubbles();

  // draw explosion particles on top of bubbles
  if (typeof updateAndDrawExplosions === 'function') updateAndDrawExplosions();
}
*/

function draw() {

  // clear the canvas with black (no camera frame drawn)
  // draw background image if present, otherwise black
  //if (bgImage) {
    // cover canvas with the background image (stretched)
  //  image(bgImage, 0, 0, width, height);
  //} else {
    background(0);
  //}

  // get detected faces (from MediaPipe pipelines)
  let faces = getFaceLandmarks();

  // see blendshapes.txt for full list of possible blendshapes
  leftEyeBlink = getBlendshapeScore('eyeBlinkLeft');
  rightEyeBlink = getBlendshapeScore('eyeBlinkRight');
  jawOpen = getBlendshapeScore('jawOpen');

  // spawn bubbles when mouth opens
  checkJawAndSpawn();

  checkSmileAndSpawnStars();

  // draw/update stars
  updateAndDrawStars();

  // if we have at least one face, draw only the face overlays (eyes + mouth)
  if (faces && faces.length > 0) {
    drawEyes(faces[0]);
    drawMouth(faces[0]);
  }

  // draw blendshape values (optional debug)
  drawBlendshapeScores();

  // check eye "clicks" (close) and trigger explosions when detected
  if (typeof checkEyeClicks === 'function') checkEyeClicks();

  // draw all bubbles on top
  updateAndDrawBubbles();

  // draw explosion particles on top of bubbles
  if (typeof updateAndDrawExplosions === 'function') updateAndDrawExplosions();
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

// spawn bubbles at mouth center when jaw opens
function checkJawAndSpawn() {
  const THRESH = 0.45; // jawOpen threshold (tweak)
  const now = millis();
  // falling edge -> only spawn when crossing threshold upward
  if (jawOpen > THRESH && lastJawOpen <= THRESH && (now - lastBubbleTime) > BUBBLE_COOLDOWN) {
    // find mouth center from feature rings if available
    let mouth = null;
    try { mouth = getFeatureRings('FACE_LANDMARKS_LIPS'); } catch(e){ mouth = null; }
    let cx = width * 0.5, cy = height * 0.6;
    if (mouth && mouth[0] && mouth[0].length) {
      // use average of outer lip ring for spawn position
      const ring = mouth[0];
      let sx = 0, sy = 0;
      for (let p of ring) { sx += p.x; sy += p.y; }
      cx = sx / ring.length;
      cy = sy / ring.length;
    }

    // spawn a small burst of 6..12 bubbles
    const count = floor(map(jawOpen, THRESH, 1.0, 6, 12));
    for (let i = 0; i < count; i++) {
      if (bubbles.length >= MAX_BUBBLES) break;
      const offx = random(-30, 30);
      const offy = random(-10, 10);
      const br = random(12, map(jawOpen, THRESH, 1.0, 24, 60));
      const b = new Bubble(cx + offx, cy + offy, br);
      // give them an upward nudge proportional to how open the mouth is
      b.vy -= map(jawOpen, THRESH, 1.0, 0.5, 2.0);
      bubbles.push(b);
    }
    lastBubbleTime = now;
  }
  lastJawOpen = jawOpen;
}



