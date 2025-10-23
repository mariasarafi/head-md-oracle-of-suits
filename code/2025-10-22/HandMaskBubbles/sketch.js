// persistent bubbles storage
let bubbles = [];

// simple floating bubble class (colors mixed from PALETTE_RGB)
class Bubble {
  constructor(x, y, r) {
    this.x = x;
    this.y = y;
    this.r = r;
    const a = random(TWO_PI);
    const s = random(0.2, 1.2);
    this.vx = cos(a) * s;
    this.vy = sin(a) * s * 0.6;

    // pick two palette entries and mix them
    const p1 = PALETTE_RGB[floor(random(PALETTE_RGB.length))];
    const p2 = PALETTE_RGB[floor(random(PALETTE_RGB.length))];
    const c1 = color(p1[0], p1[1], p1[2]);
    const c2 = color(p2[0], p2[1], p2[2]);

    this.bodyColor = lerpColor(c1, c2, random());
    this.bodyColor.setAlpha(40);

    this.outlineColor = lerpColor(c1, c2, random());
    this.outlineColor.setAlpha(180);

    this.highlightColor = lerpColor(this.bodyColor, color(255,255,255), 0.6);
    this.highlightColor.setAlpha(110);
  }

  update() {
    // gentle drift and slight damping
    this.vx += random(-0.02, 0.02);
    this.vy += random(-0.04, 0.02);
    this.x += this.vx;
    this.y += this.vy;

    // simple bounds keep-inside
    if (this.x - this.r < 0) { this.x = this.r; this.vx *= -0.7; }
    if (this.x + this.r > width) { this.x = width - this.r; this.vx *= -0.7; }
    if (this.y - this.r < 0) { this.y = this.r; this.vy *= -0.7; }
    if (this.y + this.r > height) { this.y = height - this.r; this.vy *= -0.7; }
  }

  draw() {
    push();
    noStroke();
    fill(this.bodyColor);
    ellipse(this.x, this.y, this.r * 2, this.r * 2);

    stroke(this.outlineColor);
    strokeWeight(3);
    noFill();
    ellipse(this.x, this.y, this.r * 2, this.r * 2);

    noStroke();
    fill(this.highlightColor);
    ellipse(this.x - this.r * 0.35, this.y - this.r * 0.45, this.r * 0.4, this.r * 0.25);
    pop();
  }
}

// update and draw all bubbles (call once per frame)
function updateAndDrawBubbles() {
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i];
    b.update();
    b.draw();
    // optional removal if extremely small or offscreen (not strictly needed)
    if (b.r <= 0.5) bubbles.splice(i, 1);
  }
}

// create an array to hold the permimeters
let handPerimeters = [];
// offscreen buffers (created in setup / recreated on resize)
let gBuffer, gMask;
// create an offset for the outline of the perimeter to be bigger
const outlineOffset = 50;

const MAX_BUBBLES = 20;       // cap to avoid runaway memory/CPU
const MAX_EXPLOSION_PARTS = 500; // cap particle count across all explosions

const PALETTE_RGB = [
  [246, 115, 136],
  [255, 184, 108],
  [162, 196, 255],
  [186, 255, 201],
  [255, 255, 255]
];

function setup() {

  // full window canvas
  createCanvas(640, 480);

  // prepare offscreen buffers once
  gBuffer = createGraphics(width, height);
  gMask = createGraphics(width, height);

  // initialize MediaPipe settings
  setupHands();
  // start camera using MediaPipeHands.js helper
  setupVideo();

}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // recreate buffers to match new canvas size (avoid allocating each frame)
  gBuffer = createGraphics(width, height);
  gMask = createGraphics(width, height);
}


