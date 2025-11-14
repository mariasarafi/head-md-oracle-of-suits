// ==================== GLOBAL VARIABLES ====================

// Image Arrays
let suitImages = [];
let mouthImages = [];
let cardImages = [];
let imagesLoaded = false;

// Suit Rotation
let rotationAngle = 0;

// Suit Introduction Sequence
let suitIntroActive = false;
let suitIntroStartTime;
let currentIntroSuitIndex = 0;
let shakeOffsetX = 0;
let shakeOffsetY = 0;
let introductionsComplete = false;

// Center Messages
let centerMessage = null;
let centerMessageStartTime;

// Falling Cards System
let cardsFallingActive = false;
let cardsFallingStartTime = 0;
let fallingCards = [];
let lastCardSpawnTime = 0;

// Mouth Tracking
let trackUserMouth = false;
let smoothedMouthOpening = 0;
let smoothedMouthWidth = 0;
let smoothedMouthCenterY = 0;

// Audio
let seasonAudio = {};
let soundStarted = false;

// Wave Detection
let waveHelloImage;
let waveDetected = false;
let handWaveHistory = [];
let lastHandWaveDetectionTime = 0;

// UI Toggles
let handTrackingEnabled = false;
let showMouthLandmarks = true;

// Add these to your global variables section (around line 32)
let smoothedSmileIntensity = 0;
//let faceBlendshapes = null;

let isCalibratingSmile = true;
let smileCalibrationFrames = 60; // Number of frames to calibrate
let smileCalibrationCount = 0;
let smileCalibrationSum = 0;

// add global for intro logo
let introLogoImage = null;

let introCloudsImage = null;
let levelCloudSuitsImage = null;

// add near globals
let imagesSanitized = false;

// global: control whether the intro/logo is shown in center
let introLogoVisible = true;

let seasonMessage = null; // { deckIndex, text, startTime, duration }
let seasonFollowup = null; // follow-up central message
const SEASON_MESSAGE_DEFAULT_DURATION = 3500;

// Timing constants for detection / messaging
const DETECT_MESSAGE_DURATION = 1200; // ms for "Detected: <Emotion>"
const SEASON_MESSAGE_DELAY = 300;     // ms gap before suit speaks
const FOLLOWUP_DELAY = 200;           // ms gap after suit speaks before season entry message

// ==================== PRELOAD ====================

function preload() {
   // Load Wave Hello image
  waveHelloImage = loadImage('Images/Wave-Hello.png');
  
  // Load all season audio files
  const seasons = Object.keys(SEASON_AUDIO);
  for (let season of seasons) {
    const audioConfig = SEASON_AUDIO[season];
    seasonAudio[season] = loadSound(
      audioConfig.file,
      null,
      (err) => console.error(`✗ Failed to load ${audioConfig.name} audio:`, err)
    );
  }

  // load the suitscapes intro logo (place file under Images/)
  introLogoImage = loadImage('Images/suitscapes-intro-logo-contrast.png', 
    (img) => { introLogoImage = img; },
    (err) => { /* ignore load error */ }
  );

  // load the suitscapes intro clouds background
  introCloudsImage = loadImage(
    'Images/suitscapes-intro-clouds.jpg',
    (img) => { introCloudsImage = img; },
    (err) => { /* ignore load error */ }
  );

  // load the suitscapes level clouds with suits background
  levelCloudSuitsImage = loadImage(
    'Images/suitslandscape.jpg',
    (img) => { levelCloudSuitsImage = img; },
    (err) => { /* ignore load error */ }
  );

  let loadedCount = 0;
  
  /// Calculate total images to load
  let totalCardImages = 0;
  for (let d = 0; d < DECKS.length; d++) {
    if (DECKS[d].cards) {
      totalCardImages += DECKS[d].cards.length;
    }
  }

  // suit images + mouth images
  const totalImages = (4 * 2) + totalCardImages; // (suits + mouths) + cards
  
  // Load one suit from each deck where sorder matches deck order
  for (let d = 0; d < DECKS.length; d++) {
    const deck = DECKS[d];
    const suit = deck.suits.find(s => s.sorder === deck.order);
    
    if (suit) {
      // ✅ Load suit image
      loadImage(
        suit.image,
        (img) => {
          img.suitData = suit;
          suitImages[d] = img;
          loadedCount++;
          if (loadedCount === totalImages) {
            imagesLoaded = true;
          }
        },
        (err) => {
          console.error(`Failed to load suit: ${suit.name} from ${deck.name}`, err);
          suitImages[d] = null;
          loadedCount++;
          if (loadedCount === totalImages) {
            imagesLoaded = true;
          }
        }
      );
      
      // ✅ Load mouth image for this suit
      loadImage(
        suit.mouth,
        (mouthImg) => {
          mouthImages[d] = mouthImg;
          loadedCount++;
          if (loadedCount === totalImages) {
            imagesLoaded = true;
          }
        },
        (err) => {
          console.error(`Failed to load mouth: ${suit.name} from ${deck.name}`, err);
          mouthImages[d] = null;
          loadedCount++;
          if (loadedCount === totalImages) {
            imagesLoaded = true;
          }
        }
      );
    }
  }
  
  // Load card images from ALL 4 decks
  let cardIndex = 0;
  for (let d = 0; d < DECKS.length; d++) {
    const currentDeck = DECKS[d];
    
    if (currentDeck.cards && Array.isArray(currentDeck.cards)) {
      for (let i = 0; i < currentDeck.cards.length; i++) {
        const cardPath = currentDeck.cards[i];
        const currentCardIndex = cardIndex;
        
        loadImage(
          cardPath,
          (img) => {
            cardImages[currentCardIndex] = img;
            loadedCount++;
            if (loadedCount === totalImages) {
              imagesLoaded = true;
            }
          },
          (err) => {
            console.error(`✗ Failed to load card ${currentCardIndex}: ${cardPath}`, err);
            cardImages[currentCardIndex] = null;
            loadedCount++;
            if (loadedCount === totalImages) {
              imagesLoaded = true;
            }
          }
        );
        cardIndex++;
      }
    } else {
      console.warn(`Deck ${currentDeck.name} has no cards array`);
    }
  }
}

