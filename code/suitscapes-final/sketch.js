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
let handTrackingEnabled = true;
let showMouthLandmarks = false;

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

// ==================== PRELOAD ====================

function preload() {
   // Load Wave Hello image
  waveHelloImage = loadImage('Images/Wave-Hello.png');
  
  // Load all season audio files
  const seasons = Object.keys(SEASON_AUDIO);
  for (let season of seasons) {
    const audioConfig = SEASON_AUDIO[season];
    // remove per-file success logs — keep error callback for failures if desired
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
          // success log removed to avoid per-file console spam
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
}

// ==================== MAIN DRAW LOOP ====================
function draw() {
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

  // rotation for suits
  rotationAngle += CONFIG.rotationSpeed;

  // LAYER 1: Background — clouds after wave, otherwise falling cards
  if (waveDetected) {
    // stop card spawning once wave detected
    cardsFallingActive = false;

    if (introCloudsImage) {
      push();
      imageMode(CORNER);
      image(introCloudsImage, 0, 0, width, height);
      pop();
    } else {
      push();
      noStroke();
      fill(169, 218, 245);
      rect(0, 0, width, height);
      pop();
    }
  } else {
    // before wave: falling cards
    if (cardsFallingActive) {
      push();
      tint(255, CONFIG.cardOpacity);
      updateAndDrawFallingCards();
      pop();
    }
  }

  // LAYER 2: suits
  drawDeckSuitsInCircle();

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
        // ignore
      }
    }
  }

  // SUIT INTRODUCTIONS (LAYER 3)
  if (suitIntroActive) {
    const elapsed = millis() - suitIntroStartTime;

    if (currentIntroSuitIndex < 4) {
      displaySuitIntroMessage(currentIntroSuitIndex, elapsed);

      if (elapsed >= CONFIG.SuitIntroDuration) {
        currentIntroSuitIndex++;
        suitIntroStartTime = millis();

        if (currentIntroSuitIndex >= 4) {
          suitIntroActive = false;
          introductionsComplete = true;

          // enable mouth landmarks and start delayed enabling of tracking
          showMouthLandmarks = true;
          mouthEnableStartTime = millis();
        }
      }
    }
  }

  // enable mouth tracking after intro delay (no central text)
  if (introductionsComplete) {
    if (typeof mouthEnableStartTime === 'undefined') mouthEnableStartTime = millis();
    if (millis() - mouthEnableStartTime > CONFIG.initialMessageDelay) {
      trackUserMouth = true;
      // keep introductionsComplete false so this runs once
      introductionsComplete = false;
    }
  }

  // LAYER 5: hand landmarks (only before wave)
  if (handTrackingEnabled && !waveDetected && typeof drawHandLandmarks === 'function') {
    drawHandLandmarks();
  }

  // LAYER 6: mouth tracking & emotion detection (no center UI messages)
  if (showMouthLandmarks && trackUserMouth) {
    if (typeof drawMouthLandmarks === 'function') {
      drawMouthLandmarks();
    }

    let faces = null;
    if (typeof getFaceLandmarks === 'function') {
      try { faces = getFaceLandmarks(); } catch (e) { faces = null; }
    }

    // step generic calibrators only when face landmarks exist
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
      // KISS (priority)
      let detectedInteraction = null;
      let kScore = 0;
      if (typeof updateKiss === 'function' && faces && faces.length) {
        try { kScore = updateKiss(); } catch (e) { kScore = 0; }
        const kThresh = (typeof KISS_THRESH !== 'undefined') ? KISS_THRESH : 0.55;
        if (kScore > kThresh) {
          detectedInteraction = 'kiss';
          if (typeof onKiss === 'function') try { onKiss(kScore); } catch (e) {}
        }
      }

      // if not kiss, compute emotion scores and decide (smile / sadness / anger)
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
          if (typeof onAnger === 'function') try { onAnger(angerScore); } catch (e) {}
        } else if (sScore > sThresh && sScore > sadScore * margin && sScore > angerScore * margin) {
          detectedInteraction = 'smile';
          if (typeof onSmile === 'function') try { onSmile(sScore); } catch (e) {}
        } else if (sadScore > sadThresh && sadScore > sScore * margin && sadScore > angerScore * margin) {
          detectedInteraction = 'sadness';
          if (typeof onSadness === 'function') try { onSadness(sadScore); } catch (e) {}
        } else {
          // fallback: use hysteresis active flags
          if (typeof updateAnger === 'function' && updateAnger._active && !(updateSmile && updateSmile._active) && !(updateSadness && updateSadness._active)) {
            detectedInteraction = 'anger';
            if (typeof onAnger === 'function') try { onAnger(updateAnger()); } catch (e) {}
          } else if (typeof updateSadness === 'function' && updateSadness._active && !(updateSmile && updateSmile._active)) {
            detectedInteraction = 'sadness';
            if (typeof onSadness === 'function') try { onSadness(updateSadness()); } catch (e) {}
          } else if (typeof updateSmile === 'function' && updateSmile._active) {
            detectedInteraction = 'smile';
            if (typeof onSmile === 'function') try { onSmile(updateSmile()); } catch (e) {}
          }
        }
      }

      // handlers called above; no center message UI
    }
  }

  // end draw
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
    // removed verbose console log
  }
}

/**
 * Start audio on any key press
 */
function keyPressed() {
  // Press 'H' to toggle hand tracking visualization
  if (key === 'h' || key === 'H') {
    handTrackingEnabled = !handTrackingEnabled;
    showMouthLandmarks = !showMouthLandmarks;
    // removed verbose console log
  }
  
  // Start audio on any key press
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
    // removed verbose console log
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
 * Draws 4 suits in a circle, one from each deck, with waving hands (only before wave detected)
 */
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
    // circleRadius is the radius used to place suit images; scale relative to that.
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

    image(introLogoImage, centerX, centerY, logoW, logoH);
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
    // placeholders for future sad/anger baselines:
    // if (saved.sad != null) { ... }
    // if (saved.anger != null) { ... }
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

  // future: startCalibration('sad', getSadScore, ...), startCalibration('anger', getAngerScore, ...)
}

// call this each frame in draw() so active calibrators collect samples
function stepMouthCalibrations() {
  // updateCalibration returns baseline when done (onComplete also runs)
  updateCalibration('smile');
  updateCalibration('kiss');
  // updateCalibration('sad'); updateCalibration('anger');
}

// ==================== UTILITY FUNCTIONS ====================

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}