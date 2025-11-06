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
}

function draw() {
  background(255);
  
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
          continuousRotation = true; // Start rotation right away
          
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
    
    // Check if final message duration has passed
    if (finalMessageShown && centerMessage && centerMessageStartTime && !mouthsStaticAfterMessage) {
      const finalMessageElapsed = millis() - centerMessageStartTime;
      if (finalMessageElapsed >= CONFIG.initialRotationDuration) {
        centerMessage = null;
        mouthsStaticAfterMessage = true;
      }
    }
    
    // Check if cards should start slowing down
    if (cardsFallingActive && !cardsSlowingDown && !cardsFrozen) {
      const cardsFallingElapsed = millis() - cardsFallingStartTime;
      if (cardsFallingElapsed >= CONFIG.cardFallingDuration) {
        cardsSlowingDown = true;
        slowDownStartTime = millis();
      }
    }
    
    // Check if cards should be completely frozen after slow-down
    if (cardsSlowingDown && !cardsFrozen) {
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
    // Smooth horizontal movement
    swayPhase: random(TWO_PI),
    swaySpeed: random(0.5, 1.5) * CONFIG.cardSwayFrequency,
    swayAmplitude: random(0.5, 1.5) * CONFIG.cardSwayAmplitude,
    // Smooth rotation
    rotationAngle: random(TWO_PI),
    rotationPhase: random(TWO_PI),
    rotationSpeed: random(0.3, 1.5) * CONFIG.cardRotationSpeed,
    rotationAmplitude: random(0.3, 1.0) * CONFIG.cardRotationAmplitude,
    // Gentle vertical oscillation
    verticalOscillation: random(TWO_PI),
    verticalOscillationSpeed: random(0.01, 0.03)
  };
}

/**
 * Updates and draws all falling cards with smooth floating motion and deceleration
 */
function updateAndDrawFallingCards() {
  // Calculate deceleration factor (ease-out)
  let speedMultiplier = 1.0;
  if (cardsSlowingDown && !cardsFrozen) {
    const slowDownElapsed = millis() - slowDownStartTime;
    const slowDownProgress = slowDownElapsed / CONFIG.cardSlowDownDuration;
    // Ease-out cubic function for smooth deceleration
    speedMultiplier = 1 - pow(slowDownProgress, 3);
  } else if (cardsFrozen) {
    speedMultiplier = 0;
  }
  
  // Only spawn new cards if not slowing down or frozen
  if (!cardsSlowingDown && !cardsFrozen && millis() - lastCardSpawnTime > CONFIG.cardSpawnInterval) {
    for (let i = 0; i < CONFIG.cardSpawnCount; i++) {
      const card = createFallingCard();
      if (card) {
        fallingCards.push(card);
      }
    }
    lastCardSpawnTime = millis();
  }
  
  // Update and draw each card
  for (let i = fallingCards.length - 1; i >= 0; i--) {
    const card = fallingCards[i];
    
    // Update position with deceleration
    if (speedMultiplier > 0) {
      // Smooth falling with slight vertical oscillation
      const verticalWobble = sin(card.verticalOscillation) * 0.3 * speedMultiplier;
      card.y += (card.speed + verticalWobble) * speedMultiplier;
      card.verticalOscillation += card.verticalOscillationSpeed * speedMultiplier;
      
      // Smooth horizontal swaying (like a pendulum)
      card.swayPhase += card.swaySpeed * 0.01 * speedMultiplier;
      const swayOffset = sin(card.swayPhase) * card.swayAmplitude;
      card.x += swayOffset * 0.05 * speedMultiplier;
      
      // Smooth rotation oscillation (pendulum-like)
      card.rotationPhase += card.rotationSpeed * speedMultiplier;
      card.rotationAngle = sin(card.rotationPhase) * card.rotationAmplitude;
    }
    
    // Draw card with smooth transformations
    push();
    translate(card.x, card.y);
    rotate(card.rotationAngle);
    image(card.img, 0, 0, card.width, card.height);
    pop();
    
    // Only remove cards that have fallen off screen if not frozen
    if (!cardsFrozen && card.y - card.height / 2 > height + 100) {
      fallingCards.splice(i, 1);
    }
  }
}

/**
 * Draws a centered message on the canvas
 * @param {string} message - The text message to display
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
 * @param {boolean} isStatic - If true, mouth doesn't animate
 */
function drawSpeakingMouth(suitIndex, x, y, targetHeight, isStatic = false) {
  if (!mouthImages[suitIndex]) return;
  
  const mouthImg = mouthImages[suitIndex];
  const mouthAspectRatio = mouthImg.width / mouthImg.height;
  
  let mouthScale, mouthYOffset, mouthAlpha;
  
  if (isStatic) {
    // Static mouth - no animation, fully visible
    mouthScale = CONFIG.mouthMaxScale;
    mouthYOffset = 0;
    mouthAlpha = 255;
  } else {
    // Animated mouth
    const mouthOpenAmount = (sin(millis() * CONFIG.mouthSpeakingSpeed) + 1) / 2;
    mouthScale = CONFIG.mouthMinScale + (mouthOpenAmount * (CONFIG.mouthMaxScale - CONFIG.mouthMinScale));
    mouthYOffset = (1 - mouthScale) * CONFIG.mouthYOffset;
    mouthAlpha = 255 - (mouthOpenAmount * CONFIG.mouthTransparencyVariation);
  }
  
  const mouthHeight = targetHeight * mouthScale;
  const mouthWidth = mouthHeight * mouthAspectRatio;
  
  push();
  tint(255, mouthAlpha);
  image(mouthImg, x, y + mouthYOffset, mouthWidth, mouthHeight);
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
      
      // Show mouths when message is displayed OR during individual intros OR after final message (static)
      const shouldShowMouth = centerMessage !== null || isIntroducing || mouthsStaticAfterMessage;
      
      if (shouldShowMouth) {
        drawSpeakingMouth(i, x, y, targetHeight, mouthsStaticAfterMessage);
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