function draw() {
  // draw background
  background(255);

  // update video draw rect if video present
  if (isVideoReady()) {
    const vw = videoElement.videoWidth || videoElement.width || width;
    const vh = videoElement.videoHeight || videoElement.height || height;
    const scale = max(width / vw, height / vh);
    videoDrawW = vw * scale;
    videoDrawH = vh * scale;
    videoDrawX = (width - videoDrawW) / 2;
    videoDrawY = (height - videoDrawH) / 2;
  }

  // build perimeters from detections
  handPerimeters = [];
  if (detections && detections.multiHandLandmarks) {
    for (let hand of detections.multiHandLandmarks) {
      if (typeof detectPerimeter === 'function') detectPerimeter(hand);
    }
  }

  // render masked hands if present
  if (handPerimeters && handPerimeters.length) {
    gBuffer.clear();
    gBuffer.image(videoElement, 0, 0, width, height);

    gMask.clear();
    gMask.noStroke();
    gMask.fill(255);
    for (let perimeter of handPerimeters) {
      if (!perimeter || !perimeter.length) continue;
      gMask.beginShape();
      for (let p of perimeter) gMask.vertex(p.x, p.y);
      gMask.endShape(CLOSE);
    }

    gBuffer.drawingContext.save();
    gBuffer.drawingContext.globalCompositeOperation = 'destination-in';
    gBuffer.image(gMask, 0, 0);
    gBuffer.drawingContext.restore();

    image(gBuffer, 0, 0, width, height);

    // overlay: draw skeleton/dots and spawn bubbles
    if (detections && detections.multiHandLandmarks && detections.multiHandLandmarks.length) {
      strokeWeight(2);
      for (let hand of detections.multiHandLandmarks) {
        if (typeof drawConnections === 'function') drawConnections(hand);
        if (typeof drawIndex === 'function') drawIndex(hand);
        if (typeof drawThumb === 'function') drawThumb(hand);
        if (typeof drawBubble === 'function') drawBubble(hand);
      }
    }
  } else {
    if (isVideoReady()) image(videoElement, 0, 0, width, height);
  }

  // draw bubbles on top
  if (typeof updateAndDrawBubbles === 'function') updateAndDrawBubbles();
}

function lmToXY(lm) {
  if (!lm) return null;
  // if you compute videoDrawW/videoDrawX in draw(), use those to map
  if (typeof videoDrawW !== 'undefined' && typeof videoDrawX !== 'undefined') {
    return { x: lm.x * videoDrawW + (videoDrawX || 0), y: lm.y * videoDrawH + (videoDrawY || 0) };
  }
  // fallback: map directly to canvas size
  return { x: lm.x * width, y: lm.y * height };
}

function detectPerimeter(landmarks) {
  // produce polygon in canvas coordinates and push to handPerimeters
  if (!landmarks) return;
  // compute current video draw rect (must match how you draw the video)
  const vw = (videoElement && (videoElement.videoWidth || videoElement.width)) || width;
  const vh = (videoElement && (videoElement.videoHeight || videoElement.height)) || height;
  const scale = max(width / vw, height / vh);
  const drawW = vw * scale;
  const drawH = vh * scale;
  const drawX = (width - drawW) / 2;
  const drawY = (height - drawH) / 2;

  if (typeof getHandPerimeter === 'function') {
    // getHandPerimeter returns points in video-pixel coords (based on videoElement.width),
    // map them into the canvas draw rect.
    const raw = getHandPerimeter(landmarks);
    const per = raw.map(p => ({
      x: (p.x / vw) * drawW + drawX,
      y: (p.y / vh) * drawH + drawY
    }));
    handPerimeters.push(per);
    return;
  }

  // fallback: use landmarks mapped directly
  const per = [];
  for (let lm of landmarks) {
    const p = lmToXY(lm);
    if (p) per.push(p);
  }
  handPerimeters.push(per);
}

