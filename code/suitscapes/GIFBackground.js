// GIFBackground.js — shows GIF frames and a shield image beside the GIF
// Default behaviour: shield shown on the LEFT, gap = 18px

// Configure these to change default behaviour

let SHIELD_SIDE = 'left'; // 'left' or 'right'
let SHIELD_GAP = 60;      // pixels between GIF rect and shield
const SHIELD_PATH = 'Images/Jass/Jass-Summer-Shield.png'; // adjust path/casing
let SHIELD_DISPLAY_HEIGHT_RATIO = 0.25; // 0.25 => shield height = 25% of canvas height

// --- existing GIF config (keep as in your file) ---
const GIF_FRAMES = [
  'Images/Jass/Jass-Summer-Joy-01.png',
  'Images/Jass/Jass-Summer-Joy-02.png'
];

let gifImgs = [];
const GIF_FPS = 6;
const USE_CROSSFADE = false;
const GIF_FRAME_HOLD_MS = 500;
let GIF_DISPLAY_HEIGHT_RATIO = 1 / 2;
const GIF_ALLOW_UPSCALE = false;

// shield image state
let shieldImg = null;
let shieldLoadTried = false;

// setter helpers (call from sketch or console)
function setShieldSide(side) {
  if (side === 'left' || side === 'right') SHIELD_SIDE = side;
  else console.warn('setShieldSide: expected "left" or "right"');
}
function setShieldGap(px) {
  const n = Number(px);
  if (!isNaN(n) && n >= 0) SHIELD_GAP = n;
  else console.warn('setShieldGap: expected non-negative number');
}
function setShieldDisplayRatio(r) {
  const n = Number(r);
  if (!isNaN(n) && n > 0 && n <= 1) SHIELD_DISPLAY_HEIGHT_RATIO = n;
  else console.warn('setShieldDisplayRatio: expected number >0 and <=1');
}

// drawGifBackground: draws background (if bgFallbackImage exists) and the GIF + shield
function drawGifBackground() {
  const frames = gifImgs.filter(f => f);

  // draw full-canvas background (fallback image stretched to canvas) or black
  if (typeof bgFallbackImage !== 'undefined' && bgFallbackImage) {
    image(bgFallbackImage, 0, 0, width, height);
  } else {
    background(0);
  }

  if (!frames.length) return;

  const frameDuration = (typeof GIF_FRAME_HOLD_MS !== 'undefined' && GIF_FRAME_HOLD_MS > 0)
    ? GIF_FRAME_HOLD_MS
    : (1000 / GIF_FPS);

  const t = millis();
  const totalIndex = floor(t / frameDuration);
  const idx = totalIndex % frames.length;
  const next = (idx + 1) % frames.length;

  if (!USE_CROSSFADE || frames.length === 1) {
    const img = frames[idx];
    const r = computeDrawRect(img);
    image(img, r.x, r.y, r.w, r.h);
    drawShieldNextToRect(r);
  } else {
    const progress = (t % frameDuration) / frameDuration;
    const r1 = computeDrawRect(frames[idx]);
    const r2 = computeDrawRect(frames[next]);

    push();
    tint(255, 255 * (1 - progress));
    image(frames[idx], r1.x, r1.y, r1.w, r1.h);
    tint(255, 255 * progress);
    image(frames[next], r2.x, r2.y, r2.w, r2.h);
    pop();
    noTint();

    // align shield with currently visible frame (use r2)
    drawShieldNextToRect(r2);
  }
}

// draw the shield image next to the GIF rect according to SHIELD_SIDE and SHIELD_GAP
function drawShieldNextToRect(rect) {
  if (!rect || rect.w === 0 || rect.h === 0) return;

  // lazy-load shield once
  if (!shieldImg && !shieldLoadTried) {
    shieldLoadTried = true;
    loadImage(SHIELD_PATH,
      img => { shieldImg = img; console.log('Loaded shield:', SHIELD_PATH); },
      err => { console.warn('Failed to load shield:', SHIELD_PATH, err); }
    );
    return; // will draw on subsequent frames once loaded
  }
  if (!shieldImg) return;

  // NEW: compute desired height from canvas ratio (independent from GIF)
  let desiredH = height * SHIELD_DISPLAY_HEIGHT_RATIO;

  // optional: prevent shield from exceeding GIF rect height if you want (comment out to allow any size)
  // desiredH = min(desiredH, rect.h);

  const scale = desiredH / shieldImg.height;
  const sw = shieldImg.width * scale;
  const sh = desiredH;

  // choose x based on SHIELD_SIDE
  let sx;
  if (SHIELD_SIDE === 'right') {
    sx = rect.x + rect.w + SHIELD_GAP;
    // if overflowing, move to left
    if (sx + sw > width - 8) {
      sx = rect.x - SHIELD_GAP - sw;
    }
  } else { // 'left'
    sx = rect.x - SHIELD_GAP - sw;
    // if offscreen to left, place right
    if (sx < 8) {
      sx = rect.x + rect.w + SHIELD_GAP;
    }
  }
  // clamp
  if (sx < 8) sx = 8;
  if (sx + sw > width - 8) sx = width - sw - 8;

  const sy = rect.y + (rect.h - sh) / 2;
  push();
  imageMode(CORNER);
  image(shieldImg, sx, sy, sw, sh);
  pop();
}

// drawFallbackBackground (stretched) and computeDrawRect (same as before)
function drawFallbackBackground() {
  if (typeof bgFallbackImage !== 'undefined' && bgFallbackImage) {
    noTint();
    image(bgFallbackImage, 0, 0, width, height);
  } else {
    background(0);
  }
}

function computeDrawRect(img) {
  if (!img) return { x: 0, y: 0, w: 0, h: 0 };
  const iw = img.width;
  const ih = img.height;
  const desiredH = height * GIF_DISPLAY_HEIGHT_RATIO;
  let scale = desiredH / ih;
  if (!GIF_ALLOW_UPSCALE) scale = min(1, scale);
  const w = iw * scale;
  const h = ih * scale;
  const x = (width - w) / 2;
  const y = (height - h) / 2;
  return { x, y, w, h };
}