// ==================== SETUP ====================

async function setup() {
  createCanvas(windowWidth, windowHeight);
  imageMode(CENTER);
  angleMode(RADIANS);
  
  // remove any CSS filters / blend modes that might tint the canvas in preview environments
  setTimeout(() => {
    const cnv = document.querySelector('canvas');
    if (cnv) {
      cnv.style.filter = 'none';
      cnv.style.mixBlendMode = 'normal';
      cnv.style.background = 'transparent';
      cnv.style.opacity = '1';
      cnv.style.mixBlendMode = 'normal';
    }
    // also clear obvious parent/background styling
    if (document.body) {
      document.body.style.background = '';
      document.body.style.filter = '';
    }
  }, 50);

  // start video / hands / face detection without verbose startup logs
  setupVideo(true);
  setupHands();
  setupFaceDetection().catch(() => { /* face detection failed or handled elsewhere */ });

  // initialize UI/animation state
  cardsFallingActive = true;
  cardsFallingStartTime = millis();
  lastCardSpawnTime = millis();

  // load any saved calibrations and start missing calibrations
  loadMouthCalibrations();
  ensureMouthCalibrations();

  // schedule sanitize once images are loaded — run outside draw to avoid a sudden hitch inside the frame loop
  /*const waitAndSanitize = () => {
    if (imagesLoaded) {
      // small timeout lets the browser finish any pending rendering before heavy copy
      setTimeout(() => { sanitizeImages(); }, 30);
    } else {
      const iv = setInterval(() => {
        if (imagesLoaded) {
          clearInterval(iv);
          setTimeout(() => { sanitizeImages(); }, 30);
        }
      }, 150);
    }
  };
  waitAndSanitize();*/
}

