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



// ==================== PRELOAD ====================

function preload() {
  // Load Wave Hello image
  waveHelloImage = loadImage('Images/Wave-Hello.png',
    () => console.log('✓ Wave Hello image loaded'),
    (err) => console.error('✗ Failed to load Wave Hello image:', err)
  );

  // Load all season audio files
  const seasons = Object.keys(SEASON_AUDIO);
  for (let season of seasons) {
    const audioConfig = SEASON_AUDIO[season];
    
    seasonAudio[season] = loadSound(
      audioConfig.file,
      () => console.log(`✓ ${audioConfig.name} audio loaded`),
      (err) => console.error(`✗ Failed to load ${audioConfig.name} audio:`, err)
    );
  }

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
          console.log(`✓ Loaded mouth for ${deck.name} - ${suit.name}`);
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
  
  console.log('🚀 Starting initialization...');
  
  // Start video and hands immediately (non-blocking)
  setupVideo(true);
  console.log('✅ Video setup complete');
  setupHands();
  console.log('✅ Hands setup complete');
  
  // DON'T WAIT for face detection - load it in background
  setupFaceDetection().then(() => {
    console.log('✅ Face detection setup complete (loaded in background)');
  }).catch(err => {
    console.warn('⚠️ Face detection failed to load:', err);
  });
  
  console.log('🎨 Animation starting (face detection loading in background)...');
  
  // ✅ UNCOMMENT THESE 3 LINES:
  cardsFallingActive = true;
  cardsFallingStartTime = millis();
  lastCardSpawnTime = millis();

  isCalibratingSmile = true;
  smileCalibrationCount = 0;
  smileCalibrationSum = 0;
}

// ==================== MAIN DRAW LOOP ====================

