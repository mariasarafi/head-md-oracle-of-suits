// ...existing code...
let img1, img2;

// vertical animation state
let offset1 = 0;
let offset2 = 0;
let amp1 = 80;    // amplitude in pixels for left image (global vertical)
let amp2 = 120;   // amplitude in pixels for right image (global vertical)
let speed1 = 0.02; // speed multiplier for left image (global vertical)
let speed2 = 0.015; // speed multiplier for right image (global vertical)

// wavy effect parameters
let waveAmp1 = 24;     // wave amplitude for left image (pixels)
let waveAmp2 = 32;     // wave amplitude for right image (pixels)
let waveFreq1 = 0.02;  // spatial frequency for left image
let waveFreq2 = 0.018; // spatial frequency for right image
let waveSpeed1 = 0.06; // temporal speed left
let waveSpeed2 = 0.05; // temporal speed right
let sliceW = 6;        // width of vertical slices used to draw the wavy effect

function preload() {
    // Images folder is expected at Test/Images
    img1 = loadImage('Images/Image-01.png');
    img2 = loadImage('Images/Image-02.png');
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    imageMode(CORNER);
    // we animate continuously
    // noLoop() removed
}

function draw() {
    // update offsets using sine for smooth up/down motion
    offset1 = amp1 * sin(frameCount * speed1);
    offset2 = amp2 * sin(frameCount * speed2 + PI/6); // slight phase offset

    drawSplits();
}

function drawSplits() {
    // fill background with black
    background(0);
    const halfW = width / 2;

    // left image: global vertical offset + wavy per-slice offset
    if (img1) {
        drawWavyImage(img1, 0, offset1, halfW, height, waveAmp1, waveFreq1, waveSpeed1, 0);
    }

    // right image: global vertical offset + wavy per-slice offset
    if (img2) {
        drawWavyImage(img2, halfW, offset2, halfW, height, waveAmp2, waveFreq2, waveSpeed2, PI/3);
    }
}

/**
 * Draw an image stretched into a rectangle (x,y,w,h) with a horizontal-sliced vertical wave.
 * Uses image(img, dx, dy, dWidth, dHeight, sx, sy, sWidth, sHeight) to draw slices efficiently.
 */
function drawWavyImage(img, dx, dy, dw, dh, amp, freq, speed, phase = 0) {
    // scale factor from destination width to source width
    const sxFactor = img.width / dw;
    // ensure sliceW is not larger than dw
    const sW = max(1, min(sliceW, floor(dw)));
    for (let x = 0; x < dw; x += sW) {
        const destX = dx + x;
        // spatial position for wave
        const wave = amp * sin((x * freq) + (frameCount * speed) + phase);
        const destY = dy + wave;
        // source rectangle corresponding to this vertical slice
        const srcX = floor(x * sxFactor);
        const srcW = ceil(sW * sxFactor);
        // draw slice scaled to slice width and full height (source full height)
        image(img, destX, destY, sW, dh, srcX, 0, srcW, img.height);
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    // keep animated drawing on resize
    drawSplits();
}
// ...existing code...