// ==================== MAIN DRAW LOOP ====================
function draw() {
  // reset any lingering p5 image/compositing state
 /* noTint();
  tint(255);
  blendMode(BLEND);
  noFill();
  noStroke();*/

  // base clear (will be immediately covered by background images)
  background(255);

  // wait for assets
  if (!imagesLoaded) {
    push();
    fill(0);
    textSize(24);
    textAlign(CENTER, CENTER);
    text('Loading images...', width / 2, height / 2);
    pop();
    return;
  }

  // show transient centerMessage if set
  if (centerMessage && typeof centerMessageStartTime === 'number') {
    const dur = centerMessage.displayDuration || DETECT_MESSAGE_DURATION;
    if (millis() - centerMessageStartTime < dur) {
      drawCenterMessage(centerMessage, 36, null, 80);
    } else {
      centerMessage = null;
      centerMessageStartTime = null;
    }
  }

  // update global rotation for suits
  rotationAngle += (CONFIG && CONFIG.rotationSpeed) ? CONFIG.rotationSpeed : 0;

  // LAYER 1: Background
  if (waveDetected) {
    // stop card spawning once wave detected
    cardsFallingActive = false;

    // ensure no lingering tint/fill/blend affects the full-canvas background
    noTint();
    noFill();
    blendMode(BLEND);
    strokeWeight(0);

    push();
    imageMode(CORNER);

    if (levelCloudSuitsImage) {
      image(levelCloudSuitsImage, 0, 0, width, height);
    } else if (introCloudsImage) {
      image(introCloudsImage, 0, 0, width, height);
    } else {
      // fallback to plain white
      background(255);
    }

    pop();
  } else {
    // before wave: draw intro clouds as background behind falling cards
    noTint();
    noFill();
    blendMode(BLEND);
    strokeWeight(0);

    if (introCloudsImage) {
      push();
      imageMode(CORNER);
      image(introCloudsImage, 0, 0, width, height);
      pop();
    } else {
      background(255);
    }

    // then draw falling cards on top
    if (cardsFallingActive) {
      push();
      tint(255, (CONFIG && CONFIG.cardOpacity) ? CONFIG.cardOpacity : 255);
      updateAndDrawFallingCards();
      pop();
    }
  }

  // LAYER 2: suits + (intro logo currently may be drawn inside drawDeckSuitsInCircle)
  drawDeckSuitsInCircle();

  // If a suit should announce a season entry, draw that message beside the suit
  if (seasonMessage) {
    drawSeasonEntryMessage();
  }

  // draw scheduled follow-up (centered) season entry message if it's time
  if (seasonFollowup) {
    drawSeasonFollowupMessage();
  }

  // BEFORE WAVE DETECTION: detect the wave to start intro
  if (!waveDetected) {
    if (typeof detectHandWaveGesture === 'function') {
      try {
        if (detectHandWaveGesture()) {
          waveDetected = true;
          suitIntroActive = true;
          suitIntroStartTime = millis();
          currentIntroSuitIndex = 0;
        }
      } catch (e) {
        // ignore detection errors
      }
    }
  }

  // SUIT INTRODUCTIONS (LAYER 3)
  if (suitIntroActive) {
    const elapsed = millis() - suitIntroStartTime;

    if (currentIntroSuitIndex < 4) {
      displaySuitIntroMessage(currentIntroSuitIndex, elapsed);

      if (elapsed >= (CONFIG && CONFIG.SuitIntroDuration ? CONFIG.SuitIntroDuration : 2000)) {
        currentIntroSuitIndex++;
        suitIntroStartTime = millis();

        if (currentIntroSuitIndex >= 4) {
          suitIntroActive = false;
          introductionsComplete = true;

          // enable mouth landmarks and start delayed enabling of tracking
          showMouthLandmarks = true;
          mouthEnableStartTime = millis();

          // hide intro logo once introductions complete (prevents future draws)
          introLogoVisible = false;
          introLogoImage = null;
        }
      }
    }
  }

  // enable mouth tracking after intro delay (no central UI message)
  if (introductionsComplete) {
    if (typeof mouthEnableStartTime === 'undefined') mouthEnableStartTime = millis();
    if (millis() - mouthEnableStartTime > (CONFIG && CONFIG.initialMessageDelay ? CONFIG.initialMessageDelay : 800)) {
      trackUserMouth = true;
      introductionsComplete = false; // run once
    }
  }

  // LAYER 5: hand landmarks (only before wave)
  if (handTrackingEnabled && !waveDetected && typeof drawHandLandmarks === 'function') {
    drawHandLandmarks();
  }

  // If logo visibility has been explicitly turned off ensure it's cleared before mouth drawing
  if (!introLogoVisible) {
    introLogoImage = null;
  }

  // LAYER 6: mouth tracking & emotion detection
  if (showMouthLandmarks && trackUserMouth) {
    if (typeof drawMouthLandmarks === 'function') {
      drawMouthLandmarks();
    }

    let faces = null;
    if (typeof getFaceLandmarks === 'function') {
      try { faces = getFaceLandmarks(); } catch (e) { faces = null; }
    }

    if (faces && faces.length && typeof stepMouthCalibrations === 'function') {
      stepMouthCalibrations();
    }

    const calibratingSmile = (typeof isCalibrating === 'function') ? isCalibrating('smile') : isCalibratingSmile;

    if (calibratingSmile) {
      push();
      fill(0);
      textAlign(CENTER, CENTER);
      textSize(20);
      text('Calibrating smile — please keep a neutral face', width / 2, height * 0.85);
      pop();
    } else {
      // detect kiss first
      let detectedInteraction = null;
      let kScore = 0;
      if (typeof updateKiss === 'function' && faces && faces.length) {
        try { kScore = updateKiss(); } catch (e) { kScore = 0; }
        const kThresh = (typeof KISS_THRESH !== 'undefined') ? KISS_THRESH : 0.55;
        if (kScore > kThresh) {
          detectedInteraction = 'kiss';
          // show detected center message
          centerMessage = `Detected: Kiss`;
          centerMessageStartTime = millis();
          centerMessage.displayDuration = DETECT_MESSAGE_DURATION;
          if (typeof onKiss === 'function') try { onKiss(kScore); } catch (e) {}
        }
      }

      // if not kiss, compute emotion scores
      if (!detectedInteraction && faces && faces.length) {
        let sScore = 0, sadScore = 0, angerScore = 0;

        if (typeof updateSmile === 'function') {
          try { sScore = updateSmile(); } catch (e) { sScore = 0; }
        }
        if (typeof updateSadness === 'function') {
          try { sadScore = updateSadness(); } catch (e) { sadScore = 0; }
        }
        if (typeof updateAnger === 'function') {
          try { angerScore = updateAnger(); } catch (e) { angerScore = 0; }
        }

        const sThresh = (typeof SMILE_THRESH !== 'undefined') ? SMILE_THRESH : 0.5;
        const sadThresh = (typeof SADNESS_THRESH !== 'undefined') ? SADNESS_THRESH : 0.32;
        const angerThresh = (typeof ANGER_ENTRY !== 'undefined') ? ANGER_ENTRY : 0.45;
        const margin = 1.2;

        if (angerScore > angerThresh && angerScore > sScore * margin && angerScore > sadScore * margin) {
          detectedInteraction = 'anger';
          centerMessage = `Detected: Anger`;
          centerMessageStartTime = millis();
          centerMessage.displayDuration = DETECT_MESSAGE_DURATION;
          if (typeof onAnger === 'function') try { onAnger(angerScore); } catch (e) {}
        } else if (sScore > sThresh && sScore > sadScore * margin && sScore > angerScore * margin) {
          detectedInteraction = 'smile';
          centerMessage = `Detected: Smile`;
          centerMessageStartTime = millis();
          centerMessage.displayDuration = DETECT_MESSAGE_DURATION;
          if (typeof onSmile === 'function') try { onSmile(sScore); } catch (e) {}
        } else if (sadScore > sadThresh && sadScore > sScore * margin && sadScore > angerScore * margin) {
          detectedInteraction = 'sadness';
          centerMessage = `Detected: Sadness`;
          centerMessageStartTime = millis();
          centerMessage.displayDuration = DETECT_MESSAGE_DURATION;
          if (typeof onSadness === 'function') try { onSadness(sadScore); } catch (e) {}
        } else {
          // fallback via hysteresis flags
          if (typeof updateAnger === 'function' && updateAnger._active && !(updateSmile && updateSmile._active) && !(updateSadness && updateSadness._active)) {
            detectedInteraction = 'anger';
            centerMessage = `Detected: Anger`;
            centerMessageStartTime = millis();
            centerMessage.displayDuration = DETECT_MESSAGE_DURATION;
            if (typeof onAnger === 'function') try { onAnger(updateAnger()); } catch (e) {}
          } else if (typeof updateSadness === 'function' && updateSadness._active && !(updateSmile && updateSmile._active)) {
            detectedInteraction = 'sadness';
            centerMessage = `Detected: Sadness`;
            centerMessageStartTime = millis();
            centerMessage.displayDuration = DETECT_MESSAGE_DURATION;
            if (typeof onSadness === 'function') try { onSadness(updateSadness()); } catch (e) {}
          } else if (typeof updateSmile === 'function' && updateSmile._active) {
            detectedInteraction = 'smile';
            centerMessage = `Detected: Smile`;
            centerMessageStartTime = millis();
            centerMessage.displayDuration = DETECT_MESSAGE_DURATION;
            if (typeof onSmile === 'function') try { onSmile(updateSmile()); } catch (e) {}
          }
        }
      }

      // when interaction detected: schedule suit message and followup season entry
      if (detectedInteraction) {
        const friendly = { kiss: 'Kiss', smile: 'Smile', sadness: 'Sadness', anger: 'Anger' };
        const emotionLabel = friendly[detectedInteraction] || String(detectedInteraction);

        // Determine timing defaults
        const detectDur = DETECT_MESSAGE_DURATION;
        const suitDelay = SEASON_MESSAGE_DELAY;
        const suitDur = SEASON_MESSAGE_DEFAULT_DURATION;
        const followDelay = FOLLOWUP_DELAY;

        // Suit-side message: "You feel <Emotion>"
        const deckIndex = findDeckIndexForInteraction(detectedInteraction);
        const suitText = `You feel ${emotionLabel}`;
        seasonMessage = {
          deckIndex: (deckIndex >= 0) ? deckIndex : null,
          text: suitText,
          startTime: millis() + detectDur + suitDelay,
          duration: suitDur
        };

        // Follow-up central "You can now enter <Season>"
        const seasonName = (deckIndex >= 0) ? (getSeasonForDeck(deckIndex) || 'the season') : emotionLabel;
        seasonFollowup = {
          text: `You can now enter ${seasonName}`,
          startTime: seasonMessage.startTime + seasonMessage.duration + followDelay,
          duration: suitDur
        };

        // still call user hooks if present
        try { if (detectedInteraction === 'kiss' && typeof onKiss === 'function') onKiss(); } catch(e) {}
        try { if (detectedInteraction === 'smile' && typeof onSmile === 'function') onSmile(); } catch(e) {}
        try { if (detectedInteraction === 'sadness' && typeof onSadness === 'function') onSadness(); } catch(e) {}
        try { if (detectedInteraction === 'anger' && typeof onAnger === 'function') onAnger(); } catch(e) {}
      }
    }
  }
}

