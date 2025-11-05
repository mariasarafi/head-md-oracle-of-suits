// Full GIFBackground.js — global-mode, no imports/exports

// explicit per-deck+season asset map (preferred). Edit paths/casing to match your files.
const DECK_SEASON_ASSETS = {
  'Jass': {
    'Summer': {
      bgPath: 'Images/Jass/Jass-Summer.png',
      gifFrames: [
        'Images/Jass/Jass-Summer-Joy-01.png',
        'Images/Jass/Jass-Summer-Joy-02.png'
      ],
      suitPath: 'Images/Jass/Jass-Summer-Shield.png',
      elementPath: 'Images/Summer-Water.png'
    },
    'Spring': {
      bgPath: 'Images/Jass/Jass-Spring.png',
      gifFrames: [
        'Images/Jass/Jass-Spring-Joy-01.png',
        'Images/Jass/Jass-Spring-Joy-02.png'
      ],
      suitPath: 'Images/Jass/Jass-Spring-Rose.png',
      elementPath: 'Images/Spring-Fire.png'
    },
    'Autumn': {
      bgPath: 'Images/Jass/Jass-Autumn.png',
      gifFrames: [
        'Images/Jass/Jass-Autumn-Sadness-01.png',
        'Images/Jass/Jass-Autumn-Sadness-02.png'
      ],
      suitPath: 'Images/Jass/Jass-Autumn-Shield.png',
      elementPath: 'Images/Autumn-Earth.png'
    },
    'Winter': {
      bgPath: 'Images/Jass/Jass-Winter.png',
      gifFrames: [
        'Images/Jass/Jass-Winter-Anger-01.png',
        'Images/Jass/Jass-Winter-Anger-02.png'
      ],
      suitPath: 'Images/Jass/Jass-Winter-Bell.png',
      elementPath: 'Images/Elements/Winter-Air.png'
    }
  }
};

// runtime state (globals)
let currentDeck = null;
let currentSeason = null;

let bgFallbackImage = null; // full-canvas background image
let gifImgs = [];           // array of p5.Image for GIF frames
let suitImg = null;         // deck+season suit/shield
let elementImg = null;      // season-only element

// controls / options
let GIF_DISPLAY_HEIGHT_RATIO = 1 / 2;
const GIF_ALLOW_UPSCALE = false;
const GIF_FPS = 6;
const GIF_FRAME_HOLD_MS = 500;
const USE_CROSSFADE = false;

// Helper: try candidates sequentially until one loads
function tryLoadImageCandidates(candidates, onSuccess, onFail, idx = 0) {
  if (!candidates || idx >= candidates.length) {
    if (typeof onFail === 'function') onFail();
    return;
  }
  const path = candidates[idx];
  loadImage(path,
    img => { if (typeof onSuccess === 'function') onSuccess(img, path); },
    err => { tryLoadImageCandidates(candidates, onSuccess, onFail, idx + 1); }
  );
}

// Helper: generate candidate filenames from deck/season (fallback heuristic)
function makeCandidates(deck, season, basenameVariants = [], suffixVariants = []) {
  const deckLower = String(deck || '').toLowerCase();
  const deckCap = String(deck || '');
  const seasonLower = String(season || '').toLowerCase();
  const seasonCap = String(season || '');
  const candidates = [];

  const patterns = [
    '{deck}/{deck}-{season}.png',
    '{deck}/{deck}-{season}-back.png',
    '{deck}/{deck}-{season}-Back.png',
    '{deck}/{deck}-{season}-Joy-01.png',
    '{deck}/{deck}-{season}-Joy-02.png',
    '{deck}/jass-{season}.png',
    '{deck}/jass-{season}-Back.png',
    '{deck}/Jass-{season}.png',
    '{deck}/{deck}-{season}-Shield.png',
    '{deck}/{deck}-{season}-shield.png',
    '{deck}/Jass-{season}-Shield.png',
    'Images/{deck}/{deck}-{season}.png',
    'Images/{deck}/{deck}-{season}-Shield.png'
  ];

  patterns.forEach(p => {
    candidates.push(p.replace('{deck}', deck).replace('{season}', season));
    candidates.push(p.replace('{deck}', deckLower).replace('{season}', seasonLower));
    candidates.push(p.replace('{deck}', deckCap).replace('{season}', seasonCap));
  });

  basenameVariants.forEach(b => {
    suffixVariants.forEach(suf => {
      candidates.push(`Images/${deck}/${b}${suf}`);
    });
  });

  return [...new Set(candidates)];
}

