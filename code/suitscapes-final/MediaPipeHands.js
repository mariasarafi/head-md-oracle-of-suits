// the video element used by MediaPipe Camera util
let videoElement;
// if detections is null it means no hands detected
let detections = null;

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
        console.error('❌ createCapture is not defined! p5.js may not be loaded yet.');
        return;
    }
    
    videoElement = createCapture(VIDEO, { flipped: selfieMode });
    videoElement.size(640, 480);
    videoElement.hide();

    cam = new Camera(videoElement.elt, {
        onFrame: async () => {
            // Send frame to hands first (priority)
            if (hands) {
                try {
                    await hands.send({ image: videoElement.elt });
                } catch (err) {
                    console.warn('Error sending frame to hands:', err);
                }
            }
            
            // Then send to face if it exists
            if (window.face) {
                try {
                    // Check if face model has the right method
                    if (typeof window.face.send === 'function') {
                        await window.face.send({ image: videoElement.elt });
                    } else if (typeof window.face.detectForVideo === 'function') {
                        const res = await window.face.detectForVideo(videoElement.elt, performance.now());
                        if (res && typeof onFaceResults === 'function') {
                            onFaceResults(res);
                        }
                    }
                } catch (err) {
                    console.warn('Error sending frame to face:', err);
                }
            }
        },
        width: 640,
        height: 480
    });

    cam.start();
    console.log('✅ Camera started for both hands and face tracking');
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


// Store the results of the hand detection
// Wave detection is now handled in sketch.js by detectHandWaveGesture()
function onHandsResults(results) {
  detections = results;
}


// move the videoElement && videoElement.loadedmetadata checks to here
function isVideoReady() {
    return videoElement && videoElement.loadedmetadata;
}