// ==================== AUDIO ====================

/**
 * Start all sounds on first user interaction
 */
function mousePressed() {
  if (!soundStarted) {
    userStartAudio();
    const seasons = Object.keys(SEASON_AUDIO);
    for (let season of seasons) {
      const audioConfig = SEASON_AUDIO[season];
      const sound = seasonAudio[season];
      
      if (sound && sound.isLoaded()) {
        sound.loop();
        sound.setVolume(audioConfig.volume);
        sound.rate(audioConfig.rate);
      }
    }
    
    soundStarted = true;
  }
}

/**
 * Start audio on any key press
 */
function keyPressed() {
  // Toggle hand-landmarks with 'H' and show brief on-screen feedback
  if (key === 'h' || key === 'H') {
    handTrackingEnabled = !handTrackingEnabled;
    centerMessage = `Hand landmarks: ${handTrackingEnabled ? 'ON' : 'OFF'}`;
    centerMessageStartTime = millis();
    centerMessage.displayDuration = (typeof DETECT_MESSAGE_DURATION !== 'undefined') ? DETECT_MESSAGE_DURATION : 1200;
  }

  // Start audio on first key press (keep existing behaviour)
  if (!soundStarted) {
    try { userStartAudio(); } catch (e) { /* ignore user gesture restrictions */ }

    const seasons = (typeof SEASON_AUDIO !== 'undefined') ? Object.keys(SEASON_AUDIO) : [];
    for (let season of seasons) {
      const audioConfig = SEASON_AUDIO[season];
      const sound = seasonAudio && seasonAudio[season];
      try {
        const loaded = sound && typeof sound.isLoaded === 'function' ? sound.isLoaded() : !!sound;
        if (loaded) {
          if (typeof sound.loop === 'function') sound.loop();
          if (audioConfig && typeof audioConfig.volume !== 'undefined' && typeof sound.setVolume === 'function') {
            sound.setVolume(audioConfig.volume);
          }
          if (audioConfig && typeof audioConfig.rate !== 'undefined' && typeof sound.rate === 'function') {
            sound.rate(audioConfig.rate);
          }
        }
      } catch (e) { /* ignore audio control errors */ }
    }

    soundStarted = true;
  }
}

