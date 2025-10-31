// GIF-like animation from two images (replace single bgImage usage)
// Configure these two filenames (place them in Images/)
const GIF_FRAMES = [
  'Images/Jass/Jass-Summer-Joy-01.png', // change to your first image filename
  'Images/Jass/Jass-Summer-Joy-02.png'  // change to your second image filename
];

let gifImgs = [];
const GIF_FPS = 6;          // frames per second for the GIF
const USE_CROSSFADE = false; // set false for hard cut between frames
// control how long each frame is shown (ms). Set to 2000 for 2 seconds per frame.
const GIF_FRAME_HOLD_MS = 500; // <-- change this value for longer/shorter interval

// Fraction of canvas height to use for the GIF frames (e.g. 1/3)
let GIF_DISPLAY_HEIGHT_RATIO = 1 / 2; // change this to e.g. 0.25 or 0.4 to control size
const GIF_ALLOW_UPSCALE = false; // set true if you want small images to be scaled up to the target height

// drawGifBackground: draw full background first, then draw centered GIF frames at target height
function drawGifBackground() {
  const frames = gifImgs.filter(f => f);

  // draw full-canvas background (fallback image stretched to canvas) or black
  if (bgFallbackImage) {
    image(bgFallbackImage, 0, 0, width, height);
  } else {
    background(0);
  }

  if (!frames.length) return; // nothing to draw for GIF frames

  const frameDuration = (typeof GIF_FRAME_HOLD_MS !== 'undefined' && GIF_FRAME_HOLD_MS > 0)
    ? GIF_FRAME_HOLD_MS
    : (1000 / GIF_FPS);

  const t = millis();
  const totalIndex = floor(t / frameDuration);
  const idx = totalIndex % frames.length;
  const next = (idx + 1) % frames.length;

  if (!USE_CROSSFADE || frames.length === 1) {
    const r = computeDrawRect(frames[idx]);
    image(frames[idx], r.x, r.y, r.w, r.h);
  } else {
    const progress = (t % frameDuration) / frameDuration; // 0..1 across the hold period
    const r1 = computeDrawRect(frames[idx]);
    const r2 = computeDrawRect(frames[next]);

    push();
    tint(255, 255 * (1 - progress));
    image(frames[idx], r1.x, r1.y, r1.w, r1.h);
    tint(255, 255 * progress);
    image(frames[next], r2.x, r2.y, r2.w, r2.h);
    pop();
    noTint();
  }
}

// draw fallback background (centered image or solid black)
function drawFallbackBackground() {
  if (bgFallbackImage) {
    const iw = bgFallbackImage.width;
    const ih = bgFallbackImage.height;
    const scale = min(1, min(width / iw, height / ih));
    const w = iw * scale;
    const h = ih * scale;
    const x = (width - w) / 2;
    const y = (height - h) / 2;
    background(0);
    image(bgFallbackImage, x, y, w, h);
  } else {
    background(0);
  }
}

// compute draw rect so image height == canvas * GIF_DISPLAY_HEIGHT_RATIO (preserving aspect ratio)
function computeDrawRect(img) {
  if (!img) return { x: 0, y: 0, w: 0, h: 0 };
  const iw = img.width;
  const ih = img.height;

  // desired draw height based on ratio
  const desiredH = height * GIF_DISPLAY_HEIGHT_RATIO;
  // scale to make drawn height equal desiredH; optionally prevent upscaling
  let scale = desiredH / ih;
  if (!GIF_ALLOW_UPSCALE) scale = min(1, scale);

  const w = iw * scale;
  const h = ih * scale;
  const x = (width - w) / 2;
  const y = (height - h) / 2;
  return { x, y, w, h };
}