// Public: set deck + season (opts override mapping). Loads assets lazily.
function setDeckSeason(deck, season, opts = {}) {
  currentDeck = deck;
  currentSeason = season;

  bgFallbackImage = null;
  gifImgs = [];
  suitImg = null;
  elementImg = null;

  const mapping = (DECK_SEASON_ASSETS[deck] && DECK_SEASON_ASSETS[deck][season]) ? DECK_SEASON_ASSETS[deck][season] : null;
  const finalOpts = Object.assign({}, mapping || {}, opts);

  // background
  if (finalOpts.bgPath) {
    loadImage(finalOpts.bgPath, img => { bgFallbackImage = img; }, () => { console.warn('bg failed', finalOpts.bgPath); });
  } else {
    const bgCandidates = makeCandidates(deck, season);
    tryLoadImageCandidates(bgCandidates,
      img => { bgFallbackImage = img; },
      () => { console.warn('No background candidate found for', deck, season); }
    );
  }

  // gif frames
  if (Array.isArray(finalOpts.gifFrames) && finalOpts.gifFrames.length) {
    gifImgs = new Array(finalOpts.gifFrames.length).fill(null);
    finalOpts.gifFrames.forEach((p, i) => {
      loadImage(p, img => { gifImgs[i] = img; }, err => { console.warn('GIF frame failed to load', p, err); });
    });
  } else {
    // try two standard frames
    const frame1Candidates = makeCandidates(deck, season, [], ['-Joy-01.png', 'Joy-01.png', '-01.png']);
    const frame2Candidates = makeCandidates(deck, season, [], ['-Joy-02.png', 'Joy-02.png', '-02.png']);
    gifImgs = [null, null];
    tryLoadImageCandidates(frame1Candidates, img => { gifImgs[0] = img; }, () => { console.warn('No GIF frame1 found for', deck, season); });
    tryLoadImageCandidates(frame2Candidates, img => { gifImgs[1] = img; }, () => { console.warn('No GIF frame2 found for', deck, season); });
  }

  // suit/shield
  if (finalOpts.suitPath) {
    loadImage(finalOpts.suitPath, img => { suitImg = img; }, () => { console.warn('suit failed', finalOpts.suitPath); });
  } else {
    const suitCandidates = makeCandidates(deck, season);
    tryLoadImageCandidates(suitCandidates, img => { suitImg = img; }, () => { console.warn('No suit candidate found for', deck, season); });
  }

  // element (season-only) override or common variants
  if (finalOpts.elementPath) {
    loadImage(finalOpts.elementPath, img => { elementImg = img; }, () => { console.warn('element failed', finalOpts.elementPath); });
  } else {
    const eltCandidates = [
      `Images/Elements/${season}.png`,
      `Images/Elements/${season}-element.png`,
      `Images/Elements/${season}-Element.png`,
      `Images/${deck}/${deck}-${season}-Element.png`,
      `Images/Jass/Jass-${season}-Shield.png`,
      `Images/Jass/jass-${season}-shield.png`
    ];
    tryLoadImageCandidates(eltCandidates, img => { elementImg = img; }, () => { /* optional */ });
  }

  console.log('setDeckSeason called', deck, season, finalOpts);
}

// draw full background stretched
function drawFallbackBackground() {
  if (bgFallbackImage) {
    noTint();
    image(bgFallbackImage, 0, 0, width, height);
  } else {
    background(0);
  }
}

// compute rectangle preserving aspect ratio; height == canvas * GIF_DISPLAY_HEIGHT_RATIO
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

// draw the centered GIF frames + suit + element
function drawGifBackground() {
  // draw background first
  if (bgFallbackImage) {
    image(bgFallbackImage, 0, 0, width, height);
  } else {
    background(0);
  }

  const frames = gifImgs.filter(f => f);
  if (!frames.length) return;

  const frameDuration = (typeof GIF_FRAME_HOLD_MS !== 'undefined' && GIF_FRAME_HOLD_MS > 0)
    ? GIF_FRAME_HOLD_MS
    : (1000 / GIF_FPS);

  const t = millis();
  const totalIndex = floor(t / frameDuration);
  const idx = totalIndex % gifImgs.length;
  const next = (idx + 1) % gifImgs.length;

  if (!USE_CROSSFADE || gifImgs.length === 1) {
    const img = gifImgs[idx];
    if (!img) return;
    const r = computeDrawRect(img);
    image(img, r.x, r.y, r.w, r.h);
    drawSuitNextToRect(r);
    drawElementAtCorner(r);
  } else {
    const progress = (t % frameDuration) / frameDuration;
    const a = gifImgs[idx], b = gifImgs[next];
    if (!a || !b) return;
    const r1 = computeDrawRect(a);
    const r2 = computeDrawRect(b);

    push();
    tint(255, 255 * (1 - progress));
    image(a, r1.x, r1.y, r1.w, r1.h);
    tint(255, 255 * progress);
    image(b, r2.x, r2.y, r2.w, r2.h);
    pop();
    noTint();

    drawSuitNextToRect(r2);
    drawElementAtCorner(r2);
  }
}

// draw suit/shield image to right (or left) of rect
function drawSuitNextToRect(rect) {
  if (!rect || rect.w === 0 || rect.h === 0) return;
  if (!suitImg) return;

  const desiredH = rect.h * 0.6;
  const scale = desiredH / suitImg.height;
  const sw = suitImg.width * scale;
  const sh = desiredH;
  const gap = 18;

  let sx = rect.x + rect.w + gap;
  if (sx + sw > width - 8) sx = rect.x - gap - sw;
  if (sx < 8) sx = 8;
  const sy = rect.y + (rect.h - sh) / 2;

  push();
  imageMode(CORNER);
  image(suitImg, sx, sy, sw, sh);
  pop();
}

// draw element image near GIF (top-right preferred, fallback to other positions)
function drawElementAtCorner(rect) {
  if (!elementImg) return;

  const scale = (rect.h * 0.25) / elementImg.height;
  const ew = elementImg.width * scale;
  const eh = elementImg.height * scale;
  let ex = rect.x + rect.w + 12;
  let ey = rect.y - eh - 12;
  if (ey < 8) ey = rect.y + rect.h + 12;
  if (ex + ew > width - 8) ex = rect.x - ew - 12;
  if (ex < 8) ex = 8;

  push();
  imageMode(CORNER);
  image(elementImg, ex, ey, ew, eh);
  pop();
}

// convenience: expose defaults (optional)
// setDeckSeason('Jass','Spring');




// convenience: initialize with defaults if you want
// setDeckSeason('Jass','Summer');

// GIF-like animation from two images (replace single bgImage usage)
// Configure these two filenames (place them in Images/)
/*const GIF_FRAMES = [
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
} */