// ==================== FALLING CARDS ====================

/**
 * Creates a new falling card object with smooth floating physics
 */
function createFallingCard() {
  // Filter out null/failed images
  const validCards = cardImages.filter(img => img !== null && img !== undefined);
  
  if (validCards.length === 0) {
    return null;
  }
  
  const randomCardIndex = floor(random(validCards.length));
  const cardImg = validCards[randomCardIndex];
  
  if (!cardImg) return null;
  
  const aspectRatio = cardImg.width / cardImg.height;
  const cardHeight = height * CONFIG.cardHeightRatio;
  const cardWidth = cardHeight * aspectRatio;
  
  return {
    img: cardImg,
    x: random(width),
    y: random(-cardHeight * 3, -cardHeight),
    width: cardWidth,
    height: cardHeight,
    speed: CONFIG.cardFallSpeed + random(-CONFIG.cardFallSpeedVariation, CONFIG.cardFallSpeedVariation),
    swayPhase: random(TWO_PI),
    swaySpeed: random(0.5, 1.5) * CONFIG.cardSwayFrequency,
    swayAmplitude: random(0.5, 1.5) * CONFIG.cardSwayAmplitude,
    rotationAngle: random(TWO_PI),
    rotationPhase: random(TWO_PI),
    rotationSpeed: random(0.3, 1.5) * CONFIG.cardRotationSpeed,
    rotationAmplitude: random(0.3, 1.0) * CONFIG.cardRotationAmplitude,
    verticalOscillation: random(TWO_PI),
    verticalOscillationSpeed: random(0.01, 0.03)
  };
}

/**
 * Updates and draws all falling cards with smooth floating motion
 */
function updateAndDrawFallingCards() {
  // Spawn new cards
  if (millis() - lastCardSpawnTime > CONFIG.cardSpawnInterval) {
    for (let i = 0; i < CONFIG.cardSpawnCount; i++) {
      const card = createFallingCard();
      if (card) {
        fallingCards.push(card);
      }
    }
    lastCardSpawnTime = millis();
  }
  
  // Update and draw cards
  for (let i = fallingCards.length - 1; i >= 0; i--) {
    const card = fallingCards[i];
    
    // Update position with vertical wobble
    const verticalWobble = sin(card.verticalOscillation) * 0.3;
    card.y += card.speed + verticalWobble;
    card.verticalOscillation += card.verticalOscillationSpeed;
    
    // Update horizontal sway
    card.swayPhase += card.swaySpeed * 0.01;
    const swayOffset = sin(card.swayPhase) * card.swayAmplitude;
    card.x += swayOffset * 0.05;
    
    // Update rotation
    card.rotationPhase += card.rotationSpeed;
    card.rotationAngle = sin(card.rotationPhase) * card.rotationAmplitude;
    
    // Draw card
    push();
    translate(card.x, card.y);
    rotate(card.rotationAngle);
    image(card.img, 0, 0, card.width, card.height);
    pop();
    
    // Remove cards that are off screen
    if (card.y - card.height / 2 > height + 100) {
      fallingCards.splice(i, 1);
    }
  }
}

// ==================== MESSAGES ====================

function drawOpeningMessages(messages, instruction = null) {
  if (!messages || messages.length === 0) return;
  
  // Calculate total cycle duration
  const totalDuration = messages.reduce((sum, msg) => sum + msg.duration, 0);
  
  // Get current position in the cycle
  const timeSinceStart = millis() % totalDuration;
  
  // Find which message to display
  let accumulatedTime = 0;
  let currentMessage = messages[0];
  
  for (let i = 0; i < messages.length; i++) {
    accumulatedTime += messages[i].duration;
    if (timeSinceStart < accumulatedTime) {
      currentMessage = messages[i];
      break;
    }
  }
  
  // Draw the current message
  push();
  fill(currentMessage.color[0], currentMessage.color[1], currentMessage.color[2]);
  textAlign(CENTER, CENTER);
  textSize(currentMessage.size);
  textFont('Georgia');
  
  // Convert string style to p5.js constant
  if (currentMessage.style === 'bold') {
    textStyle(BOLD);
  } else if (currentMessage.style === 'italic') {
    textStyle(ITALIC);
  } else {
    textStyle(NORMAL);
  }
  
  text(currentMessage.text, width / 2, height / 2);
  pop();
  
  // Draw instruction if provided
  if (instruction) {
    push();
    fill(instruction.color[0], instruction.color[1], instruction.color[2]);
    textAlign(CENTER, CENTER);
    textSize(instruction.size);
    text(instruction.text, width / 2, height / 2 + instruction.yOffset);
    pop();
  }
}

