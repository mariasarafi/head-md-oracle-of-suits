// GIFBackground.js — shows GIF frames and a shield image beside the GIF
// Shield drawing does NOT include eyes/mouth (face drawing removed)

// Configure these to change default behaviour
let SHIELD_SIDE = 'left'; // 'left' or 'right'
let SHIELD_GAP = 60;      // pixels between GIF rect and shield
const SHIELD_PATH = 'Images/Jass/Jass-Summer-Shield.png'; // adjust path/casing
let SHIELD_DISPLAY_HEIGHT_RATIO = 0.25; // shield height = 25% of canvas height
let SHIELD_LINGER_MS = 5000; // not used for permanent mode but kept for API compatibility

// internal tracking of last-shown shield rect/time
let _shieldLastVisible = -Infinity;
let _lastShieldRect = null;
let _lastGifRect = null;

// --- persistent shield state ---
let _shieldPersistent = true;      // when true, shield remains visible independently of GIF
let _persistentRect = null;        // rect to use when persistent mode is enabled

// --- existing GIF config ---
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

// Public API: turn persistent shield on/off. Optionally pass a rect {x,y,w,h} to fix position now.
// If rect omitted, last GIF rect is used or a sensible default will be computed.
function setShieldPersistent(on, rect) {
  _shieldPersistent = !!on;
  if (rect && rect.x !== undefined) {
    _persistentRect = { x: rect.x, y: rect.y, w: rect.w, h: rect.h };
  } else if (!_persistentRect && _lastGifRect) {
    _persistentRect = Object.assign({}, _lastGifRect);
  } else if (!rect && !_lastGifRect) {
    _persistentRect = null; // will be computed from default when drawing
  }
}
function isShieldPersistent() { return !!_shieldPersistent; }

// Convenience: persist shield at current last GIF position
function persistShieldAtLastGif() {
  if (_lastGifRect) setShieldPersistent(true, _lastGifRect);
  else setShieldPersistent(true, null);
}

// setter for linger
function setShieldLinger(ms) {
  const n = Number(ms);
  if (!isNaN(n) && n >= 0) SHIELD_LINGER_MS = n;
  else console.warn('setShieldLinger: expected non-negative number (ms)');
}

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
  // draw full-canvas background (fallback image stretched to canvas) or black
  if (typeof bgFallbackImage !== 'undefined' && bgFallbackImage) {
    image(bgFallbackImage, 0, 0, width, height);
  } else {
    background(0);
  }

  // CHANGED: only process/draw GIF frames if gifEnabled is true
  let currentGifRect = null;
  if (typeof gifEnabled !== 'undefined' && gifEnabled) {
    const frames = gifImgs.filter(f => f);

    if (frames.length) {
      const frameDuration = (typeof GIF_FRAME_HOLD_MS !== 'undefined' && GIF_FRAME_HOLD_MS > 0)
        ? GIF_FRAME_HOLD_MS
        : (1000 / GIF_FPS);

      const t = millis();
      const totalIndex = floor(t / frameDuration);
      const idx = totalIndex % gifImgs.length;
      const next = (idx + 1) % gifImgs.length;

      if (!USE_CROSSFADE || gifImgs.length === 1) {
        const img = gifImgs[idx];
        if (img) {
          const r = computeDrawRect(img);
          image(img, r.x, r.y, r.w, r.h);
          currentGifRect = r;
        }
      } else {
        const a = gifImgs[idx], b = gifImgs[next];
        if (a && b) {
          const progress = (t % frameDuration) / frameDuration;
          const r1 = computeDrawRect(a);
          const r2 = computeDrawRect(b);

          push();
          tint(255, 255 * (1 - progress));
          image(a, r1.x, r1.y, r1.w, r1.h);
          tint(255, 255 * progress);
          image(b, r2.x, r2.y, r2.w, r2.h);
          pop();
          noTint();

          currentGifRect = r2;
        }
      }

      if (currentGifRect) _lastGifRect = currentGifRect;
    }
  }

  // Choose base rect for shield positioning
  let baseRect;
  if (_shieldPersistent) {
    // persistent mode: prefer _persistentRect, else current/last GIF rect, else default
    baseRect = _persistentRect || currentGifRect || _lastGifRect || null;
  } else {
    // non-persistent: only use current or last GIF rect (if GIF gone and not persistent, no shield)
    baseRect = currentGifRect || _lastGifRect || null;
  }

  // if still no rect, compute a sensible default
  if (!baseRect) {
    const defaultGifHeight = height * GIF_DISPLAY_HEIGHT_RATIO;
    const defaultGifWidth = defaultGifHeight * (16/9);
    const rx = (width - defaultGifWidth) / 2;
    const ry = (height - defaultGifHeight) / 2;
    baseRect = { x: rx, y: ry, w: defaultGifWidth, h: defaultGifHeight };
  }

  // ALWAYS draw the shield if persistent OR if GIF is enabled
  if (_shieldPersistent || (typeof gifEnabled !== 'undefined' && gifEnabled)) {
    drawShieldNextToRect(baseRect);
  }
}

