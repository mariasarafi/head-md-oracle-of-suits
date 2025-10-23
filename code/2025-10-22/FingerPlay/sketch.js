// create an array to hold the permimeters
let handPerimeters = [];
// offscreen buffers (created in setup / recreated on resize)
let gBuffer, gMask;
// create an offset for the outline of the perimeter to be bigger
const outlineOffset = 50;


// persistent bubble storage + creation cooldown
let bubbles = [];
// explosions/particles storage
let explosions = [];

const BUBBLE_COOLDOWN = 400; // ms between creations
let lastBubbleTime = 0;

let prevHandCenterX = null;         // previous frame average hand center X (pixels)
const HAND_INFLUENCE = 0.6;         // how strongly hand movement moves bubbles (tweak)
const HAND_SMOOTH = 0.2;   

// collision gating: only create explosions when hand-driven horizontal movement is strong enough
let lastAppliedHandDx = 0;                 // signed last horizontal delta applied to bubbles (pixels)
const COLLISION_HAND_MOVE_THRESHOLD = 4;   // pixels — tweak to make collisions easier/harder
//

// add globals for video draw rectangle (used to map normalized landmarks -> canvas pixels)
let videoDrawX = 0, videoDrawY = 0, videoDrawW = 0, videoDrawH = 0;

// palette (RGB) — includes the original bubble color plus the colors used elsewhere
const PALETTE_RGB = [
  [180, 220, 255], // original bubble
  [0, 255, 255],   // index (cyan)
  [255, 255, 0],   // thumb (yellow)
  [0, 0, 255],     // tips (blue)
  [255, 0, 0],     // landmarks (red)
  [0, 255, 0]      // connections (green)
];

// simple floating bubble class with per-bubble mixed colors
class Bubble {
  constructor(x, y, r) {
    this.x = x;
    this.y = y;
    this.r = r;
    const a = random(TWO_PI);
    const s = random(0.3, 1.2);
    this.vx = cos(a) * s;
    this.vy = sin(a) * s;

    // pick two palette entries and mix them with lerpColor
    const p1 = PALETTE_RGB[floor(random(PALETTE_RGB.length))];
    const p2 = PALETTE_RGB[floor(random(PALETTE_RGB.length))];
    const c1 = color(p1[0], p1[1], p1[2]);
    const c2 = color(p2[0], p2[1], p2[2]);

    // body (soft, translucent)
    this.bodyColor = lerpColor(c1, c2, random());
    this.bodyColor.setAlpha(40);

    // outline (stronger, more opaque)
    this.outlineColor = lerpColor(c1, c2, random());
    this.outlineColor.setAlpha(180);

    // highlight (mix toward white for a subtle specular)
    this.highlightColor = lerpColor(this.bodyColor, color(255, 255, 255), 0.6);
    this.highlightColor.setAlpha(110);
  }

  update() {
    // gentle drift
    this.vx += random(-0.02, 0.02);
    this.vy += random(-0.03, 0.03);
    this.x += this.vx;
    this.y += this.vy;
    // simple edge bounce
    if (this.x - this.r < 0) { this.x = this.r; this.vx *= -0.8; }
    if (this.x + this.r > width) { this.x = width - this.r; this.vx *= -0.8; }
    if (this.y - this.r < 0) { this.y = this.r; this.vy *= -0.8; }
    if (this.y + this.r > height) { this.y = height - this.r; this.vy *= -0.8; }
  }

  // draw method moved into the Bubble class (was mistakenly placed elsewhere)
  draw() {
    push();
    // body
    noStroke();
    fill(this.bodyColor);
    ellipse(this.x, this.y, this.r * 2, this.r * 2);

    // outline
    stroke(this.outlineColor);
    strokeWeight(3);
    noFill();
    ellipse(this.x, this.y, this.r * 2, this.r * 2);

    // subtle highlight
    noStroke();
    fill(this.highlightColor);
    ellipse(this.x - this.r * 0.35, this.y - this.r * 0.45, this.r * 0.4, this.r * 0.25);
    pop();
  }
}

