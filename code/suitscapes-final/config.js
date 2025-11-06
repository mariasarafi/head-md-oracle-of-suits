// Define the decks and their corresponding suit images
const DECKS = [
  {
    name: 'Jass',
    suits: [
      {
        name: 'Rose',
        image: 'Images/Jass/Jass-Spring-Rose-No-Mouth.png',
        mouth: 'Images/Jass/Jass-Spring-Rose-Mouth.png',
        emotion: 'Love',
        season: 'Spring',
        introMessage: 'Hi, I am Rose'
      },
      {
        name: 'Shield',
        image: 'Images/Jass/Jass-Summer-Shield-No-Mouth.png',
        mouth: 'Images/Jass/Jass-Summer-Shield-Mouth.png',
        emotion: 'Joy',
        season: 'Summer',
        introMessage: 'Hi, I am Shield'
      },
      {
        name: 'Acorn',
        image: 'Images/Jass/Jass-Autumn-Acorn-No-Mouth.png',
        mouth: 'Images/Jass/Jass-Autumn-Acorn-Mouth.png',
        emotion: 'Sadness',
        season: 'Autumn',
        introMessage: 'Hi, I am Acorn'
      },
      {
        name: 'Bell',
        image: 'Images/Jass/Jass-Winter-Bell-No-Mouth.png',
        mouth: 'Images/Jass/Jass-Winter-Bell-Mouth.png',
        emotion: 'Anger',
        season: 'Winter',
        introMessage: 'Hi, I am Bell'
      }
    ],
        // Card images for falling animation
    cards: [
      'Images/Jass/Cards/Jass-Autumn-C10.jpg',
      'Images/Jass/Cards/Jass-Autumn-Acorns.jpg',
      'Images/Jass/Cards/Jass-Autumn-CU.jpg',
      'Images/Jass/Cards/Jass-Spring-R10.jpg',
      'Images/Jass/Cards/Jass-Spring-RK.jpg',
      'Images/Jass/Cards/Jass-Spring-Roses.jpg',
      'Images/Jass/Cards/Jass-Summer-S10.jpg',
      'Images/Jass/Cards/Jass-Summer-SK.jpg',
      'Images/Jass/Cards/Jass-Summer-Shields.jpg',
      'Images/Jass/Cards/Jass-Winter-B10.jpg',
      'Images/Jass/Cards/Jass-Winter-BK.jpg',
      'Images/Jass/Cards/Jass-Winter-Bells.jpg'
    ]  
  } /*,
  {
    name: 'French',
    suits: [
      'Images/French/French-Hearts.png',
      'Images/French/French-Diamonds.png',
      'Images/French/French-Clubs.png',
      'Images/French/French-Spades.png'
    ]
  },
  {
    name: 'German',
    suits: [
      'Images/German/German-Hearts.png',
      'Images/German/German-Bells.png',
      'Images/German/German-Acorns.png',
      'Images/German/German-Leaves.png'
    ]
  },
  {
    name: 'Spanish',
    suits: [
      'Images/Spanish/Spanish-Cups.png',
      'Images/Spanish/Spanish-Coins.png',
      'Images/Spanish/Spanish-Clubs.png',
      'Images/Spanish/Spanish-Swords.png'
    ]
  }*/
];

// Configuration parameters
const CONFIG = {
  // Deck settings
  defaultDeckIndex: 0,
  
  // Layout settings
  circleRadiusRatio: 0.35,      // Radius of the circular arrangement (relative to canvas height)
  imageHeightRatio: 0.25,       // Height of suit images (relative to canvas height)
  
  // Rotation settings
  rotationSpeed: 0.005,         // Speed of circular rotation (radians per frame)
  initialMessageDelay: 1000,    // Delay before showing initial message in milliseconds (2 seconds)
  initialRotationDuration: 3000, // Duration of intro rotation in milliseconds (3 seconds)

  // Suit introduction settings
  bottomSuitIntroDuration: 2000, // Duration each suit shakes and introduces itself (3 seconds)
  shakeIntensity: 5,            // Amplitude of rattle shake in pixels
  
  // Mouth animation settings
  // Faster talking
  // mouthSpeakingSpeed: 0.03

  // Subtle mouth movement
  //mouthMinScale: 0.85, mouthMaxScale: 1.0

  // Exaggerated mouth movement
  //mouthMinScale: 0.5, mouthMaxScale: 1.2

  // No transparency effect
  //mouthTransparencyVariation: 0

  // Default mouth animation settings
  mouthSpeakingSpeed: 0.015,    // Speed of mouth open/close animation (higher = faster)
  mouthMinScale: 0.7,           // Minimum mouth scale when closed (0.5 = very closed, 0.9 = slightly closed)
  mouthMaxScale: 1.0,           // Maximum mouth scale when fully open
  mouthYOffset: 5,              // Vertical movement when mouth opens/closes in pixels
  mouthTransparencyVariation: 50, // Transparency variation (0 = no variation, 100 = full variation)

  // Falling cards settings - SMOOTH FLOATING LIKE LEAVES
  cardHeightRatio: 0.3,        // Height of falling cards (relative to canvas height)
  cardFallSpeed: 2,           // Slower base falling speed for gentle float
  cardFallSpeedVariation: 0.3,  // Less variation for smoother movement
  cardSwayAmplitude: 30,        // Horizontal sway distance (side to side)
  cardSwayFrequency: 0.8,       // How fast cards sway (lower = slower, smoother)
  cardRotationSpeed: 0.005,     // Slower rotation for gentle tumbling
  cardRotationAmplitude: 0.3,   // Maximum rotation amount (radians)
  cardSpawnInterval: 300,       // Spawn cards less frequently
  cardSpawnCount: 2,            // Fewer cards at a time
  cardFallingDuration: 20000,    // Duration cards fall before freezing (10 seconds)
  
  // NEW: Card falling control options
  cardsShouldStop: true, // Set to true if you want cards to stop falling
  cardFallingDuration: 15000, // Duration before slowing down (ms) - only used if cardsShouldStop = true
  cardSlowDownDuration: 3000, // Duration of slow-down phase (ms) - only used if cardsShouldStop = true
  cardsStopAfterMessage: false // Set to true to stop cards after final message appears
  
};