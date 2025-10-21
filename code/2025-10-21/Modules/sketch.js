let things = [];
let camOffsetX = 0;
let camTargetX = 0;
let video, poseNet;
let maxCamShift = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);

  // webcam + poseNet for left/right hand tracking (guarded)
  if (typeof ml5 !== 'undefined') {
    video = createCapture(VIDEO);
    video.size(320, 240);
    video.hide();
    poseNet = ml5.poseNet(video, () => console.log('poseNet ready'));
    poseNet.on('pose', gotPoses);
  } else {
    console.warn('ml5 not available — pose tracking disabled.');
    video = null;
    poseNet = null;
  }

  maxCamShift = 0.15 * width; // max horizontal shift (15% of canvas width)

  // seed one Thing so the per-frame spawn loop has something to work from
  things.push(new Thing(width/2, height/2, '#2ea36f'));
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  maxCamShift = 0.15 * width;
}

function gotPoses(poses) {
  if (!poses || poses.length === 0) return;
  const p = poses[0].pose;

  // prefer right wrist, fallback to nose
  let keypoint = p.rightWrist;
  if (!keypoint || keypoint.confidence < 0.2) keypoint = p.nose;
  if (!keypoint || keypoint.confidence < 0.2) return;

  // map webcam x (0..video.width) to -1..1 then to -maxCamShift..+maxCamShift
  const nx = (keypoint.x / video.width) * 2 - 1;
  camTargetX = nx * maxCamShift;
}

function draw() {
  background(1,50,32);

  // smooth camera offset toward target
  camOffsetX += (camTargetX - camOffsetX) * 0.12;

  // draw all the things
  for (let i = 0; i < things.length; i++) {
    things[i].draw();
  }

  // --- spawn new things with a small offset from existing ones ---
  const cx = width / 2;
  const cy = height / 2;
  const minDim = min(width, height);

  const horizontalZone = 0.30 * height;   
  const spawnOffset = 0.05 * minDim;      // increased for more visible separation while testing
  const spawnProb = 0.15;                
  const maxThings = 10;                  

  if (things.length < maxThings) {
    const len = things.length;
    for (let i = 0; i < len && things.length < maxThings; i++) {
      if (random() < spawnProb) {
        const src = things[i];
        const srcY = ('baseY' in src) ? src.baseY : (src.y !== undefined ? src.y : height/2);
        const nx = constrain(src.x + random(-spawnOffset, spawnOffset), src.r, width - src.r);
        const ny = constrain(srcY + random(-spawnOffset, spawnOffset), src.r, height - src.r);
        const hex = (abs(ny - cy) <= horizontalZone) ? '#2ea36f' : '#f2fff8';
        things.push(new Thing(nx, ny, hex));
        // debug: remove when happy
        console.log('spawned', things.length, 'at', nx.toFixed(1), ny.toFixed(1), hex);
      }
    }
  }
}

function mousePressed() {
  const cx = width / 2;
  const cy = height / 2;
  const minDim = min(width, height);

  // how close the click must be to be considered "middle"
  const centerClickRadius = 0.05 * minDim; // 5% of smaller dimension

  // horizontal zone: +/- 30% of canvas height from the middle horizontal line
  const horizontalZone = 0.30 * height;

  if (dist(mouseX, mouseY, cx, cy) <= centerClickRadius) {
    // spawn multiple Things around the center with up to 30% offset
    const offsetMax = 0.30 * minDim; // 30% of smaller dimension
    const count = 12;
    for (let i = 0; i < count; i++) {
      const x = cx + random(-offsetMax, offsetMax);
      const y = cy + random(-offsetMax, offsetMax);
      const hex = (abs(y - cy) <= horizontalZone) ? '#2ea36f' : '#f2fff8';
      things.push(new Thing(x, y, hex));
    }
  } else {
    // single Thing at mouse position; color depends on whether it's within the horizontal zone
    const hex = (abs(mouseY - cy) <= horizontalZone) ? '#2ea36f' : '#f2fff8';
    things.push(new Thing(mouseX, mouseY, hex));
  }
}