/**
 * Draws a centered message on the canvas with optional image and second message
 * @param {string} message - Text message (can include \n for line breaks)
 * @param {number} [txtSize=48] - Size of the text in pixels
 * @param {p5.Image} [img=null] - Optional image to display centered below the text
 * @param {number} [imgSize=80] - Height of the optional image in pixels
 * @param {string} [message2=null] - Optional second text message below the image
 * @param {number} [txtSize2=48] - Size of the second text in pixels
 */
function drawCenterMessage(message, txtSize = 48, img = null, imgSize = 80, message2 = null, txtSize2 = 48) {
  push();
  
  // Split first message by line breaks
  const lines = message.split('\n');
  
  // Text styling with custom size
  fill(0);
  textSize(txtSize);
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  
  // Calculate total height needed for first message lines
  const lineHeight = txtSize * 1.25;
  const totalTextHeight = lines.length * lineHeight;
  
  // Calculate total content height
  let totalContentHeight = totalTextHeight;
  if (img) {
    totalContentHeight += imgSize + 20;
  }
  if (message2) {
    const lines2 = message2.split('\n');
    const lineHeight2 = txtSize2 * 1.25;
    totalContentHeight += lines2.length * lineHeight2 + 20;
  }
  
  // Starting Y position (centered for all content)
  let startY = height / 2 - totalContentHeight / 2;
  
  // Draw all first message lines centered
  for (let i = 0; i < lines.length; i++) {
    const y = startY + (i * lineHeight);
    text(lines[i], width / 2, y);
  }
  
  let currentY = startY + totalTextHeight;
  
  // Draw optional image centered below first message
  if (img) {
    const imgY = currentY + imgSize / 2 + 20;
    const aspectRatio = img.width / img.height;
    const imgWidth = imgSize * aspectRatio;
    image(img, width / 2, imgY, imgWidth, imgSize);
    currentY = imgY + imgSize / 2;
  }
  
  // Draw optional second message centered below image
  if (message2) {
    const lines2 = message2.split('\n');
    const lineHeight2 = txtSize2 * 1.25;
    
    textSize(txtSize2);
    currentY += 20;
    
    for (let i = 0; i < lines2.length; i++) {
      const y = currentY + (i * lineHeight2);
      text(lines2[i], width / 2, y);
    }
  }
  
  pop();
}

// ==================== SUIT DRAWING ====================
/**
 * Draws 4 suits in a circle, one from each deck, with waving hands and mouths
 */
function drawDeckSuitsInCircle() {
  const centerX = width / 2;
  const centerY = height / 2;
  const numSuits = 4;

  const circleRadius = height * CONFIG.circleRadiusRatio;
  const angleStep = TWO_PI / numSuits;
  const startAngle = -PI / 2;

  for (let i = 0; i < numSuits; i++) {
    const angle = startAngle + (i * angleStep) + rotationAngle;

    const x = centerX + cos(angle) * circleRadius;
    const y = centerY + sin(angle) * circleRadius;

    if (suitImages[i]) {
      const img = suitImages[i];
      const aspectRatio = img.width / img.height;

      // Get individual sizeRatio from stored suit data (fallback to 0.25)
      const sizeRatio = (img.suitData && img.suitData.sizeRatio) ? img.suitData.sizeRatio : 0.25;

      const targetHeight = height * sizeRatio;
      const targetWidth = targetHeight * aspectRatio;

      // Draw suit image (base layer)
      push();
      imageMode(CENTER);
      tint(255, 255);
      image(img, x, y, targetWidth, targetHeight);
      pop();

      // Draw mouth on top of suit (if mouth tracking is active)
      if (mouthImages[i] && trackUserMouth) {
        push();
        imageMode(CENTER);

        // Get the suit data to check which mouth type it is
        const suitData = suitImages[i].suitData;

        // Special positioning for kiss mouth - put it higher
        let mouthYOffset;
        if (suitData && suitData.mouth && suitData.mouth.includes('Kiss')) {
          mouthYOffset = targetHeight * 0.05; // higher for kiss
        } else {
          mouthYOffset = targetHeight * 0.2; // normal position
        }

        // Size mouth relative to suit size
        const mouthSize = targetHeight * 0.35; // Mouth is 35% of suit height

        tint(255, 255); // Full opacity
        image(mouthImages[i], x, y + mouthYOffset, mouthSize, mouthSize);
        pop();
      }

      // Draw waving hand (only before wave detected)
      if (waveHelloImage && !waveDetected) {
        push();

        const waveSize = targetHeight * 0.45;
        const waveOffsetX = targetWidth / 2 + (waveSize / 2);
        const waveOffsetY = -targetHeight * 0.1;

        const waveTime = millis() * 0.006;
        const wavePhase = (TWO_PI / numSuits) * i;

        const waveBounce = sin(waveTime + wavePhase) * (targetHeight * 0.15);
        const waveRotation = sin(waveTime + wavePhase) * 0.35;
        const waveSwing = sin(waveTime + wavePhase) * 15;

        translate(x + waveOffsetX + waveSwing, y + waveOffsetY + waveBounce);
        rotate(waveRotation);

        imageMode(CENTER);
        image(waveHelloImage, 0, 0, waveSize, waveSize);

        pop();
      }
    } else {
      // Draw placeholder if image failed to load
      const placeholderSize = height * 0.25;
      push();
      fill(200);
      stroke(100);
      strokeWeight(2);
      circle(x, y, placeholderSize);
      fill(100);
      noStroke();
      textSize(12);
      textAlign(CENTER, CENTER);
      text('?', x, y);
      pop();
    }
  }

  // Draw intro logo in the center of the circle (larger, proportional to circle)
  if (introLogoImage) {
    push();
    imageMode(CENTER);

    // Larger sizing: use a generous fraction of the circle radius but keep aspect ratio
    const circleRadius = height * CONFIG.circleRadiusRatio;
    const logoMaxSize = circleRadius * 1.6; // larger than before to fill center space
    const logoScale = 1; // slight padding so it doesn't touch suits

    let logoW = introLogoImage.width;
    let logoH = introLogoImage.height;
    const aspect = logoW / logoH;

    if (logoW >= logoH) {
      // constrain by width
      logoW = logoMaxSize * logoScale;
      logoH = logoW / aspect;
    } else {
      // constrain by height
      logoH = logoMaxSize * logoScale;
      logoW = logoH * aspect;
    }

    image(introLogoImage, width / 2, height / 2, logoW, logoH);
    pop();
  }
}