// new helper: returns ordered perimeter points (concave hull) for MediaPipe 21-landmark hand
function getHandPerimeter(landmarks) {
  if (!landmarks || landmarks.length < 21) return [];
  const toCanvas = i => ({ x: landmarks[i].x * videoElement.width, y: landmarks[i].y * videoElement.height });
  const lerpPoint = (A, B, t = 0.6) => ({ x: A.x * (1 - t) + B.x * t, y: A.y * (1 - t) + B.y * t });

  // create two interpolated wrist-base points to restore the rounded palm base
  const wrist = toCanvas(0);
  const baseLeft = lerpPoint(wrist, toCanvas(17), 0.6);   // toward pinky side
  const baseRight = lerpPoint(wrist, toCanvas(5), 0.6);   // toward index/thumb side

  // raw perimeter (walks outer contour)
  const pts = [
    baseLeft,
    toCanvas(17), toCanvas(18), toCanvas(19), toCanvas(20),
    toCanvas(16), toCanvas(15), toCanvas(14), toCanvas(13),
    toCanvas(12), toCanvas(11), toCanvas(10), toCanvas(9),
    toCanvas(8), toCanvas(7), toCanvas(6), toCanvas(5),
    toCanvas(4), toCanvas(3), toCanvas(2), toCanvas(1),
    baseRight
  ].filter(p => p && isFinite(p.x) && isFinite(p.y));

  // helper: normalize vector
  const norm = v => {
    const l = Math.hypot(v.x, v.y) || 1;
    return { x: v.x / l, y: v.y / l };
  };

  // compute signed area to get orientation
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    area += a.x * b.y - b.x * a.y;
  }

  // offset only convex (exterior) vertices
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const prev = pts[(i - 1 + pts.length) % pts.length];
    const cur = pts[i];
    const next = pts[(i + 1) % pts.length];

    const v1 = { x: cur.x - prev.x, y: cur.y - prev.y };
    const v2 = { x: next.x - cur.x, y: next.y - cur.y };
    const cross = v1.x * v2.y - v1.y * v2.x;

    // convex if cross has same sign as area
    const isConvex = cross * area > 0;

    if (!isConvex || outlineOffset === 0) {
      out.push(cur);
      continue;
    }

    // outward normals for each adjacent edge (depends on polygon orientation)
    let n1, n2;
    if (area > 0) { // CCW polygon -> outward is right normal
      n1 = norm({ x: v1.y, y: -v1.x });
      n2 = norm({ x: v2.y, y: -v2.x });
    } else { // CW polygon -> outward is left normal
      n1 = norm({ x: -v1.y, y: v1.x });
      n2 = norm({ x: -v2.y, y: v2.x });
    }

    // bisector of the two normals (fall back to n1 if degenerate)
    let bx = n1.x + n2.x, by = n1.y + n2.y;
    const bl = Math.hypot(bx, by);
    let bis;
    if (bl < 1e-6) bis = n1;
    else bis = { x: bx / bl, y: by / bl };

    // apply offset outward along bisector
    out.push({ x: cur.x + bis.x * outlineOffset, y: cur.y + bis.y * outlineOffset });
  }

  return out;
}

// draw the index fingertip dot (cyan)
function drawIndex(landmarks) {
  const mark = landmarks[FINGER_TIPS.index];
  if (!mark) return;
  const p = lmToXY(mark);
  if (!p) return;
  noStroke();
  fill(0, 255, 255);
  circle(p.x, p.y, 20);
}

// draw the thumb fingertip dot (yellow)
function drawThumb(landmarks) {
  const mark = landmarks[FINGER_TIPS.thumb];
  if (!mark) return;
  const p = lmToXY(mark);
  if (!p) return;
  noStroke();
  fill(255, 255, 0);
  circle(p.x, p.y, 20);
}

// draw hand connections (green lines) — replaces previous implementation
function drawConnections(landmarks) {
  stroke(0, 255, 0);
  strokeWeight(2);
  for (let connection of HAND_CONNECTIONS) {
    const a = landmarks[connection[0]];
    const b = landmarks[connection[1]];
    if (!a || !b) continue;
    const pa = lmToXY(a);
    const pb = lmToXY(b);
    if (!pa || !pb) continue;
    line(pa.x, pa.y, pb.x, pb.y);
  }
}

