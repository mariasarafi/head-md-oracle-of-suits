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
    ]
  
  }/*,
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
  initialRotationDuration: 3000, // Duration of intro rotation in milliseconds (5 seconds)
  
  // Suit introduction settings
  bottomSuitIntroDuration: 3000, // Duration each suit shakes and introduces itself (3 seconds)
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
  mouthTransparencyVariation: 50 // Transparency variation (0 = no variation, 100 = full variation)
};