// single explosion particle
class Particle {
  constructor(x, y, col) {
    this.x = x;
    this.y = y;
    const a = random(TWO_PI);
    const s = random(2, 8);
    this.vx = cos(a) * s;
    this.vy = sin(a) * s;
    this.size = random(4, 18);
    this.life = this.maxLife = floor(random(40, 120)); // frames
    this.col = col instanceof p5.Color ? col : color(col);
    this.gravity = random(0.02, 0.2);
  }
  update() {
    this.vx *= 0.99;
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    this.life--;
  }
  draw() {
    push();
    noStroke();
    const a = map(this.life, 0, this.maxLife, 0, 255);
    this.col.setAlpha(a * 0.8);
    fill(this.col);
    ellipse(this.x, this.y, this.size);
    pop();
  }
  isAlive() {
    return this.life > 0;
  }
}

// explosion container
class Explosion {
  constructor(x, y, baseColor, strength = 1.0) {
    this.x = x;
    this.y = y;
    this.particles = [];
    const count = floor(20 + 40 * strength);
    for (let i = 0; i < count; i++) {
      // slightly vary particle color around baseColor
      const jitter = color(
        constrain(red(baseColor) + random(-30, 30), 0, 255),
        constrain(green(baseColor) + random(-30, 30), 0, 255),
        constrain(blue(baseColor) + random(-30, 30), 0, 255)
      );
      this.particles.push(new Particle(this.x + random(-6, 6), this.y + random(-6, 6), jitter));
    }
  }
  update() {
    for (let p of this.particles) p.update();
    // remove dead particles
    this.particles = this.particles.filter(p => p.isAlive());
  }
  draw() {
    for (let p of this.particles) p.draw();
  }
  isAlive() {
    return this.particles.length > 0;
  }
}

function updateAndDrawBubbles() {
  for (let b of bubbles) {
    b.update();
    b.draw();
  }
}

function updateAndDrawBubbles() {
  for (let b of bubbles) {
    b.update();
    b.draw();
  }
}

function spawnExplosion(x, y, col, strength = 1.0) {
  explosions.push(new Explosion(x, y, col, strength));
}

function updateAndDrawExplosions() {
  for (let e of explosions) {
    e.update();
    e.draw();
  }
  // remove finished explosions
  explosions = explosions.filter(e => e.isAlive());
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);

  // prepare offscreen buffers once
  gBuffer = createGraphics(width, height);
  gMask = createGraphics(width, height);

  // remove createGraphics(...) for videoBuffer / maskBuffer

  // initialize MediaPipe
  setupHands();
  setupVideo();

  // remove any code that hides the DOM video element here
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // recreate buffers to match new canvas size (avoid allocating each frame)
  gBuffer = createGraphics(width, height);
  gMask = createGraphics(width, height);
}