// ==================== SUIT INTRODUCTION ====================

/**
 * Displays the introduction message next to the current suit being introduced
 * @param {number} deckIndex - Index of the deck (0-3)
 * @param {number} elapsed - Time elapsed since intro started
 */
function displaySuitIntroMessage(deckIndex, elapsed) {
  // Get the deck and suit
  const deck = DECKS[deckIndex];
  const suit = deck.suits.find(s => s.sorder === deck.order);
  
  if (!suit) return;
  
  // Calculate shake effect for the first half of the duration
  if (elapsed < CONFIG.SuitIntroDuration * 0.5) {
    const shakeProgress = elapsed / (CONFIG.SuitIntroDuration * 0.5);
    const shakeAmount = CONFIG.shakeIntensity * (1 - shakeProgress);
    shakeOffsetX = random(-shakeAmount, shakeAmount);
    shakeOffsetY = random(-shakeAmount, shakeAmount);
  } else {
    shakeOffsetX = 0;
    shakeOffsetY = 0;
  }
  
  // Calculate position of the suit in the circle
  const centerX = width / 2;
  const centerY = height / 2;
  const circleRadius = height * CONFIG.circleRadiusRatio;
  const angleStep = TWO_PI / 4;
  const startAngle = -PI / 2;
  const suitAngle = startAngle + (deckIndex * angleStep) + rotationAngle;
  
  // Calculate message position (further out from suit)
  const messageDistance = circleRadius * 1.5;
  const messageX = centerX + cos(suitAngle) * messageDistance + shakeOffsetX;
  const messageY = centerY + sin(suitAngle) * messageDistance + shakeOffsetY;
  
  // Display suit intro message next to the suit
  push();
  fill(0);
  stroke(255);
  strokeWeight(3);
  textSize(32);
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  text(suit.introMessage, messageX, messageY);
  pop();
}

/**
 * Finds the landscape path for the suit with the given emotion.
 * @param {Array} suitsArray - Array of suit objects.
 * @param {string} emotion - The emotion to search for (e.g. 'Joy').
 * @returns {string|null} The landscape path, or null if not found.
 */
function getSuitLandscapeByEmotion(suitsArray, emotion) {
  const suit = suitsArray.find(suit => suit.emotion === emotion);
  return suit ? suit.landscape : null;
}

// ---------- MOUTH CALIBRATION FUNCTIONS ----------

function loadMouthCalibrations() {
  try {
    const saved = JSON.parse(localStorage.getItem('mouthCalibrations') || '{}');
    if (saved.smile != null) {
      smileBaseline = parseFloat(saved.smile);
      SMILE_THRESH = constrain(smileBaseline + 0.18, 0.3, 0.8);
    }
    if (saved.kiss != null) {
      // KISS_THRESH should exist in BodyInteractions.js
      kissBaseline = parseFloat(saved.kiss);
      KISS_THRESH = constrain(kissBaseline + 0.12, 0.35, 0.8);
    }
  } catch (e) {
    // ignore storage errors
  }
}

function saveMouthCalibration(kind, baseline) {
  try {
    const all = JSON.parse(localStorage.getItem('mouthCalibrations') || '{}');
    all[kind] = baseline;
    localStorage.setItem('mouthCalibrations', JSON.stringify(all));
  } catch (e) { /* ignore */ }
}

// start calibrations if missing (call from setup or when user requests recalibration)
function ensureMouthCalibrations() {
  const saved = JSON.parse(localStorage.getItem('mouthCalibrations') || '{}');

  if (saved.smile == null) {
    startCalibration('smile', getSmileScore, 60, (baseline) => {
      smileBaseline = baseline;
      SMILE_THRESH = constrain(smileBaseline + 0.18, 0.3, 0.8);
      saveMouthCalibration('smile', baseline);
    });
  }

  // require getKissScore to be defined in BodyInteractions.js
  if (typeof getKissScore === 'function' && saved.kiss == null) {
    startCalibration('kiss', getKissScore, 60, (baseline) => {
      kissBaseline = baseline;
      KISS_THRESH = constrain(kissBaseline + 0.12, 0.3, 0.8);
      saveMouthCalibration('kiss', baseline);
    });
  }
}

