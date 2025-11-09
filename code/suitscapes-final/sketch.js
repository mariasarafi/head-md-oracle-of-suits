let currentDeckIndex;
let suitImages = [];
let mouthImages = [];
let cardImages = [];
let imagesLoaded = false;
let rotationAngle = 0;
let isRotating = true;
let startTime;
let timeThresholdPassed = false; // Keep for transition logic
let suitIntroActive = false;
let suitIntroStartTime;
let currentIntroSuitIndex = 0;
let shakeOffsetX = 0;
let shakeOffsetY = 0;
let introductionsComplete = false;

let centerMessage = null;
let centerMessageStartTime;

let suitIntroMessage = null;

let cardsFallingActive = false;
let cardsFallingStartTime = 0;
let fallingCards = [];
let lastCardSpawnTime = 0;

let mouthsStaticAfterMessage = false;
let finalMessageShown = false;
let continuousRotation = false;
let trackUserMouth = false;
let trackingMessageShown = false;
let smoothedMouthOpening = 0;
let smoothedMouthWidth = 0;
let smoothedMouthCenterY = 0;
// Add this variable at the top with your other variables
let maxCards = 30; // LIMIT maximum number of cards on screen


// Audio variables - DECLARE THESE BEFORE preload()
let cardShuffleSound;
let seasonAudio = {}; // Object to store all season sounds
let soundStarted = false;

// Add variable for wave hello image at the top with other variables
let waveHelloImage;