// draw the shield image next to the GIF rect according to SHIELD_SIDE and SHIELD_GAP
function drawShieldNextToRect(rect) {
  if (!rect || rect.w === 0 || rect.h === 0) return;

  // If shield image not loaded, attempt loading (and retry periodically if failed)
  if (!shieldImg) {
    const now = (typeof millis === 'function') ? millis() : Date.now();
    if (!shieldLoadTried || (now - _shieldLoadAttemptMillis) > SHIELD_LOAD_RETRY_MS) {
      shieldLoadTried = true;
      _shieldLoadAttemptMillis = now;
      loadImage(SHIELD_PATH,
        img => {
          shieldImg = img;
          console.log('Loaded shield:', SHIELD_PATH);
        },
        err => {
          console.warn('Failed to load shield (will retry):', SHIELD_PATH, err);
        }
      );
    }
    return;
  }

  let desiredH = (typeof height !== 'undefined') ? height * SHIELD_DISPLAY_HEIGHT_RATIO : rect.h * 0.25;
  const scale = desiredH / shieldImg.height;
  const sw = shieldImg.width * scale;
  const sh = desiredH;
  const gap = SHIELD_GAP;

  let sx;
  if (SHIELD_SIDE === 'right') {
    sx = rect.x + rect.w + gap;
    if (sx + sw > (typeof width !== 'undefined' ? width - 8 : 10000)) sx = rect.x - gap - sw;
  } else {
    sx = rect.x - gap - sw;
    if (sx < 8) sx = rect.x + rect.w + gap;
  }
  if (sx < 8) sx = 8;
  if (sx + sw > (typeof width !== 'undefined' ? width - 8 : sx + sw)) {
    if (typeof width !== 'undefined') sx = width - sw - 8;
  }

  const sy = rect.y + (rect.h - sh) / 2;

  // draw shield
  push();
  imageMode(CORNER);
  image(shieldImg, sx, sy, sw, sh);
  pop();

  // NEW: draw eyes + mouth inside the shield
  drawFaceInsideShield({ x: sx, y: sy, w: sw, h: sh });

  _shieldLastVisible = (typeof millis === 'function') ? millis() : Date.now();
  _lastShieldRect = { x: sx, y: sy, w: sw, h: sh };
}

// draw the shield image next to the GIF rect according to SHIELD_SIDE and SHIELD_GAP
// (no face/eyes/mouth drawing)
/* function drawShieldNextToRect(rect) {
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

  // compute desired height from canvas ratio
  let desiredH = height * SHIELD_DISPLAY_HEIGHT_RATIO;
  const scale = desiredH / shieldImg.height;
  const sw = shieldImg.width * scale;
  const sh = desiredH;
  const gap = SHIELD_GAP;

  // prefer left/right based on SHIELD_SIDE
  let sx;
  if (SHIELD_SIDE === 'right') {
    sx = rect.x + rect.w + gap;
    if (sx + sw > width - 8) sx = rect.x - gap - sw;
  } else {
    sx = rect.x - gap - sw;
    if (sx < 8) sx = rect.x + rect.w + gap;
  }
  if (sx < 8) sx = 8;
  if (sx + sw > width - 8) sx = width - sw - 8;

  const sy = rect.y + (rect.h - sh) / 2;

  // draw shield only (no eyes/mouth)
  push();
  imageMode(CORNER);
  image(shieldImg, sx, sy, sw, sh);
  pop();

  // update last-visible tracking
  _shieldLastVisible = millis();
  _lastShieldRect = { x: sx, y: sy, w: sw, h: sh };
} */