// call this each frame in draw() so active calibrators collect samples
function stepMouthCalibrations() {
  // updateCalibration returns baseline when done (onComplete also runs)
  updateCalibration('smile');
  updateCalibration('kiss');
  // updateCalibration('sad'); updateCalibration('anger');
}

// ----------------------Emotion recognition message-------------
function findDeckIndexForInteraction(interaction) {
  if (!interaction) return -1;
  const target = String(interaction).toLowerCase();

  // Prefer currently loaded suitImages (these have suitData attached in preload)
  if (Array.isArray(suitImages)) {
    for (let d = 0; d < suitImages.length; d++) {
      const img = suitImages[d];
      const sd = img && img.suitData;
      if (sd && sd.emotion && String(sd.emotion).toLowerCase() === target) return d;
    }
  }

  // Fallback to DECKS metadata (find suit whose sorder === deck.order)
  if (Array.isArray(DECKS)) {
    for (let d = 0; d < DECKS.length; d++) {
      const deck = DECKS[d];
      if (!deck || !Array.isArray(deck.suits)) continue;
      const suit = deck.suits.find(s => s && s.sorder === deck.order);
      if (suit && suit.emotion && String(suit.emotion).toLowerCase() === target) return d;
    }
  }

  return -1;
}

// Return season string for a deck (reads suit.season first)
function getSeasonForDeck(deckIndex) {
  if (!Array.isArray(DECKS) || DECKS[deckIndex] == null) return null;
  const deck = DECKS[deckIndex];
  const suit = Array.isArray(deck.suits) ? deck.suits.find(s => s && s.sorder === deck.order) : null;
  if (suit && suit.season) return suit.season;
  if (deck.season) return deck.season;
  if (deck.name) return deck.name;
  return null;
}

// Show the "You can now enter <Season>" message using deck index (the suit will "say" it)
function showSeasonEntryMessageForDeck(deckIndex) {
  const season = getSeasonForDeck(deckIndex) || 'the season';
  seasonMessage = {
    deckIndex,
    text: `You can now enter ${season}`,
    startTime: millis(),
    duration: SEASON_MESSAGE_DEFAULT_DURATION
  };
}

// Draw the season message next to the rotating suit (startTime-aware)
function drawSeasonEntryMessage() {
  if (!seasonMessage || typeof seasonMessage.startTime !== 'number') return;

  // don't draw until startTime reached
  if (millis() < seasonMessage.startTime) return;

  // clear when past duration
  if (millis() - seasonMessage.startTime > seasonMessage.duration) {
    seasonMessage = null;
    return;
  }

  const deckIndex = seasonMessage.deckIndex;
  const centerX = width / 2;
  const centerY = height / 2;
  const circleRadius = height * CONFIG.circleRadiusRatio;
  const angleStep = TWO_PI / 4;
  const startAngle = -PI / 2;
  const suitAngle = startAngle + (deckIndex != null ? (deckIndex * angleStep) : 0) + rotationAngle;

  // if no deckIndex, draw centered above the circle
  let messageX, messageY;
  if (deckIndex == null) {
    messageX = centerX;
    messageY = centerY - circleRadius * 0.6;
  } else {
    const messageDistance = circleRadius * 1.5;
    messageX = centerX + cos(suitAngle) * messageDistance;
    messageY = centerY + sin(suitAngle) * messageDistance;
  }

  push();
  fill(0);
  stroke(255);
  strokeWeight(3);
  textSize(32);
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  text(seasonMessage.text, messageX, messageY);
  pop();
}

function drawSeasonFollowupMessage() {
  if (!seasonFollowup || typeof seasonFollowup.startTime !== 'number') return;

  // not yet time
  if (millis() < seasonFollowup.startTime) return;

  // still active?
  if (millis() - seasonFollowup.startTime < seasonFollowup.duration) {
    // use central rendering helper (same style as centerMessage)
    drawCenterMessage(seasonFollowup.text, 32, null, 60);
  } else {
    seasonFollowup = null;
  }
}

// ==================== UTILITY FUNCTIONS ====================

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// call this once after imagesLoaded
function sanitizeImages() {
  if (imagesSanitized) return;

  function copyUntinted(img) {
    if (!img) return img;
    const g = createGraphics(img.width, img.height);
    g.push();
    g.clear();
    g.imageMode(CORNER);
    g.noTint();
    g.tint(255);
    g.image(img, 0, 0, img.width, img.height);
    g.pop();
    return g.get();
  }

  // Sanitize full-canvas background/logo images first
  introCloudsImage = copyUntinted(introCloudsImage);
  levelCloudSuitsImage = copyUntinted(levelCloudSuitsImage);
  introLogoImage = copyUntinted(introLogoImage);

  // Sanitize suit, mouth and card images arrays
  for (let i = 0; i < suitImages.length; i++) {
    suitImages[i] = copyUntinted(suitImages[i]);
  }
  for (let i = 0; i < mouthImages.length; i++) {
    mouthImages[i] = copyUntinted(mouthImages[i]);
  }
  for (let i = 0; i < cardImages.length; i++) {
    cardImages[i] = copyUntinted(cardImages[i]);
  }

  imagesSanitized = true;
}