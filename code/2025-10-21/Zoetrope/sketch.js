// ...existing code...
let lights = [];
let separationStart = 3000;      // ms after sketch start when separation begins
let separationDuration = 2000;   // ms for separation easing
let sketchStart;
let separationEnabled = true;    // automatic separation after separationStart

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 1);
  noStroke();

  // create a few vertical "lights"
  lights = [];
  for (let i = 0; i < 8; i++) {
    lights.push({
      x: random(width),
      speed: random(-1.2, 1.2),
      hue: random(0, 360),
      w: random(80, 260),
      drift: random(0.002, 0.01),
      t: random(1000),
      segments: floor(random(3, 7)),  // how many separated strips each light becomes
      segOffset: random(TWO_PI),      // phase offset for per-segment motion
      segSpread: random(20, 80)       // how far segments can spread apart
    });
  }

  sketchStart = millis();
}

function draw() {
  background(0);            // full-window black canvas
  blendMode(ADD);          // additive blending for glow

  // compute separation progress (0..1)
  let elapsed = millis() - sketchStart;
  let sepProgress = 0;
  if (separationEnabled) {
    sepProgress = constrain((elapsed - separationStart) / separationDuration, 0, 1);
  }

  for (let l of lights) {
    l.x += l.speed;
    l.t += l.drift;
    // wrap
    if (l.x < -l.w) l.x = width + l.w;
    if (l.x > width + l.w) l.x = -l.w;
    // slight horizontal wobble for movement variety
    let baseCx = l.x + sin(l.t * TWO_PI) * 60;

    // draw as separated segments when sepProgress > 0
    drawSeparatedVerticalLight(baseCx, l.w, l.hue, l, sepProgress);
  }

  blendMode(BLEND);
}

// Draw a vertical light that can split into multiple separated columns.
// When sepProgress==0 it draws a single soft column; when >0 it eases into many strips.
function drawSeparatedVerticalLight(cx, w, hue, l, sepProgress) {
  // parameters
  let slice = 4;
  let globalAlpha = 0.12;
  let sigma = w * 0.35;

  // If no separation, draw the original soft column
  if (sepProgress <= 0.001 || l.segments <= 1) {
    for (let dx = -w; dx <= w; dx += slice) {
      let a = Math.exp(- (dx * dx) / (2 * sigma * sigma));
      fill(hue, 80, 100, a * globalAlpha);
      rect(cx + dx - slice / 2, 0, slice, height);
    }
    return;
  }

  // When separating: compute per-segment centers and draw narrower gaussian columns
  let segCount = l.segments;
  let segBaseWidth = (w * 1.0) / segCount;          // base width per segment
  let segDrawWidth = segBaseWidth * 0.9;            // actual drawn width per segment
  let spread = l.segSpread * sepProgress;           // how far segments move apart
  let ease = easeOutQuad(sepProgress);

  for (let s = 0; s < segCount; s++) {
    // normalized index -1..1 across the light's original width
    let norm = map(s, 0, segCount - 1, -0.5, 0.5);
    // segment center moves from within the original column to spread apart
    // add a small per-segment wobble for liveliness
    let wobble = sin(l.t * TWO_PI + l.segOffset + s * 0.6) * 18 * ease;
    let segCenter = cx + norm * (w) + norm * spread * 2 + wobble;

    // draw gaussian-like vertical column for this segment
    let segSigma = segDrawWidth * 0.4;
    for (let dx = -segDrawWidth; dx <= segDrawWidth; dx += slice) {
      let a = Math.exp(- (dx * dx) / (2 * segSigma * segSigma));
      // reduce alpha slightly so overlapping adds up nicely
      fill(hue, 80, 100, a * globalAlpha);
      rect(segCenter + dx - slice / 2, 0, slice, height);
    }
  }
}

function easeOutQuad(t) {
  return t * (2 - t);
}

function keyPressed() {
  // toggle separation with 's' key (useful for testing)
  if (key === 's' || key === 'S') {
    separationEnabled = !separationEnabled;
    // restart timer so toggle visually restarts the animate-in
    sketchStart = millis();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
// ...existing code...