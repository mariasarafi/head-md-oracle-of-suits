let currentDeckIndex;
let suitImages = [];
let mouthImages = [];
let imagesLoaded = false;
let rotationAngle = 0;
let isRotating = true;
let startTime;
let initialRotationDuration = CONFIG.initialRotationDuration;
let timeThresholdPassed = false;
let suitIntroActive = false;
let suitIntroStartTime;
let currentIntroSuitIndex = 0;
let shakeOffsetX = 0;
let shakeOffsetY = 0;
let introductionsComplete = false;
let centerMessage = null;
let centerMessageStartTime;
let suitIntroMessage = null; // Message displayed near the introducing suit

function preload() {
  currentDeckIndex = CONFIG.defaultDeckIndex;
  
  const deck = DECKS[currentDeckIndex];
  let loadedCount = 0;
  const totalImages = deck.suits.length * 2;
  
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
      }
    );
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  imageMode(CENTER);
  textAlign(CENTER, CENTER);
  
  startTime = millis();
  
  // Set initial center message
  const deck = DECKS[currentDeckIndex];
  centerMessage = `We are the four suit symbols of the ${deck.name} deck`;
  centerMessageStartTime = millis();
}

function draw() {
  background(255);
  
  if (imagesLoaded) {
    const currentTime = millis();
    const elapsedTime = currentTime - startTime;
    
    // Clear center message after initial rotation duration
    if (elapsedTime >= initialRotationDuration && centerMessage && !timeThresholdPassed) {
      centerMessage = null;
      timeThresholdPassed = true;
    }
    
    if (timeThresholdPassed && isRotating) {
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
    
    if (isRotating) {
      rotationAngle += CONFIG.rotationSpeed;
    }
    
    if (suitIntroActive && !introductionsComplete) {
      const introElapsed = millis() - suitIntroStartTime;
      const deck = DECKS[currentDeckIndex];
      
      if (introElapsed < CONFIG.bottomSuitIntroDuration) {
        shakeOffsetX = random(-CONFIG.shakeIntensity, CONFIG.shakeIntensity);
        shakeOffsetY = random(-CONFIG.shakeIntensity, CONFIG.shakeIntensity);
        
        // Set suit intro message from config
        suitIntroMessage = deck.suits[currentIntroSuitIndex].introMessage;
      } else {
        shakeOffsetX = 0;
        shakeOffsetY = 0;
        suitIntroMessage = null;
        currentIntroSuitIndex++;
        
        if (currentIntroSuitIndex < deck.suits.length) {
          suitIntroStartTime = millis();
        } else {
          suitIntroActive = false;
          introductionsComplete = true;
          // Set final center message
          centerMessage = 'All together we are creating a card game';
          centerMessageStartTime = millis();
        }
      }
    }
    
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
  
  // Use the message from config instead of hardcoded text
  text(suitIntroMessage, textX, textY);
  pop();
}

/**
 * Draws an animated speaking mouth overlay on a suit
 * @param {number} suitIndex - Index of the suit in the array
 * @param {number} x - X position of the suit
 * @param {number} y - Y position of the suit
 * @param {number} targetHeight - Height of the suit image
 */
function drawSpeakingMouth(suitIndex, x, y, targetHeight) {
  if (!mouthImages[suitIndex]) return;
  
  const mouthImg = mouthImages[suitIndex];
  const mouthAspectRatio = mouthImg.width / mouthImg.height;
  
  const mouthOpenAmount = (sin(millis() * CONFIG.mouthSpeakingSpeed) + 1) / 2;
  
  const mouthScale = CONFIG.mouthMinScale + (mouthOpenAmount * (CONFIG.mouthMaxScale - CONFIG.mouthMinScale));
  
  const mouthHeight = targetHeight * mouthScale;
  const mouthWidth = mouthHeight * mouthAspectRatio;
  
  const mouthYOffset = (1 - mouthScale) * CONFIG.mouthYOffset;
  
  push();
  tint(255, 255 - (mouthOpenAmount * CONFIG.mouthTransparencyVariation));
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
      
      // Show mouths when center message is displayed OR during individual intros
      const shouldShowMouth = centerMessage !== null || isIntroducing;
      
      if (shouldShowMouth) {
        drawSpeakingMouth(i, x, y, targetHeight);
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