function draw() {
  // clear or background — use background(255) for white, or clear() for transparent
  background(255);

  // draw camera frame to cover the canvas while preserving aspect ratio
  if (isVideoReady()) {
    const vw = videoElement.videoWidth || videoElement.width || width;
    const vh = videoElement.videoHeight || videoElement.height || height;
    const scale = max(width / vw, height / vh);
    videoDrawW = vw * scale;
    videoDrawH = vh * scale;
    videoDrawX = (width - videoDrawW) / 2;
    videoDrawY = (height - videoDrawH) / 2;

    // draw video directly (no masking)
    image(videoElement, videoDrawX, videoDrawY, videoDrawW, videoDrawH);
  } else {
    background(255);
  }

  strokeWeight(2);

  // compute average hand center X for this frame
  let frameHandCenterX = null;
  if (detections && detections.multiHandLandmarks && detections.multiHandLandmarks.length) {
    let sumX = 0;
    let count = 0;

      // clear previous frame's perimeters
    handPerimeters = [];

    for (let hand of detections.multiHandLandmarks) {
    // detectPerimeter(hand);
      
      if (typeof drawIndex === 'function') drawIndex(hand);
      if (typeof drawThumb === 'function') drawThumb(hand);
      if (typeof drawConnections === 'function') drawConnections(hand);
      if (typeof drawBubble === 'function') drawBubble(hand);

      // compute hand center X (using displayed video rect)
      let handSumX = 0;
      let handCount = 0;
      for (let lm of hand) {
        handSumX += (lm.x * videoDrawW) + videoDrawX;
        handCount++;
      }
      if (handCount > 0) { sumX += handSumX / handCount; count++; }
    }
    if (count > 0) frameHandCenterX = sumX / count;
  }

  // apply horizontal hand movement to bubbles and record applied delta
  if (frameHandCenterX !== null) {
    if (prevHandCenterX === null) prevHandCenterX = frameHandCenterX;
    let rawDx = frameHandCenterX - prevHandCenterX;
    let dx = rawDx * (1 - HAND_SMOOTH);

    let applied = 0;
    if (Math.abs(dx) > 0.001) {
      applied = dx * HAND_INFLUENCE;
      for (let b of bubbles) {
        b.x += applied;
        b.vx += dx * 0.05;
      }
    }
    lastAppliedHandDx = applied;
    prevHandCenterX = lerp(prevHandCenterX, frameHandCenterX, 0.5);
  } else {
    prevHandCenterX = null;
    lastAppliedHandDx = 0;
  }

  // update + draw bubbles and explosions
  updateAndDrawBubbles();
  handleBubbleCollisions();
  updateAndDrawExplosions();

}

function detectPerimeter(landmarks) {

  // draw concave perimeter around the hand
  const perimeter = getHandPerimeter(landmarks);
  if (perimeter.length) {
    stroke(0, 150, 255);
    fill(0, 150, 255, 60);
    strokeWeight(2);
    beginShape();
    for (let p of perimeter) vertex(p.x, p.y);
    endShape(CLOSE);
  }

  // push this perimeter to the array
  handPerimeters.push(perimeter);

}

function drawIndex(landmarks) {
  // get the index fingertip landmark
  let mark = landmarks[FINGER_TIPS.index];
  if (!mark) return;

  noStroke();
  fill(0, 255, 255);

  // map normalized coords to displayed video pixels
  let x = mark.x * videoDrawW + videoDrawX;
  let y = mark.y * videoDrawH + videoDrawY;
  circle(x, y, 20);
}

// draw the thumb finger tip landmark
function drawThumb(landmarks) {
  let mark = landmarks[FINGER_TIPS.thumb];
  if (!mark) return;

  noStroke();
  fill(255, 255, 0);

  let x = mark.x * videoDrawW + videoDrawX;
  let y = mark.y * videoDrawH + videoDrawY;
  circle(x, y, 20);
}

function drawTips(landmarks) {
  noStroke();
  fill(0, 0, 255);
  const tips = [4, 8, 12, 16, 20];
  for (let tipIndex of tips) {
    let mark = landmarks[tipIndex];
    if (!mark) continue;
    let x = mark.x * videoDrawW + videoDrawX;
    let y = mark.y * videoDrawH + videoDrawY;
    circle(x, y, 10);
  }
}

function drawLandmarks(landmarks) {
  noStroke();
  fill(255, 0, 0);
  for (let mark of landmarks) {
    if (!mark) continue;
    let x = mark.x * videoDrawW + videoDrawX;
    let y = mark.y * videoDrawH + videoDrawY;
    circle(x, y, 6);
  }
}

