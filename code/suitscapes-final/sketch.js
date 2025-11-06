let currentDeckIndex;
let suitImages = [];
let mouthImages = [];
let cardImages = [];
let imagesLoaded = false;
let rotationAngle = 0;
let isRotating = true;
let startTime;
let timeThresholdPassed = false;
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
let cardsFrozen = false;
let cardsSlowingDown = false;
let slowDownStartTime = 0;
let fallingCards = [];
let lastCardSpawnTime = 0;
let mouthsStaticAfterMessage = false;
let finalMessageShown = false;
let continuousRotation = false;
let trackUserMouth = false;
let trackingMessageShown = false; // New flag for tracking message
let smoothedMouthOpening = 0; // New: smoothed mouth value for natural motion
let smoothedMouthWidth = 0; // Track mouth width
let smoothedMouthCenterY = 0; // Track vertical position of mouth center

function preload() {
  currentDeckIndex = CONFIG.defaultDeckIndex;
  
  const deck = DECKS[currentDeckIndex];
  let loadedCount = 0;
  const totalImages = deck.suits.length * 2 + (deck.cards ? deck.cards.length : 0);
  
  // Load suit images and mouths
  for (let i = 0; i < deck.suits.length; i++) {
    const suit = deck.suits[i];
    
    loadImage(
      suit.image,
      (img) => {
        suitImages[i] = img;
        loadedCount++;
        if (loadedCount === totalImages) {
          imagesLoaded = true;
        }
      },
      (err) => {
        console.error(`Failed to load suit: ${suit.name}`, err);
        suitImages[i] = null;
        loadedCount++;
        if (loadedCount === totalImages) {
          imagesLoaded = true;
        }
      }
    );
    
    loadImage(
      suit.mouth,
      (img) => {
        mouthImages[i] = img;
        loadedCount++;
        if (loadedCount === totalImages) {
          imagesLoaded = true;
        }
      },
      (err) => {
        console.error(`Failed to load mouth for: ${suit.name}`, err);
        mouthImages[i] = null;
        loadedCount++;
        if (loadedCount === totalImages) {
          imagesLoaded = true;
        }
      }
    );
  }
  
  // Load card images
  if (deck.cards) {
    for (let i = 0; i < deck.cards.length; i++) {
      loadImage(
        deck.cards[i],
        (img) => {
          cardImages[i] = img;
          loadedCount++;
          if (loadedCount === totalImages) {
            imagesLoaded = true;
          }
        },
        (err) => {
          console.error(`Failed to load card: ${deck.cards[i]}`, err);
          cardImages[i] = null;
          loadedCount++;
          if (loadedCount === totalImages) {
            imagesLoaded = true;
          }
        }
      );
    }
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  imageMode(CENTER);
  textAlign(CENTER, CENTER);
  angleMode(RADIANS);
  
  startTime = millis();
  
  // Initialize MediaPipe
  if (typeof setupFace === 'function') setupFace();
  if (typeof setupVideo === 'function') setupVideo();
}

function draw() {
  background(255);
  
  // DEBUG: Show mouth tracking status in corner
  if (trackUserMouth) {
    const mouthValue = getUserMouthOpening();
    push();
    fill(0);
    textSize(16);
    textAlign(LEFT, TOP);
    text(`Tracking: ${trackUserMouth}`, 10, 10);
    text(`Mouth: ${mouthValue.toFixed(2)}`, 10, 30);
    
    // Draw a visual indicator
    noStroke();
    fill(255, 0, 0);
    rect(10, 50, 100, 20);
    fill(0, 255, 0);
    rect(10, 50, mouthValue * 100, 20);
    pop();
  }
  
  if (imagesLoaded) {
    const currentTime = millis();
    const elapsedTime = currentTime - startTime;
    
    // Show initial message after delay
    if (elapsedTime >= CONFIG.initialMessageDelay && !centerMessage && !timeThresholdPassed) {
      const deck = DECKS[currentDeckIndex];
      centerMessage = `We are the four suit symbols of the ${deck.name} deck`;
      centerMessageStartTime = millis();
    }
    
    // Clear center message after duration (from when message appeared)
    if (centerMessage && centerMessageStartTime && !timeThresholdPassed) {
      const messageElapsed = millis() - centerMessageStartTime;
      if (messageElapsed >= CONFIG.initialRotationDuration) {
        centerMessage = null;
        timeThresholdPassed = true;
      }
    }
    
    // Initial rotation before suit introductions
    if (timeThresholdPassed && isRotating && !introductionsComplete) {
      const deck = DECKS[currentDeckIndex];
      const numSuits = deck.suits.length;
      const angleStep = TWO_PI / numSuits;
      
      const normalizedAngle = rotationAngle % TWO_PI;
      const nearestSuitAngle = Math.round(normalizedAngle / angleStep) * angleStep;
      const distanceToNearest = Math.abs(normalizedAngle - nearestSuitAngle);
      
      if (distanceToNearest < 0.02) {
        isRotating = false;
        rotationAngle = Math.round(rotationAngle / angleStep) * angleStep;
        suitIntroActive = true;
        currentIntroSuitIndex = 0;
        suitIntroStartTime = millis();
      }
    }
    
    // Rotation logic: initial rotation OR continuous rotation after introductions complete
    if (isRotating || continuousRotation) {
      rotationAngle += CONFIG.rotationSpeed;
    }
    
    if (suitIntroActive && !introductionsComplete) {
      const introElapsed = millis() - suitIntroStartTime;
      const deck = DECKS[currentDeckIndex];
      
      if (introElapsed < CONFIG.bottomSuitIntroDuration) {
        shakeOffsetX = random(-CONFIG.shakeIntensity, CONFIG.shakeIntensity);
        shakeOffsetY = random(-CONFIG.shakeIntensity, CONFIG.shakeIntensity);
        
        suitIntroMessage = deck.suits[currentIntroSuitIndex].introMessage;
      } else {
        shakeOffsetX = 0;
        shakeOffsetY = 0;
        suitIntroMessage = null;
        currentIntroSuitIndex++;
        
        if (currentIntroSuitIndex < deck.suits.length) {
          suitIntroStartTime = millis();
        } else {
          // All introductions complete - START CONTINUOUS ROTATION IMMEDIATELY
          suitIntroActive = false;
          introductionsComplete = true;
          continuousRotation = true;
          
          // Start cards falling immediately
          if (!cardsFallingActive) {
            cardsFallingActive = true;
            cardsFallingStartTime = millis();
            lastCardSpawnTime = millis();
          }
        }
      }
    }
    
    // Show final message after a brief delay from when cards start falling
    if (introductionsComplete && !finalMessageShown && cardsFallingActive) {
      const cardsFallingElapsed = millis() - cardsFallingStartTime;
      if (cardsFallingElapsed >= 500) {
        centerMessage = 'Together we are creating a card game';
        centerMessageStartTime = millis();
        finalMessageShown = true;
      }
    }
    
    // Check if final message duration has passed - START MOUTH TRACKING & SHOW NEW MESSAGE
    if (finalMessageShown && centerMessage && centerMessageStartTime && !mouthsStaticAfterMessage) {
      const finalMessageElapsed = millis() - centerMessageStartTime;
      if (finalMessageElapsed >= CONFIG.initialRotationDuration) {
        centerMessage = null;
        mouthsStaticAfterMessage = true;
        // START TRACKING USER'S MOUTH
        trackUserMouth = true;
        // SHOW TRACKING MESSAGE
        centerMessage = 'Display tracked mouth now starts';
        centerMessageStartTime = millis();
        trackingMessageShown = true;
      }
    }
    
    // Clear tracking message after duration
    if (trackingMessageShown && centerMessage && centerMessageStartTime) {
      const trackingMessageElapsed = millis() - centerMessageStartTime;
      if (trackingMessageElapsed >= CONFIG.initialRotationDuration) {
        centerMessage = null;
      }
    }
    
    // Check if cards should start slowing down (ONLY IF CONFIGURED)
    if (CONFIG.cardsShouldStop && cardsFallingActive && !cardsSlowingDown && !cardsFrozen) {
      const cardsFallingElapsed = millis() - cardsFallingStartTime;
      if (cardsFallingElapsed >= CONFIG.cardFallingDuration) {
        cardsSlowingDown = true;
        slowDownStartTime = millis();
      }
    }
    
    // Check if cards should be completely frozen after slow-down (ONLY IF CONFIGURED)
    if (CONFIG.cardsShouldStop && cardsSlowingDown && !cardsFrozen) {
      const slowDownElapsed = millis() - slowDownStartTime;
      if (slowDownElapsed >= CONFIG.cardSlowDownDuration) {
        cardsFrozen = true;
      }
    }
    
    // Handle falling cards (draw behind suits)
    if (cardsFallingActive) {
      updateAndDrawFallingCards();
    }
    
    // Always draw suits (they stay visible)
    drawSuitsInCircle();
    
    // Draw center message if it exists
    if (centerMessage) {
      drawCenterMessage(centerMessage);
    }
    
    if (suitIntroMessage) {
      drawSuitGreeting();
    }
  } else {
    fill(0);
    textSize(24);
    text('Loading images...', width / 2, height / 2);
  }
}

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
    
    // MediaPipe Face Mesh mouth landmarks:
    // 13: Upper lip center
    // 14: Lower lip center
    // 61: Left mouth corner
    // 291: Right mouth corner
    // 0: Nose tip (reference for vertical position)
    
    if (Array.isArray(face) && face.length >= 292) {
      const upperLip = face[13];
      const lowerLip = face[14];
      const leftCorner = face[61];
      const rightCorner = face[291];
      const noseTip = face[0];
      
      // Get Y coordinates
      const upperY = upperLip.y || upperLip.Y || upperLip._y;
      const lowerY = lowerLip.y || lowerLip.Y || lowerLip._y;
      const leftX = leftCorner.x || leftCorner.X || leftCorner._x;
      const rightX = rightCorner.x || rightCorner.X || rightCorner._x;
      const noseY = noseTip.y || noseTip.Y || noseTip._y;
      
      if (typeof upperY !== 'undefined' && typeof lowerY !== 'undefined' &&
          typeof leftX !== 'undefined' && typeof rightX !== 'undefined' &&
          typeof noseY !== 'undefined') {
        
        // Calculate mouth height (opening)
        const mouthHeight = Math.abs(lowerY - upperY);
        const rawOpening = constrain(map(mouthHeight, 0.01, 0.06, 0, 1), 0, 1);
        
        // Calculate mouth width
        const mouthWidthRaw = Math.abs(rightX - leftX);
        const rawWidth = constrain(map(mouthWidthRaw, 0.05, 0.15, 0, 1), 0, 1);
        
        // Calculate vertical position relative to nose
        const mouthCenter = (upperY + lowerY) / 2;
        const relativeY = mouthCenter - noseY; // Positive = below nose
        const rawCenterY = constrain(map(relativeY, 0, 0.1, -1, 1), -1, 1);
        
        // Smooth all values
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
  // Check if MediaPipe functions exist
  if (typeof getFaceLandmarks !== 'function') {
    return smoothedMouthOpening; // Return last known value if function unavailable
  }
  
  try {
    const faces = getFaceLandmarks();
    
    if (!faces || faces.length === 0) {
      return smoothedMouthOpening; // Return last value if no face detected
    }
    
    const face = faces[0];
    
    // MediaPipe Face Mesh returns an array of 478 landmarks
    if (Array.isArray(face) && face.length >= 15) {
      const upperLipInner = face[13];  // Upper lip center inner
      const lowerLipInner = face[14];  // Lower lip center inner
      
      // Try different property names
      const upperY = upperLipInner.y || upperLipInner.Y || upperLipInner._y;
      const lowerY = lowerLipInner.y || lowerLipInner.Y || lowerLipInner._y;
      
      if (typeof upperY !== 'undefined' && typeof lowerY !== 'undefined') {
        // Calculate vertical distance between lips
        const mouthHeight = Math.abs(lowerY - upperY);
        
        // Normalize to 0-1 range
        const rawValue = constrain(map(mouthHeight, 0.01, 0.06, 0, 1), 0, 1);
        
        // Smooth the value for natural motion (lerp creates smooth transitions)
        // 0.3 = smoothing factor (lower = smoother but more lag, higher = more responsive)
        smoothedMouthOpening = lerp(smoothedMouthOpening, rawValue, 0.3);
        
        return smoothedMouthOpening;
      }
    }
    
  } catch (e) {
    console.error('Error getting mouth opening:', e);
  }
  
  return smoothedMouthOpening; // Return last known value on error
}

/**
 * Creates a new falling card object with smooth floating physics
 */
function createFallingCard() {
  const deck = DECKS[currentDeckIndex];
  if (!deck.cards || cardImages.length === 0) return null;
  
  const randomCardIndex = floor(random(cardImages.length));
  const cardImg = cardImages[randomCardIndex];
  
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
  // Calculate speed multiplier based on configuration
  let speedMultiplier = 1.0;
  
  if (CONFIG.cardsShouldStop || CONFIG.cardsStopAfterMessage) {
    if (cardsSlowingDown && !cardsFrozen) {
      const slowDownElapsed = millis() - slowDownStartTime;
      const slowDownProgress = slowDownElapsed / CONFIG.cardSlowDownDuration;
      speedMultiplier = 1 - pow(slowDownProgress, 3);
    } else if (cardsFrozen) {
      speedMultiplier = 0;
    }
  }

  if (cardsSlowingDown && !cardsFrozen) {
    const slowDownElapsed = millis() - slowDownStartTime;
    const slowDownProgress = slowDownElapsed / CONFIG.cardSlowDownDuration;
    speedMultiplier = 1 - pow(slowDownProgress, 3);
  } else if (cardsFrozen) {
    speedMultiplier = 0;
  }
  
  if (!cardsSlowingDown && !cardsFrozen && millis() - lastCardSpawnTime > CONFIG.cardSpawnInterval) {
    for (let i = 0; i < CONFIG.cardSpawnCount; i++) {
      const card = createFallingCard();
      if (card) {
        fallingCards.push(card);
      }
    }
    lastCardSpawnTime = millis();
  }
  
  for (let i = fallingCards.length - 1; i >= 0; i--) {
    const card = fallingCards[i];
    
    if (speedMultiplier > 0) {
      const verticalWobble = sin(card.verticalOscillation) * 0.3 * speedMultiplier;
      card.y += (card.speed + verticalWobble) * speedMultiplier;
      card.verticalOscillation += card.verticalOscillationSpeed * speedMultiplier;
      
      card.swayPhase += card.swaySpeed * 0.01 * speedMultiplier;
      const swayOffset = sin(card.swayPhase) * card.swayAmplitude;
      card.x += swayOffset * 0.05 * speedMultiplier;
      
      card.rotationPhase += card.rotationSpeed * speedMultiplier;
      card.rotationAngle = sin(card.rotationPhase) * card.rotationAmplitude;
    }
    
    push();
    translate(card.x, card.y);
    rotate(card.rotationAngle);
    image(card.img, 0, 0, card.width, card.height);
    pop();
    
    if (!cardsFrozen && card.y - card.height / 2 > height + 100) {
      fallingCards.splice(i, 1);
    }
  }
}

/**
 * Draws a centered message on the canvas
 */
function drawCenterMessage(message) {
  push();
  fill(0);
  textSize(32);
  textStyle(BOLD);
  text(message, width / 2, height / 2);
  pop();
}

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
 * Draws an animated speaking mouth overlay on a suit
 * @param {number} suitIndex - Index of the suit in the array
 * @param {number} x - X position of the suit
 * @param {number} y - Y position of the suit
 * @param {number} targetHeight - Height of the suit image
 * @param {boolean} useUserMouth - If true, use tracked user mouth instead of animation
 */
function drawSpeakingMouth(suitIndex, x, y, targetHeight, useUserMouth = false) {
  if (!mouthImages[suitIndex]) return;
  
  const mouthImg = mouthImages[suitIndex];
  const mouthAspectRatio = mouthImg.width / mouthImg.height;
  
  let mouthWidth, mouthHeight, mouthYOffset, mouthAlpha, mouthRotation;
  
  if (useUserMouth) {
    // USE TRACKED USER'S MOUTH - FULLY NATURAL BEHAVIOR
    const mouthData = getUserMouthData();
    
    // Vertical scaling based on mouth opening
    // Closed mouth: 0.7, Open mouth: 1.3
    const verticalScale = 0.7 + (mouthData.opening * 0.6);
    
    // Horizontal scaling based on detected mouth width
    // Narrow: 0.8, Wide (smiling): 1.2
    const horizontalScale = 0.8 + (mouthData.width * 0.4);
    
    // Calculate dimensions
    mouthHeight = targetHeight * verticalScale;
    mouthWidth = mouthHeight * mouthAspectRatio * horizontalScale;
    
    // Vertical position: moves based on tracked position
    // When mouth moves up (raising chin), image moves up
    // When mouth moves down, image moves down
    const baseOffset = 0; // Default center position
    const verticalMovement = mouthData.centerY * 20; // ±20 pixels movement
    mouthYOffset = baseOffset + verticalMovement + (mouthData.opening * 10); // Also moves down when opening
    
    // Rotation: smile causes slight tilt, frown causes opposite tilt
    // Width change indicates smile/frown
    const smileFactor = (mouthData.width - 0.5) * 2; // -1 to 1
    mouthRotation = smileFactor * 0.08; // Up to ±0.08 radians tilt
    
    // Opacity: fully visible during tracking
    mouthAlpha = 255;
    
  } else {
    // ANIMATED MOUTH (original behavior for messages)
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

function drawSuitsInCircle() {
  const centerX = width / 2;
  const centerY = height / 2;
  const deck = DECKS[currentDeckIndex];
  const numSuits = deck.suits.length;
  
  const circleRadius = height * CONFIG.circleRadiusRatio;
  const angleStep = TWO_PI / numSuits;
  const startAngle = -PI / 2;
  
  for (let i = 0; i < numSuits; i++) {
    const suit = deck.suits[i];
    const angle = startAngle + (i * angleStep) + rotationAngle;
    
    let x = centerX + cos(angle) * circleRadius;
    let y = centerY + sin(angle) * circleRadius;
    
    const isIntroducing = suitIntroActive && !introductionsComplete && i === currentIntroSuitIndex;
    if (isIntroducing) {
      x += shakeOffsetX;
      y += shakeOffsetY;
    }
    
    if (suitImages[i]) {
      const img = suitImages[i];
      const aspectRatio = img.width / img.height;
      
      const targetHeight = height * CONFIG.imageHeightRatio;
      const targetWidth = targetHeight * aspectRatio;
      
      image(img, x, y, targetWidth, targetHeight);
      
      // Show mouths logic:
      // - During messages: animated mouth
      // - During individual intros: animated mouth
      // - After final message ends: USER-TRACKED mouth
      const shouldShowMouth = centerMessage !== null || isIntroducing || trackUserMouth;
      
      if (shouldShowMouth) {
        // Use user's tracked mouth ONLY after tracking starts and no messages showing
        const useTrackedMouth = trackUserMouth && !isIntroducing;
        drawSpeakingMouth(i, x, y, targetHeight, useTrackedMouth);
      }
    } else {
      const placeholderSize = height * CONFIG.imageHeightRatio;
      push();
      fill(200);
      stroke(100);
      strokeWeight(2);
      circle(x, y, placeholderSize);
      fill(100);
      textSize(12);
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