function draw() {
  background(255);
  
  if (imagesLoaded) {
    // Rotate the suits continuously
    rotationAngle += CONFIG.rotationSpeed;
    
    // LAYER 1: Draw falling cards (background layer)
    if (cardsFallingActive) {
      push();
      tint(255, CONFIG.cardOpacity);
      updateAndDrawFallingCards();
      pop();
    }
    
    // LAYER 2: Draw the 4 suits in a circle (always visible)
    drawDeckSuitsInCircle();
    
    // --- BEFORE WAVE DETECTION ---
    if (!waveDetected) {
      // Display cycling opening messages
      drawOpeningMessages(OPENING_MESSAGES, null);
      
      // Check for wave gesture (ONLY ONE CHECK)
      if (detectHandWaveGesture()) {
        waveDetected = true;
        
        // Start the suit introduction sequence
        suitIntroActive = true;
        suitIntroStartTime = millis();
        currentIntroSuitIndex = 0;
        
        console.log('👋 WAVE DETECTED! Starting suit introductions...');
      }
    }
    
    // --- AFTER WAVE DETECTION ---
    
    // LAYER 3: Suit introductions (after wave detected)
    if (suitIntroActive) {
      const elapsed = millis() - suitIntroStartTime;
      
      if (currentIntroSuitIndex < 4) {
        // Display the current suit's introduction message
        displaySuitIntroMessage(currentIntroSuitIndex, elapsed);
        
        // Move to next suit after CONFIG duration
        if (elapsed >= CONFIG.SuitIntroDuration) {
          currentIntroSuitIndex++;
          suitIntroStartTime = millis();
          
          if (currentIntroSuitIndex >= 4) {
            // All introductions complete
            suitIntroActive = false;
            introductionsComplete = true;
            
            // Show final message
            centerMessage = "What emotion do you prefer?";
            centerMessageStartTime = millis();
            
            console.log('✅ All suit introductions complete!');
          }
        }
      }
    }

    // LAYER 4: Show final message after suit introductions
    if (introductionsComplete && centerMessage) {
      // Draw the "Show me how you feel" message
      push();
      fill(0); // Black text (was white on white background!)
      textAlign(CENTER, CENTER);
      textSize(36);
      textFont('Georgia');
      text(centerMessage, width / 2, height / 2);
      pop();
      
      showMouthLandmarks = true;

      // Hide message after delay and start mouth tracking
      if (millis() - centerMessageStartTime > CONFIG.initialMessageDelay) {
        centerMessage = null;
        trackUserMouth = true;
        console.log('👄 Starting mouth tracking...');
      }
    }
    
    // LAYER 5: Draw hand landmarks (only before wave is detected)
    if (handTrackingEnabled && !waveDetected) {
      drawHandLandmarks();
    }
     trackUserMouth = true;

    //console.log('Smile score:', score);
    console.log('TrackUserMouth', trackUserMouth);


    // LAYER 6: Draw mouth landmarks (after wave detected) and start emotions recognition
    if (showMouthLandmarks && trackUserMouth) {

      // visible confirmation this branch runs
      console.log('MOUTH BRANCH - showMouthLandmarks:', showMouthLandmarks, 'trackUserMouth:', trackUserMouth, 'isCalibratingSmile:', isCalibratingSmile);

      if (typeof detectSmile === 'function') {
        try { console.log('detectSmile():', detectSmile()); } catch (e) { console.log('detectSmile() threw:', e); }
      } else {
        console.log('detectSmile() not defined');
      }

      const smileLeft = (typeof getBlendshapeScore === 'function') ? getBlendshapeScore('mouthSmileLeft') : null;
      const smileRight = (typeof getBlendshapeScore === 'function') ? getBlendshapeScore('mouthSmileRight') : null;
      console.log('Blendshape mouthSmileLeft:', smileLeft, 'mouthSmileRight:', smileRight);

      drawMouthLandmarks();

      if (isCalibratingSmile) {
        // Collect neutral face scores for calibration
        const score = (typeof getSmileScore === 'function') ? getSmileScore() : 0;
        smileCalibrationSum += score;
        smileCalibrationCount++;
        // Optionally show a message: "Calibrating... Please keep a neutral face"
        if (smileCalibrationCount >= smileCalibrationFrames) {
          smileBaseline = smileCalibrationSum / smileCalibrationCount;
          SMILE_THRESH = constrain(smileBaseline + 0.18, 0.3, 0.8);
          isCalibratingSmile = false;
          console.log('Smile calibration complete. Baseline:', smileBaseline.toFixed(3), 'Threshold:', SMILE_THRESH.toFixed(3));
        }
      } else {
        // Normal smile detection — check function exists and use visible logs
        if (typeof updateSmile === 'function') {
          const smileScore = updateSmile();
          if (isSmiling) {
            console.log('😊 Smile detected! Score:', smileScore.toFixed(2));
          } else {
            console.log('😐 Not smiling. Score:', smileScore.toFixed(2));
          }
        } else {
          console.log('updateSmile() not defined');
        }
      }
    } else {
      console.log("skip smile branch - showMouthLandmarks:", showMouthLandmarks, "trackUserMouth:", trackUserMouth);
    }
    
  } else {
    fill(0);
    textSize(24);
    textAlign(CENTER, CENTER);
    text('Loading images...', width / 2, height / 2);
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
    console.log('🔊 Audio started');
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
    console.log('🔄 Toggle - Hand tracking:', handTrackingEnabled, 'Mouth landmarks:', showMouthLandmarks);
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
    console.log('🔊 Audio started');
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
      
      // Get individual sizeRatio from stored suit data
      const sizeRatio = (img.suitData && img.suitData.sizeRatio) ? img.suitData.sizeRatio : 0.25;
      
      const targetHeight = height * sizeRatio;
      const targetWidth = targetHeight * aspectRatio;
      
      // Draw suit image (base layer)
      push();
      tint(255, 255);
      image(img, x, y, targetWidth, targetHeight);
      pop();
      
      // ✨ Draw mouth on top of suit (if mouth tracking is active)
      if (mouthImages[i] && trackUserMouth) {
        push();
        imageMode(CENTER);
        
        // Get the suit data to check which mouth type it is
        const suitData = suitImages[i].suitData;
        
        // Special positioning for kiss mouth - put it higher
        let mouthYOffset;
        if (suitData && suitData.mouth && suitData.mouth.includes('Kiss')) {
          mouthYOffset = targetHeight * 0.05; // 5% below center (HIGHER for kiss)
          console.log(`Kiss mouth detected for ${suitData.name} - positioning higher`);
        } else {
          mouthYOffset = targetHeight * 0.2; // 20% below center (normal position)
        }
        
        // Size mouth relative to suit size
        const mouthSize = targetHeight * 0.35; // Mouth is 35% of suit height
        
        tint(255, 255); // Full opacity
        image(mouthImages[i], x, y + mouthYOffset, mouthSize, mouthSize);
        pop();
      }
      
      // ✨ Draw waving hand (only before wave detected)
      if (waveHelloImage && !waveDetected) {
        push();
        
        // Calculate wave size based on suit HEIGHT
        const waveSize = targetHeight * 0.45;
        
        // Position wave hand directly adjacent to suit (NO GAP)
        const waveOffsetX = targetWidth / 2 + (waveSize / 2);
        const waveOffsetY = -targetHeight * 0.1;
        
        // ENHANCED waving animation
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
      textSize(12);
      textAlign(CENTER, CENTER);
      text('?', x, y);
      pop();
    }
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

// ==================== UTILITY FUNCTIONS ====================

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}