function drawBubble(landmarks) {
  try {
    // basic guards
    if (!landmarks) return;
    if (typeof FINGER_TIPS === 'undefined') return;
    const indexMark = landmarks[FINGER_TIPS.index];
    const thumbMark = landmarks[FINGER_TIPS.thumb];
    if (!indexMark || !thumbMark) return;

    // map coords
    const ip = lmToXY(indexMark);
    const tp = lmToXY(thumbMark);
    if (!ip || !tp) return;

    // pinch distance
    const d = dist(ip.x, ip.y, tp.x, tp.y);
    const THRESHOLD = 40;
    if (d > THRESHOLD) return;

    // cooldown guard
    const now = millis();
    if (typeof lastBubbleTime === 'undefined') lastBubbleTime = 0;
    if (now - lastBubbleTime < (typeof BUBBLE_COOLDOWN !== 'undefined' ? BUBBLE_COOLDOWN : 400)) return;

    // create single bubble safely
    const cx = (ip.x + tp.x) / 2;
    const cy = (ip.y + tp.y) / 2;
    if (!Array.isArray(bubbles)) bubbles = [];
    if (typeof MAX_BUBBLES !== 'number' || bubbles.length < MAX_BUBBLES) {
      const br = random(30, 70);
      const nb = new Bubble(cx, cy, br);
      // small random nudge
      const ang = random(TWO_PI);
      nb.vx += cos(ang) * random(0.2, 1.2);
      nb.vy += sin(ang) * random(0.2, 1.2);

      // safe palette use
      if (typeof PALETTE_RGB !== 'undefined' && PALETTE_RGB.length) {
        const p1 = PALETTE_RGB[floor(random(PALETTE_RGB.length))];
        const p2 = PALETTE_RGB[floor(random(PALETTE_RGB.length))];
        const c1 = color(p1[0], p1[1], p1[2]);
        const c2 = color(p2[0], p2[1], p2[2]);
        nb.bodyColor = lerpColor(c1, c2, random());
        nb.bodyColor.setAlpha(40);
        nb.outlineColor = lerpColor(c1, c2, random());
        nb.outlineColor.setAlpha(180);
        nb.highlightColor = lerpColor(nb.bodyColor, color(255,255,255), 0.6);
        nb.highlightColor.setAlpha(110);
      }
      bubbles.push(nb);
    }

    lastBubbleTime = now;
  } catch (err) {
    // catch and log errors so draw() keeps running
    console.error('drawBubble error:', err);
  }
}

// explosions disabled for now — keep stub to avoid errors
function spawnExplosion(x, y, col, strength = 1.0) {
  // intentionally empty
}

// hand movement influence — new feature code
let prevHandCenterX = null;
const HAND_INFLUENCE = 0.6; // how strongly horizontal hand movement moves bubbles
const HAND_SMOOTH = 0.2;    // smoothing factor for noisy hand center
let lastAppliedHandDx = 0;

// new update function for hand movement influence
function updateHandMovement() {
  if (!detections || !detections.multiHandLandmarks || !detections.multiHandLandmarks.length) {
    prevHandCenterX = null;
    return;
  }

  // average position of all detected hands
  let sumX = 0, sumY = 0;
  for (let hand of detections.multiHandLandmarks) {
    const p = lmToXY(hand[0]); // use wrist position for hand center
    if (p) {
      sumX += p.x;
      sumY += p.y;
    }
  }
  const handCount = detections.multiHandLandmarks.length;
  const handCenterX = sumX / handCount;
  const handCenterY = sumY / handCount;

  // smooth movement
  if (prevHandCenterX !== null) {
    const dx = handCenterX - prevHandCenterX;
    lastAppliedHandDx = lerp(lastAppliedHandDx, dx, HAND_SMOOTH);
    // apply influence to all bubbles
    for (let b of bubbles) {
      b.x += lastAppliedHandDx * HAND_INFLUENCE;
    }
  }

  prevHandCenterX = handCenterX;
}

