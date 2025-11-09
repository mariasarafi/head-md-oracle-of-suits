// the video element used by MediaPipe Camera util
let videoElement;
// if detections is null it means no hands detected
let detections = null;

// WAVE DETECTION VARIABLES--------
let isWaving = false;
let previousHandX = 0;
let handMovements = [];
const WAVE_HISTORY = 10;
//---------------------------------

// Create the Hands instance and provide a tiny init helper.
if (!window.hands) {
    window.hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });
}

// now create a local reference to the shared instance
const hands = window.hands;

const FINGER_TIPS = {
  thumb: 4,
  index: 8,
  middle: 12,
  ring: 16,
  pinky: 20
};

const HAND_CONNECTIONS = [
    // wrist to thumb
    [0, 1], [1, 2], [2, 3], [3, 4],
    // wrist to index
    [0, 5], [5, 6], [6, 7], [7, 8],
    // middle
    [0, 9], [9, 10], [10, 11], [11, 12],
    // ring
    [0, 13], [13, 14], [14, 15], [15, 16],
    // pinky
    [0, 17], [17, 18], [18, 19], [19, 20]
];

// Optional helper to set default options from one place
window.initHands = (opts = {}) => {
    const defaults = {
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5,
        selfieMode: true
    };
    window.hands.setOptions(Object.assign({}, defaults, opts));
    return window.hands;
};

// Make setupVideo available globally
// Initializing also face recognition if window.faces is defined
window.setupVideo = function(selfieMode = true) {
    
    if (typeof createCapture === 'undefined') {
        console.error('❌ createCapture is not defined! p5.js may not be loaded yet.'); // KEEP this error
        return;
    }
    
    videoElement = createCapture(VIDEO, { flipped: selfieMode });
    videoElement.size(640, 480);
    videoElement.hide();

    
    cam = new Camera(videoElement.elt, {
        onFrame: async () => {
            await hands.send({ image: videoElement.elt });
            if (window.faces) {
                await window.faces.send({ image: videoElement.elt });
            }
        },
        width: 640,
        height: 480
    });

    cam.start();
    
};

function setupHands() {
    
    hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5,
        selfieMode: true,
    });

    hands.onResults(onHandsResults);
    
}


// store the results of the hand detection
function onHandsResults(results) {
  detections = results;

  //------------WAVING-----------------------------------
  // Check for waving if hand is detected
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const landmarks = results.multiHandLandmarks[0];
    
    if (isHandOpen(landmarks)) {
      detectWaving(landmarks);
    } else {
      isWaving = false;
    }
  } else {
    isWaving = false;
  }

}


// move the videoElement && videoElement.loadedmetadata checks to here
function isVideoReady() {
    return videoElement && videoElement.loadedmetadata;
}


// ---------------------------------------HAND WAVE DETECTION-------------------------------------------------------

/**
 * Check if hand is open (all fingers extended)
 */
function isHandOpen(landmarks) {
  const fingerTips = [4, 8, 12, 16, 20];
  const fingerBases = [2, 6, 10, 14, 18];
  
  let extendedFingers = 0;
  
  for (let i = 1; i < fingerTips.length; i++) {
    const tip = landmarks[fingerTips[i]];
    const base = landmarks[fingerBases[i]];
    
    if (tip.y < base.y) {
      extendedFingers++;
    }
  }
  
  const thumbTip = landmarks[4];
  const thumbBase = landmarks[2];
  if (Math.abs(thumbTip.x - thumbBase.x) > 0.05) {
    extendedFingers++;
  }
  
  return extendedFingers >= 4;
}

/**
 * Detect waving motion
 */
function detectWaving(landmarks) {
  const wrist = landmarks[0];
  const currentX = wrist.x;
  
  const movement = currentX - previousHandX;
  handMovements.push(movement);
  
  if (handMovements.length > WAVE_HISTORY) {
    handMovements.shift();
  }
  
  if (handMovements.length >= WAVE_HISTORY) {
    let directionChanges = 0;
    let totalMovement = 0;
    
    for (let i = 1; i < handMovements.length; i++) {
      totalMovement += Math.abs(handMovements[i]);
      if ((handMovements[i] > 0 && handMovements[i-1] < 0) ||
          (handMovements[i] < 0 && handMovements[i-1] > 0)) {
        directionChanges++;
      }
    }
    
    isWaving = directionChanges >= 2 && totalMovement > 0.3;
  }
  
  previousHandX = currentX;
}

/**
 * Draw hand landmarks on canvas (without status text)
 */
function drawHandLandmarks() {
  if (!detections || !detections.multiHandLandmarks) return;
  
  push();
  
  for (let hand of detections.multiHandLandmarks) {
    // Draw connections
    stroke(0, 255, 0);
    strokeWeight(2);
    for (let connection of HAND_CONNECTIONS) {
      const start = hand[connection[0]];
      const end = hand[connection[1]];
      
      const x1 = start.x * width;
      const y1 = start.y * height;
      const x2 = end.x * width;
      const y2 = end.y * height;
      
      line(x1, y1, x2, y2);
    }
    
    // Draw landmark points
    for (let i = 0; i < hand.length; i++) {
      const landmark = hand[i];
      const x = landmark.x * width;
      const y = landmark.y * height;
      
      const isTip = Object.values(FINGER_TIPS).includes(i);
      
      fill(isTip ? color(255, 0, 0) : color(0, 255, 0));
      noStroke();
      circle(x, y, isTip ? 12 : 8);
    }
  }
  
  // Remove all the text status display
  // Only the success message in sketch.js will show when waving
  
  pop();
}

/**
 * Get wave status
 */
function getWaveStatus() {
  return isWaving;
}

/**
 * Get hand detected status
 */
function getHandDetected() {
  return detections && detections.multiHandLandmarks && detections.multiHandLandmarks.length > 0;
}