function drawConnections(landmarks) {
  stroke(0, 255, 0);
  for (let connection of HAND_CONNECTIONS) {
    const a = landmarks[connection[0]];
    const b = landmarks[connection[1]];
    if (!a || !b) continue;
    let ax = a.x * videoDrawW + videoDrawX;
    let ay = a.y * videoDrawH + videoDrawY;
    let bx = b.x * videoDrawW + videoDrawX;
    let by = b.y * videoDrawH + videoDrawY;
    line(ax, ay, bx, by);
  }
}

function drawBubble(landmarks) {
  const indexMark = landmarks[FINGER_TIPS.index];
  const thumbMark = landmarks[FINGER_TIPS.thumb];
  if (!indexMark || !thumbMark) return;

  const ix = indexMark.x * videoDrawW + videoDrawX;
  const iy = indexMark.y * videoDrawH + videoDrawY;
  const tx = thumbMark.x * videoDrawW + videoDrawX;
  const ty = thumbMark.y * videoDrawH + videoDrawY;

  const d = dist(ix, iy, tx, ty);
  const threshold = 80;

  if (d <= threshold) {
    const cx = (ix + tx) / 2;
    const cy = (iy + ty) / 2;

    const maxR = 80;
    const minR = 30;
    const baseR = map(d, 0, threshold, maxR, minR);

    const now = millis();
    const near = bubbles.some(b => dist(b.x, b.y, cx, cy) < Math.max(30, baseR * 0.8));
    if (!near && now - lastBubbleTime > BUBBLE_COOLDOWN) {
      // closeness 0..1 (1 when very close) -> more bubbles when pinch tighter
      const closeness = constrain(1 - (d / threshold), 0, 1);
      // choose 2..6 bubbles depending on closeness
      const count = floor(map(closeness, 0, 1, 2, 6));

      for (let i = 0; i < count; i++) {
        // spread each new bubble slightly around the pinch center
        const ang = random(TWO_PI);
        const off = random(0, baseR * 0.6);
        const bx = cx + cos(ang) * off;
        const by = cy + sin(ang) * off;
        const br = baseR * random(0.55, 0.95);

        const nb = new Bubble(bx, by, br);
        // give a small outward kick so they separate a bit
        nb.vx += cos(ang) * random(0.2, 1.2);
        nb.vy += sin(ang) * random(0.2, 1.2);
        bubbles.push(nb);
      }

      lastBubbleTime = now;
    }
  }
}

function handleBubbleCollisions() {
  // require sufficient recent hand-driven horizontal movement to trigger collisions
  if (Math.abs(lastAppliedHandDx) < COLLISION_HAND_MOVE_THRESHOLD) return;

  if (bubbles.length < 2) return;
  const toRemove = new Set();
  for (let i = 0; i < bubbles.length; i++) {
    if (toRemove.has(i)) continue;
    for (let j = i + 1; j < bubbles.length; j++) {
      if (toRemove.has(j)) continue;
      const a = bubbles[i];
      const b = bubbles[j];
      const d = dist(a.x, a.y, b.x, b.y);
      // collide when overlapping significantly
      if (d < (a.r + b.r) * 0.9) {
        // explosion center and mixed color
        const cx = (a.x + b.x) / 2;
        const cy = (a.y + b.y) / 2;
        // mix their outline colors if present, otherwise mix bodyColor
        let colA = a.outlineColor || a.bodyColor;
        let colB = b.outlineColor || b.bodyColor;
        const mixCol = lerpColor(colA, colB, 0.5);
        // strength based on sum of radii and hand movement magnitude
        const moveFactor = constrain(Math.abs(lastAppliedHandDx) / 20, 0.5, 3.0);
        const strength = constrain((a.r + b.r) / 100, 0.8, 3.0) * moveFactor;
        spawnExplosion(cx, cy, mixCol, strength);

        // mark both for removal
        toRemove.add(i);
        toRemove.add(j);
        break;
      }
    }
  }
  if (toRemove.size === 0) return;
  const idxs = Array.from(toRemove).sort((x, y) => y - x);
  for (let idx of idxs) bubbles.splice(idx, 1);
}