function preload() {
  // Load the card shuffle sound
  /*cardShuffleSound = loadSound('Audio/Card-Shuffle.wav', 
    () => {
      console.log('✓ Card shuffle sound loaded successfully');
    },
    (err) => {
      console.error('✗ Failed to load card shuffle sound:', err);
    }
  );*/

  // Load Wave Hello image
  waveHelloImage = loadImage('Images/Wave-Hello.png',
    () => {
      console.log('✓ Wave Hello image loaded successfully');
    },
    (err) => {
      console.error('✗ Failed to load Wave Hello image:', err);
    }
  );

  // Load all season audio files from SEASON_AUDIO configuration
  const seasons = Object.keys(SEASON_AUDIO);
  for (let season of seasons) {
    const audioConfig = SEASON_AUDIO[season];
    
    seasonAudio[season] = loadSound(
      audioConfig.file,
      () => {
        console.log(`✓ ${audioConfig.name} audio loaded successfully`);
      },
      (err) => {
        console.error(`✗ Failed to load ${audioConfig.name} audio:`, err);
      }
    );
  }

  let loadedCount = 0;
  
  // We need to load 4 suits (one from each deck) + all cards from all decks
  let totalCardImages = 0;
  for (let d = 0; d < DECKS.length; d++) {
    if (DECKS[d].cards) {
      totalCardImages += DECKS[d].cards.length;
    }
  }
  
  const totalImages = 4 + totalCardImages; // 4 suits + all cards
  
  console.log(`Loading 4 suits (one from each deck) and ${totalCardImages} cards from ${DECKS.length} decks`);
  
  // Load one suit from each deck where sorder matches deck order
  for (let d = 0; d < DECKS.length; d++) {
    const deck = DECKS[d];
    const suit = deck.suits.find(s => s.sorder === deck.order);
    
    if (suit) {
      console.log(`Loading suit from deck ${deck.name}: ${suit.name} (order ${deck.order})`);
      
      loadImage(
        suit.image,
        (img) => {
          img.suitData = suit; // ← ADD THIS LINE to store suit data with image
          suitImages[d] = img;
          loadedCount++;
          console.log(`✓ Loaded suit ${d}: ${suit.name} from ${deck.name}`);
          if (loadedCount === totalImages) {
            imagesLoaded = true;
            console.log('All images loaded!');
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
    }
  }
  
  // Load card images from ALL 4 decks
  let cardIndex = 0;
  for (let d = 0; d < DECKS.length; d++) {
    const currentDeck = DECKS[d];
    console.log(`Loading cards from deck: ${currentDeck.name}`);
    
    if (currentDeck.cards && Array.isArray(currentDeck.cards)) {
      console.log(`  - ${currentDeck.cards.length} cards in this deck`);
      
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
              console.log(`All ${cardImages.length} cards loaded successfully!`);
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
      console.warn(`Deck ${currentDeck.name} has no cards array or it's not an array`);
    }
  }
  
  console.log(`Total cards to load: ${cardIndex}`);
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  imageMode(CENTER);
  angleMode(RADIANS);
  
  // Start cards falling immediately
  cardsFallingActive = true;
  cardsFallingStartTime = millis();
  lastCardSpawnTime = millis();

  /* it does not work in setup because of browser autoplay policy - needs a user interaction
  if (!soundStarted && cardShuffleSound && cardShuffleSound.isLoaded()) {
    userStartAudio(); // Enable audio context
    cardShuffleSound.loop();
    cardShuffleSound.setVolume(0.5);
    soundStarted = true;
    console.log('🔊 Card shuffle sound playing in loop');
  }*/
}

function draw() {
  background(255);
  
  if (imagesLoaded) {
    // Rotate the suits continuously
    rotationAngle += CONFIG.rotationSpeed;
    
    // LAYER 1: Draw falling cards FIRST (background layer) with configurable opacity
    if (cardsFallingActive) {
      push();
      tint(255, CONFIG.cardOpacity); // Use config parameter for opacity
      updateAndDrawFallingCards();
      pop();
    }
    
    // LAYER 2: Draw the 4 suits in a circle ON TOP (foreground layer)
    drawDeckSuitsInCircle();

    // LAYER 3: Draw center message "SUITSCAPES"
    // Custom text size AND custom image size
   // First message + image + second message (different text sizes)
  drawCenterMessage("SUITSCAPES", 48, waveHelloImage, 120, "Wave Hello", 32);


    
  } else {
    fill(0);
    textSize(24);
    textAlign(CENTER, CENTER);
    text('Loading images...', width / 2, height / 2);
  }
}

//---------------------SOUND LOGIC-------------------------------------------------------------------------------------
// Start all sounds on first user interaction
function mousePressed() {
  if (!soundStarted) {
    userStartAudio(); // Enable audio context
    
    // Start card shuffle sound
    /*if (cardShuffleSound && cardShuffleSound.isLoaded()) {
      cardShuffleSound.loop();
      cardShuffleSound.setVolume(0.05);
      cardShuffleSound.rate(0.4);
      console.log('🔊 Card shuffle sound playing in loop');
    } else {
      console.warn('⚠️ Card shuffle sound not loaded');
    }*/
    
    // Start all season sounds with detailed logging
    const seasons = Object.keys(SEASON_AUDIO);
    console.log(`Attempting to play ${seasons.length} season sounds:`, seasons);
    
    for (let season of seasons) {
      const audioConfig = SEASON_AUDIO[season];
      const sound = seasonAudio[season];
      
      console.log(`Checking ${season}:`, {
        configExists: !!audioConfig,
        soundExists: !!sound,
        soundLoaded: sound ? sound.isLoaded() : false,
        file: audioConfig.file
      });
      
      if (sound && sound.isLoaded()) {
        sound.loop();
        sound.setVolume(audioConfig.volume);
        sound.rate(audioConfig.rate);
        console.log(`🔊 ${audioConfig.name} audio STARTED (volume: ${audioConfig.volume}, rate: ${audioConfig.rate})`);
        
        // Check if actually playing
        setTimeout(() => {
          console.log(`${season} isPlaying:`, sound.isPlaying());
        }, 500);
      } else {
        console.error(`❌ ${season} audio NOT playing - sound not loaded properly`);
      }
    }
    
    soundStarted = true;
    console.log('✅ All audio tracks processed');
  }
}

/**---------------------FALLING CARDS LOGIC--------------------------------------------------------- 
 * Creates a new falling card object with smooth floating physics
 */
function createFallingCard() {
  // Filter out null/failed images
  const validCards = cardImages.filter(img => img !== null && img !== undefined);
  
  if (validCards.length === 0) {
    console.error('No valid card images available!');
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
 * Updates and draws all falling cards with smooth floating motion and deceleration
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
    
    // Update position and rotation
    const verticalWobble = sin(card.verticalOscillation) * 0.3;
    card.y += card.speed + verticalWobble;
    card.verticalOscillation += card.verticalOscillationSpeed;
    
    card.swayPhase += card.swaySpeed * 0.01;
    const swayOffset = sin(card.swayPhase) * card.swayAmplitude;
    card.x += swayOffset * 0.05;
    
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

// ---------------------CENTER MESSAGE LOGIC----------------------------

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
  const lineHeight = txtSize * 1.25; // 125% of text size for line spacing
  const totalTextHeight = lines.length * lineHeight;
  
  // Calculate total content height
  let totalContentHeight = totalTextHeight;
  if (img) {
    totalContentHeight += imgSize + 20; // Add image height + gap
  }
  if (message2) {
    const lines2 = message2.split('\n');
    const lineHeight2 = txtSize2 * 1.25;
    totalContentHeight += lines2.length * lineHeight2 + 20; // Add second message height + gap
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
    const imgY = currentY + imgSize / 2 + 20; // 20px gap below text
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
    currentY += 20; // Gap before second message
    
    for (let i = 0; i < lines2.length; i++) {
      const y = currentY + (i * lineHeight2);
      text(lines2[i], width / 2, y);
    }
  }
  
  pop();
}

// Suits in Circle Drawing Logic-----------------------------------------------------
/**
 * Draws 4 suits in a circle, one from each deck
 */
/**
 * Draws 4 suits in a circle, one from each deck
 */
function drawDeckSuitsInCircle() {
  const centerX = width / 2;
  const centerY = height / 2;
  const numSuits = 4; // Always 4 suits
  
  const circleRadius = height * CONFIG.circleRadiusRatio;
  const angleStep = TWO_PI / numSuits;
  const startAngle = -PI / 2; // Start from top
  
  for (let i = 0; i < numSuits; i++) {
    const angle = startAngle + (i * angleStep) + rotationAngle;
    
    const x = centerX + cos(angle) * circleRadius;
    const y = centerY + sin(angle) * circleRadius;
    
    if (suitImages[i]) {
      const img = suitImages[i];
      const aspectRatio = img.width / img.height;
      
      // Get individual sizeRatio from stored suit data (default 0.25 if not specified)
      const sizeRatio = (img.suitData && img.suitData.sizeRatio) ? img.suitData.sizeRatio : 0.25;
      
      const targetHeight = height * sizeRatio; // Use individual sizeRatio directly
      const targetWidth = targetHeight * aspectRatio;
      
      // Draw suits at full opacity (foreground)
      push();
      tint(255, 255); // Full opacity
      image(img, x, y, targetWidth, targetHeight);
      pop();
    } else {
      // Draw placeholder if image failed to load
      const placeholderSize = height * 0.25; // Default fallback
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

/**
 * Draws suit images arranged in a circle with optional shaking effect
 */
function drawSuitsInCircle() {
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
      
      // Find the matching suit from loaded suits based on order
      let sizeRatio = 1.0; // Default
      for (let deck of DECKS) {
        for (let suit of deck.suits) {
          if (suit.order === i && suit.sizeRatio !== undefined) {
            sizeRatio = suit.sizeRatio;
            break;
          }
        }
      }
      
      const targetHeight = height * CONFIG.imageHeightRatio * sizeRatio;
      const targetWidth = targetHeight * aspectRatio;
      
      push();
      tint(255, 255);
      image(img, x, y, targetWidth, targetHeight);
      pop();
    } else {
      const placeholderSize = height * CONFIG.imageHeightRatio;
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

function stopRotation() {
  isRotating = false;
}

function startRotation() {
  isRotating = true;
}

function toggleRotation() {
  isRotating = !isRotating;
}

// ---------------------MOUTH TRACKING & DRAWING LOGIC------------------------------------------------------------
/**
 * Gets detailed user's mouth data from MediaPipe face tracking
 * @returns {Object} Mouth data with opening, width, and vertical position
 */
function getUserMouthData() {
  // Check if MediaPipe functions exist
  if (typeof getFaceLandmarks !== 'function') {
    return {
      opening: smoothedMouthOpening,
      width: smoothedMouthWidth,
      centerY: smoothedMouthCenterY
    };
  }
  
  try {
    const faces = getFaceLandmarks();
    
    if (!faces || faces.length === 0) {
      return {
        opening: smoothedMouthOpening,
        width: smoothedMouthWidth,
        centerY: smoothedMouthCenterY
      };
    }
    
    const face = faces[0];
    
    if (Array.isArray(face) && face.length >= 292) {
      const upperLip = face[13];
      const lowerLip = face[14];
      const leftCorner = face[61];
      const rightCorner = face[291];
      const noseTip = face[0];
      
      const upperY = upperLip.y || upperLip.Y || upperLip._y;
      const lowerY = lowerLip.y || lowerLip.Y || lowerLip._y;
      const leftX = leftCorner.x || leftCorner.X || leftCorner._x;
      const rightX = rightCorner.x || rightCorner.X || rightCorner._x;
      const noseY = noseTip.y || noseTip.Y || noseTip._y;
      
      if (typeof upperY !== 'undefined' && typeof lowerY !== 'undefined' &&
          typeof leftX !== 'undefined' && typeof rightX !== 'undefined' &&
          typeof noseY !== 'undefined') {
        
        const mouthHeight = Math.abs(lowerY - upperY);
        const rawOpening = constrain(map(mouthHeight, 0.01, 0.06, 0, 1), 0, 1);
        
        const mouthWidthRaw = Math.abs(rightX - leftX);
        const rawWidth = constrain(map(mouthWidthRaw, 0.05, 0.15, 0, 1), 0, 1);
        
        const mouthCenter = (upperY + lowerY) / 2;
        const relativeY = mouthCenter - noseY;
        const rawCenterY = constrain(map(relativeY, 0, 0.1, -1, 1), -1, 1);
        
        smoothedMouthOpening = lerp(smoothedMouthOpening, rawOpening, 0.3);
        smoothedMouthWidth = lerp(smoothedMouthWidth, rawWidth, 0.3);
        smoothedMouthCenterY = lerp(smoothedMouthCenterY, rawCenterY, 0.3);
        
        return {
          opening: smoothedMouthOpening,
          width: smoothedMouthWidth,
          centerY: smoothedMouthCenterY
        };
      }
    }
    
  } catch (e) {
    console.error('Error getting mouth data:', e);
  }
  
  return {
    opening: smoothedMouthOpening,
    width: smoothedMouthWidth,
    centerY: smoothedMouthCenterY
  };
}

/**
 * Gets user's mouth opening amount from MediaPipe face tracking
 * Returns smoothed value for natural motion
 * @returns {number} Normalized mouth opening (0 = closed, 1 = fully open)
 */
function getUserMouthOpening() {
  if (typeof getFaceLandmarks !== 'function') {
    return smoothedMouthOpening;
  }
  
  try {
    const faces = getFaceLandmarks();
    
    if (!faces || faces.length === 0) {
      return smoothedMouthOpening;
    }
    
    const face = faces[0];
    
    if (Array.isArray(face) && face.length >= 15) {
      const upperLipInner = face[13];
      const lowerLipInner = face[14];
      
      const upperY = upperLipInner.y || upperLipInner.Y || upperLipInner._y;
      const lowerY = lowerLipInner.y || lowerLipInner.Y || lowerLipInner._y;
      
      if (typeof upperY !== 'undefined' && typeof lowerY !== 'undefined') {
        const mouthHeight = Math.abs(lowerY - upperY);
        const rawValue = constrain(map(mouthHeight, 0.01, 0.06, 0, 1), 0, 1);
        smoothedMouthOpening = lerp(smoothedMouthOpening, rawValue, 0.3);
        
        return smoothedMouthOpening;
      }
    }
    
  } catch (e) {
    console.error('Error getting mouth opening:', e);
  }
  
  return smoothedMouthOpening;
}

/**
 * Draws a procedurally generated mouth using shapes (alternative to image-based mouth)
 */
function drawProceduralMouth(x, y, targetHeight, useUserMouth = false) {
  let mouthWidth, mouthHeight, mouthYOffset, mouthCurvature;
  
  if (useUserMouth) {
    const mouthData = getUserMouthData();
    
    const baseMouthWidth = targetHeight * 0.2;
    const baseMouthHeight = targetHeight * 0.08;
    
    mouthWidth = baseMouthWidth * (0.8 + mouthData.width * 0.4);
    mouthHeight = baseMouthHeight * (0.5 + mouthData.opening * 1.5);
    
    const baseOffset = targetHeight * 0.15;
    const verticalMovement = mouthData.centerY * 20;
    mouthYOffset = baseOffset + verticalMovement + (mouthData.opening * 10);
    
    const smileFactor = (mouthData.width - 0.5) * 2;
    mouthCurvature = smileFactor * 30;
    
  } else {
    const mouthOpenAmount = (sin(millis() * CONFIG.mouthSpeakingSpeed) + 1) / 2;
    
    const baseMouthWidth = targetHeight * 0.2;
    const baseMouthHeight = targetHeight * 0.08;
    
    mouthWidth = baseMouthWidth;
    mouthHeight = baseMouthHeight * (0.5 + mouthOpenAmount * 1.0);
    mouthYOffset = targetHeight * 0.15;
    mouthCurvature = 0;
  }
  
  push();
  translate(x, y + mouthYOffset);
  
  fill(0);
  noStroke();
  
  beginShape();
  
  const numPoints = 20;
  
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const xPos = map(t, 0, 1, -mouthWidth / 2, mouthWidth / 2);
    
    const topCurve = -mouthHeight / 2 + abs(sin(t * PI)) * (mouthHeight * 0.3);
    const topY = topCurve + sin(t * PI) * (mouthCurvature * 0.3);
    
    vertex(xPos, topY);
  }
  
  for (let i = numPoints; i >= 0; i--) {
    const t = i / numPoints;
    const xPos = map(t, 0, 1, -mouthWidth / 2, mouthWidth / 2);
    
    const bottomCurve = mouthHeight / 2 - abs(sin(t * PI)) * (mouthHeight * 0.2);
    const bottomY = bottomCurve + sin(t * PI) * mouthCurvature;
    
    vertex(xPos, bottomY);
  }
  
  endShape(CLOSE);
  
  if (useUserMouth) {
    const mouthData = getUserMouthData();
    if (mouthData.opening > 0.3) {
      fill(0, 0, 0, 150);
      ellipse(0, mouthHeight * 0.2, mouthWidth * 0.6, mouthHeight * 0.8);
    }
  }
  
  pop();
}




// ---------------------SUIT INTRO LOGIC----------------------------
/**
 * Draws the greeting message for the currently introduced suit
 */
function drawSuitGreeting() {
  const deck = DECKS[currentDeckIndex];
  
  push();
  fill(0);
  textSize(28);
  textStyle(BOLD);
  
  const numSuits = deck.suits.length;
  const angleStep = TWO_PI / numSuits;
  const startAngle = -PI / 2;
  const suitAngle = startAngle + (currentIntroSuitIndex * angleStep) + rotationAngle;
  
  const centerX = width / 2;
  const centerY = height / 2;
  const textDistance = height * CONFIG.circleRadiusRatio + 100;
  
  const textX = centerX + cos(suitAngle) * textDistance;
  const textY = centerY + sin(suitAngle) * textDistance;
  
  text(suitIntroMessage, textX, textY);
  pop();
}

/**
 * Draws an animated speaking mouth overlay on a suit using IMAGE
 */
function drawSpeakingMouth(suitIndex, x, y, targetHeight, useUserMouth = false) {
  if (!mouthImages[suitIndex]) return;
  
  const mouthImg = mouthImages[suitIndex];
  const mouthAspectRatio = mouthImg.width / mouthImg.height;
  
  let mouthWidth, mouthHeight, mouthYOffset, mouthAlpha, mouthRotation;
  
  if (useUserMouth) {
    const mouthData = getUserMouthData();
    
    const verticalScale = 0.7 + (mouthData.opening * 0.6);
    const horizontalScale = 0.8 + (mouthData.width * 0.4);
    
    mouthHeight = targetHeight * verticalScale;
    mouthWidth = mouthHeight * mouthAspectRatio * horizontalScale;
    
    const baseOffset = 0;
    const verticalMovement = mouthData.centerY * 20;
    mouthYOffset = baseOffset + verticalMovement + (mouthData.opening * 10);
    
    const smileFactor = (mouthData.width - 0.5) * 2;
    mouthRotation = smileFactor * 0.08;
    
    mouthAlpha = 255;
    
  } else {
    const mouthOpenAmount = (sin(millis() * CONFIG.mouthSpeakingSpeed) + 1) / 2;
    const mouthScale = CONFIG.mouthMinScale + (mouthOpenAmount * (CONFIG.mouthMaxScale - CONFIG.mouthMinScale));
    mouthHeight = targetHeight * mouthScale;
    mouthWidth = mouthHeight * mouthAspectRatio;
    mouthYOffset = (1 - mouthScale) * CONFIG.mouthYOffset;
    mouthAlpha = 255 - (mouthOpenAmount * CONFIG.mouthTransparencyVariation);
    mouthRotation = 0;
  }
  
  push();
  translate(x, y + mouthYOffset);
  rotate(mouthRotation);
  tint(255, mouthAlpha);
  image(mouthImg, 0, 0, mouthWidth, mouthHeight);
  pop();
}

function getSuitInfo(suitIndex) {
  const deck = DECKS[currentDeckIndex];
  if (suitIndex >= 0 && suitIndex < deck.suits.length) {
    return deck.suits[suitIndex];
  }
  return null;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}