// draw the shield from last known rect (used for fallback/persistence)
function drawLastShield() {
  if (!shieldImg || !_lastShieldRect) return;
  const r = _lastShieldRect;
  push();
  imageMode(CORNER);
  image(shieldImg, r.x, r.y, r.w, r.h);
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

// NEW: draw centered eyes and mouth inside the shield rect
// Uses the existing drawEyes() and drawMouth() from FaceInteractions.js
function drawFaceInsideShield(shieldRect) {
  if (!shieldRect || shieldRect.w === 0 || shieldRect.h === 0) return;

  // Check if face drawing functions are available
  if (typeof drawEyes !== 'function' || typeof drawMouth !== 'function') {
    return;
  }

  // Get face data
  let faces = [];
  if (typeof getFaceLandmarks === 'function') {
    try { faces = getFaceLandmarks() || []; } catch(e) { faces = []; }
  }
  
  if (!faces || faces.length === 0) return;

  const face = faces[0];

  // Extract landmark points
  let pts = null;
  if (Array.isArray(face.scaledMesh)) pts = face.scaledMesh;
  else if (Array.isArray(face.landmarks)) pts = face.landmarks;
  else if (Array.isArray(face)) pts = face;

  if (!pts || pts.length === 0) return;

  const toXY = (p) => {
    if (Array.isArray(p)) return { x: p[0], y: p[1], z: p[2] || 0 };
    if (p && p.x !== undefined) return { x: p.x, y: p.y, z: p.z || 0 };
    return null;
  };

  // Convert all points to XY format
  const xyPts = pts.map(p => toXY(p)).filter(p => p);
  if (xyPts.length === 0) return;

  // Compute face bounding box
  const xs = xyPts.map(p => p.x);
  const ys = xyPts.map(p => p.y);
  
  const faceMinX = Math.min(...xs);
  const faceMaxX = Math.max(...xs);
  const faceMinY = Math.min(...ys);
  const faceMaxY = Math.max(...ys);
  
  // Check if coordinates are normalized (0-1 range) and convert to canvas pixels
  const isNormalized = faceMaxX <= 1.1 && faceMaxY <= 1.1;
  
  let faceMinXPixels, faceMaxXPixels, faceMinYPixels, faceMaxYPixels;
  let ptsInPixels;
  
  if (isNormalized) {
    // Convert normalized coordinates to canvas pixel coordinates
    faceMinXPixels = faceMinX * width;
    faceMaxXPixels = faceMaxX * width;
    faceMinYPixels = faceMinY * height;
    faceMaxYPixels = faceMaxY * height;
    
    // Convert all points to pixels
    ptsInPixels = xyPts.map(p => ({ x: p.x * width, y: p.y * height, z: p.z }));
  } else {
    // Already in pixel coordinates
    faceMinXPixels = faceMinX;
    faceMaxXPixels = faceMaxX;
    faceMinYPixels = faceMinY;
    faceMaxYPixels = faceMaxY;
    ptsInPixels = xyPts;
  }
  
  const faceW = Math.max(1, faceMaxXPixels - faceMinXPixels);
  const faceH = Math.max(1, faceMaxYPixels - faceMinYPixels);
  const faceCenterX = faceMinXPixels + faceW / 2;
  const faceCenterY = faceMinYPixels + faceH / 2;

  // Compute scale to fit face inside shield (with padding)
  const scaleFactor = Math.min(shieldRect.w / faceW, shieldRect.h / faceH) * 0.8;

  // Center of shield
  const shieldCenterX = shieldRect.x + shieldRect.w / 2;
  const shieldCenterY = shieldRect.y + shieldRect.h / 2;

  // Transform all points to shield coordinate space
  const transformedPts = ptsInPixels.map(p => {
    // Translate to origin (face center)
    const relX = p.x - faceCenterX;
    const relY = p.y - faceCenterY;
    
    // Scale
    const scaledX = relX * scaleFactor;
    const scaledY = relY * scaleFactor;
    
    // Translate to shield center
    return [
      shieldCenterX + scaledX,
      shieldCenterY + scaledY,
      p.z
    ];
  });

  // Create a transformed face object with scaledMesh in shield coordinates
  const transformedFace = {
    ...face,
    scaledMesh: transformedPts
  };

  // Draw eyes and mouth using transformed face data
  try {
    drawEyes(transformedFace);
    drawMouth(transformedFace);
  } catch(e) {
    console.error('Error drawing face inside shield:', e);
  }
}