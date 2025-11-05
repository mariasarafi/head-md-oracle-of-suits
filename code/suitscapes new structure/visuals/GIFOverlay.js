// visuals/GIFOverlay.js
//
// GIFOverlay is responsible for drawing the looping instructional animation
// (the “gesture cue”) on top of the seasonal background.
// Each frame is a p5.Image. They are shown in sequence with a hold time.
// If no frames were provided, draw() just exits quietly.

class GIFOverlay {
  constructor(options = {}) {
    // Array of p5.Image frames for this overlay animation
    this.frames = [];

    // Timing / appearance config
    this.frameHoldMs = options.frameHoldMs ?? 500;       // ms each frame is shown
    this.useCrossfade = options.useCrossfade ?? false;   // set true if you want fade between frames

    // Layout config
    // The overlay will be scaled so its height is displayHeightRatio * canvas height.
    this.displayHeightRatio = options.displayHeightRatio ?? 0.5;
    this.allowUpscale = options.allowUpscale ?? false;
  }

  // Called by the scene when a new interaction starts.
  // framesArray = array of p5.Image objects (can be empty).
  setFrames(framesArray) {
    this.frames = (framesArray || []).filter(img => !!img);
  }

  // Draw the overlay at the center of the p5 canvas,
  // if visible == true and we actually have frames.
  draw(p, visible = true) {
    if (!visible) return;
    if (!this.frames.length) return;

    // Decide which frame(s) to draw based on timing
    const frameDuration = this.frameHoldMs > 0
      ? this.frameHoldMs
      : 1000 / 6; // fallback ~6 fps

    const t = p.millis();
    const totalIndex = Math.floor(t / frameDuration);
    const idx = totalIndex % this.frames.length;
    const next = (idx + 1) % this.frames.length;

    if (!this.useCrossfade || this.frames.length === 1) {
      // Hard cut between frames
      const r = this._computeDrawRect(p, this.frames[idx]);
      p.image(this.frames[idx], r.x, r.y, r.w, r.h);
    } else {
      // Crossfade between two frames
      const progress = (t % frameDuration) / frameDuration;
      const r1 = this._computeDrawRect(p, this.frames[idx]);
      const r2 = this._computeDrawRect(p, this.frames[next]);

      p.push();
      p.tint(255, 255 * (1 - progress));
      p.image(this.frames[idx], r1.x, r1.y, r1.w, r1.h);
      p.tint(255, 255 * progress);
      p.image(this.frames[next], r2.x, r2.y, r2.w, r2.h);
      p.pop();
      p.noTint();
    }
  }

  // Compute where/how large the overlay should be drawn.
  // We maintain aspect ratio of the source image, and center it.
  _computeDrawRect(p, img) {
    if (!img) return { x: 0, y: 0, w: 0, h: 0 };

    const iw = img.width;
    const ih = img.height;

    // Desired drawn height as a fraction of canvas height
    const desiredH = p.height * this.displayHeightRatio;
    let scale = desiredH / ih;

    // If allowUpscale is false, do not enlarge beyond 1:1
    if (!this.allowUpscale) {
      scale = Math.min(1, scale);
    }

    const w = iw * scale;
    const h = ih * scale;
    const x = (p.width - w) / 2;
    const y = (p.height - h) / 2;

    return { x, y, w, h };
  }
}

/*
// GIF-like animation from two images (replace single bgImage usage)
// Configure these two filenames (place them in Images/)
const GIF_FRAMES = [
  'Assets/Images/Jass/Jass-Summer-Joy-01.png', // change to your first image filename
  'Assets/Images/Jass/Jass-Summer-Joy-02.png'  // change to your second image filename
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

// ? stretched..... not ideal but not very visible because background images in 3:2 aspect ratio
function drawFallbackBackground() {
  // draw fallback background stretched to cover the whole canvas
  if (bgFallbackImage) {
    noTint();
    // ensure we draw over whole canvas
    image(bgFallbackImage, 0, 0, width, height);
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
*/