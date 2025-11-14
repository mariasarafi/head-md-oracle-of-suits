// Define the decks and their corresponding suit images
const DECKS = [
  {
    name: 'Hanafuda',
    order: 0,
    suits: [
      {
        name: 'Spring',
        sorder: 0,
        image: 'Images/Hanafuda/Hanafuda-Spring-March-cherry-blossom-No-Mouth.png',
        sizeRatio: 0.3, // ← Add this: 1.0 = normal size, 0.5 = half size, 1.5 = 1.5x size
        mouth: 'Images/Kiss.png',
        emotion: 'Love',
        season: 'Spring',
        introMessage: 'Hi, I am Cherry Blossom from Japan',
        landscape: 'Images/Jass/Landscapes/Jass-Spring.png'
      },
      {
        name: 'Summer',
        sorder: 1,
        image: 'Images/Hanafuda/Hanafuda-Summer-June-peony.png',
        sizeRatio: 0.3, // ← Add this: 1.0 = normal size, 0.5 = half size, 1.5 = 1.5x size
        mouth: 'Images/Jass/Jass-Summer-Shield-Mouth.png',
        emotion: 'Joy',
        season: 'Summer',
        introMessage: 'Hi, I am Summer',
        landscape: 'Images/Jass/Landscapes/Jass-Summer.png'
      },
      {
        name: 'Autumn',
        sorder: 2,
        image: 'Images/Hanafuda/Hanafuda-Autumn-September-chrysanthemum.png',
        sizeRatio: 0.3, // ← Add this: 1.0 = normal size, 0.5 = half size, 1.5 = 1.5x size
        mouth: 'Images/Jass/Jass-Autumn-Acorn-Mouth.png',
        emotion: 'Sadness',
        season: 'Autumn',
        introMessage: 'Hi, I am Autumn',
        landscape: 'Images/Jass/Landscapes/Jass-Autumn.png'
      },
      {
        name: 'Winter',
        sorder: 3,
        image: 'Images/Hanafuda/Hanafuda-Winter-December-paulownia.png',
        sizeRatio: 0.3, // ← Add this: 1.0 = normal size, 0.5 = half size, 1.5 = 1.5x size
        mouth: 'Images/Anger.png',
        emotion: 'Anger',
        season: 'Winter',
        introMessage: 'Hi, I am Winter',
        landscape: 'Images/Jass/Landscapes/Jass-Winter.png'
      }
    ],
        // Card images for falling animation
    cards: [
      'Images/Hanafuda/Cards/Hanafuda-Spring-March-Kasu-2.png',
      'Images/Hanafuda/Cards/Hanafuda-Spring-April-Tane.png',
      //'Images/Hanafuda/Cards/Hanafuda-Spring-May-Tane.png',
      //'Images/Hanafuda/Cards/Hanafuda-Summer-June-Tane.png',
      'Images/Hanafuda/Cards/Hanafuda-Summer-July-Tane.png',
      'Images/Hanafuda/Cards/Hanafuda-Summer-August-Tane.png',
      //'Images/Hanafuda/Cards/Hanafuda-Autumn-September-Tane.png',
      'Images/Hanafuda/Cards/Hanafuda-Autumn-October-Tane.png',
      'Images/Hanafuda/Cards/Hanafuda-Autumn-November-Tane.png',
      //'Images/Hanafuda/Cards/Hanafuda-Winter-December-Hikari.png',
      'Images/Hanafuda/Cards/Hanafuda-Winter-January-Hikari.png',
      'Images/Hanafuda/Cards/Hanafuda-Winter-February-Tane.png',
      'Images/suitscapes-intro-logo-contrast.png'
    ]  
  },
  {
    name: 'French',
    order: 1,
    suits: [
      {
        name: 'Spade',
        sorder: 0,
        image: 'Images/Bicycle/Bicycle-Spring-Spades.png',
        sizeRatio: 0.2, // ← Add this: 1.0 = normal size, 0.5 = half size, 1.5 = 1.5x size
        mouth: 'Images/Smile.png',
        emotion: 'Love',
        season: 'Spring',
        introMessage: 'Hi, I am Spade',
        landscape: 'Images/Jass/Landscapes/Jass-Spring.png'
      },
      {
        name: 'Heart',
        sorder: 1,
        image: 'Images/Bicycle/Bicycle-Summer-Hearts.png',
        sizeRatio: 0.2, // ← Add this: 1.0 = normal size, 0.5 = half size, 1.5 = 1.5x size
        mouth: 'Images/Smile.png',
        emotion: 'Joy',
        season: 'Summer',
        introMessage: 'Hi, I am the French Heart',
        landscape: 'Images/Jass/Landscapes/Jass-Summer.png'
      },
      {
        name: 'Club',
        sorder: 2,
        image: 'Images/Bicycle/Bicycle-Autumn-Clubs.png',
        sizeRatio: 0.2, // ← Add this: 1.0 = normal size, 0.5 = half size, 1.5 = 1.5x size
        mouth: 'Images/Jass/Jass-Autumn-Acorn-Mouth.png',
        emotion: 'Sadness',
        season: 'Autumn',
        introMessage: 'Hi, I am Club',
        landscape: 'Images/Jass/Landscapes/Jass-Autumn.png'
      },
      {
        name: 'Diamond',
        sorder: 3,
        image: 'Images/Bicycle/Bicycle-Winter-Diamonds.png',
        sizeRatio: 0.2, // ← Add this: 1.0 = normal size, 0.5 = half size, 1.5 = 1.5x size
        mouth: 'Images/Jass/Jass-Winter-Bell-Mouth.png',
        emotion: 'Anger',
        season: 'Winter',
        introMessage: 'Hi, I am Diamond',
        landscape: 'Images/Jass/Landscapes/Jass-Winter.png'
      }
    ],
        // Card images for falling animation
    cards: [
      //'Images/Bicycle/Cards/Bicycle-Spring-S7.jpg',
      'Images/Bicycle/Cards/Bicycle-Spring-SQ.jpg',
      'Images/Bicycle/Cards/Bicycle-Spring-SJ.jpg',
      //'Images/Bicycle/Cards/Bicycle-Spring-SK.jpg',
      'Images/Bicycle/Cards/Bicycle-Summer-H10.jpg',
      //'Images/Bicycle/Cards/Bicycle-Summer-HJ.jpg',
      'Images/Bicycle/Cards/Bicycle-Summer-HQ.jpg',
      //'Images/Bicycle/Cards/Bicycle-Summer-HK.jpg',
      //'Images/Bicycle/Cards/Bicycle-Autumn-CA.jpg',
      'Images/Bicycle/Cards/Bicycle-Autumn-CJ.jpg',
      //'Images/Bicycle/Cards/Bicycle-Autumn-CQ.jpg',
      'Images/Bicycle/Cards/Bicycle-Autumn-CK.jpg',
      'Images/Bicycle/Cards/Bicycle-Winter-DA.jpg',
      //'Images/Bicycle/Cards/Bicycle-Winter-DJ.jpg',
      'Images/Bicycle/Cards/Bicycle-Winter-DQ.jpg',
      //'Images/Bicycle/Cards/Bicycle-Winter-DK.jpg',
      'Images/suitscapes-intro-logo-contrast.png'
    ]  
  },
  {
    name: 'Latin',
    order: 2,
    suits: [
      {
        name: 'Spade',
        sorder:0,
        image: 'Images/Ducale/Ducale-Spring-spade-carte-portoghesi.png',
        sizeRatio: 0.3, // ← Add this: 1.0 = normal size, 0.5 = half size, 1.5 = 1.5x size
        mouth: 'Images/Jass/Jass-Spring-Rose-Mouth.png',
        emotion: 'Love',
        season: 'Spring',
        introMessage: 'Hi, I am Spade',
        landscape: 'Images/Jass/Landscapes/Jass-Spring.png'
      },
      {
        name: 'Coppe',
        sorder: 1,
        image: 'Images/Ducale/Ducale-Summer-coppe-carte-spagnole.png',
        sizeRatio: 0.3, // ← Add this: 1.0 = normal size, 0.5 = half size, 1.5 = 1.5x size
        mouth: 'Images/Jass/Jass-Summer-Shield-Mouth.png',
        emotion: 'Joy',
        season: 'Summer',
        introMessage: 'Hi, I am Coppe',
        landscape: 'Images/Jass/Landscapes/Jass-Summer.png'
      },
      {
        name: 'Bastoni',
        sorder: 2,
        image: 'Images/Ducale/Ducale-Autumn-bastoni-carte-spagnole.png',
        sizeRatio: 0.3, // ← Add this: 1.0 = normal size, 0.5 = half size, 1.5 = 1.5x size
        mouth: 'Images/Sadness.png',
        emotion: 'Sadness',
        season: 'Autumn',
        introMessage: 'Hi, I am the Latin Bastoni',
        landscape: 'Images/Jass/Landscapes/Jass-Autumn.png'
      },
      {
        name: 'Denari',
        sorder: 3,
        image: 'Images/Ducale/Ducale-Winter-denari-carte-spagnole.png',
        sizeRatio: 0.3, // ← Add this: 1.0 = normal size, 0.5 = half size, 1.5 = 1.5x size
        mouth: 'Images/Jass/Jass-Winter-Bell-Mouth.png',
        emotion: 'Anger',
        season: 'Winter',
        introMessage: 'Hi, I am Denari',
        landscape: 'Images/Jass/Landscapes/Jass-Winter.png'
      }
    ],
        // Card images for falling animation
    cards: [
      'Images/Ducale/Cards/Ducale-Autumn-B3.jpg',
      'Images/Ducale/Cards/Ducale-Autumn-BJ.jpg',
      //'Images/Ducale/Cards/Ducale-Autumn-BQ.jpg',
      //'Images/Ducale/Cards/Ducale-Spring-S1.jpg',
      'Images/Ducale/Cards/Ducale-Spring-SJ.jpg',
      'Images/Ducale/Cards/Ducale-Spring-SQ.jpg',
      'Images/Ducale/Cards/Ducale-Summer-C2.jpg',
      'Images/Ducale/Cards/Ducale-Summer-CJ.jpg',
      //'Images/Ducale/Cards/Ducale-Summer-CK.jpg',
      //'Images/Ducale/Cards/Ducale-Winter-P5.jpg',
      'Images/Ducale/Cards/Ducale-Winter-PJ.jpg',
      'Images/Ducale/Cards/Ducale-Winter-PQ.jpg',
      'Images/suitscapes-intro-logo-contrast.png'     
    ]
  },
  {
    name: 'Jass',
    order: 3,
    suits: [
      {
        name: 'Rose',
        sorder: 0,
        image: 'Images/Jass/Jass-Spring-Rose-No-Mouth.png',
        sizeRatio: 0.3, // ← Add this: 1.0 = normal size, 0.5 = half size, 1.5 = 1.5x size
        mouth: 'Images/Jass/Jass-Spring-Rose-Mouth.png',
        emotion: 'Love',
        season: 'Spring',
        introMessage: 'Hi, I am Rose', 
        landscape: 'Images/Jass/Landscapes/Jass-Spring.png'
      },
      {
        name: 'Shield',
        sorder: 1,
        image: 'Images/Jass/Jass-Summer-Shield-No-Mouth.png',
        sizeRatio: 0.3, // ← Add this: 1.0 = normal size, 0.5 = half size, 1.5 = 1.5x size
        mouth: 'Images/Jass/Jass-Summer-Shield-Mouth.png',
        emotion: 'Joy',
        season: 'Summer',
        introMessage: 'Hi, I am Shield',
        landscape: 'Images/Jass/Landscapes/Jass-Summer.png'
      },
      {
        name: 'Acorn',
        sorder: 2,
        image: 'Images/Jass/Jass-Autumn-Acorn-No-Mouth.png',
        sizeRatio: 0.3, // ← Add this: 1.0 = normal size, 0.5 = half size, 1.5 = 1.5x size
        mouth: 'Images/Jass/Jass-Autumn-Acorn-Mouth.png',
        emotion: 'Sadness',
        season: 'Autumn',
        introMessage: 'Hi, I am Acorn',
        landscape: 'Images/Jass/Landscapes/Jass-Autumn.png'
      },
      {
        name: 'Bell',
        sorder: 3,
        image: 'Images/Jass/Jass-Winter-Bell-No-Mouth.png',
        sizeRatio: 0.2, // ← Add this: 1.0 = normal size, 0.5 = half size, 1.5 = 1.5x size
        mouth: 'Images/Anger-Mouth.png',
        emotion: 'Anger',
        season: 'Winter',
        introMessage: 'Hi, I am the Swiss Bell',
        landscape: 'Images/Jass/Landscapes/Jass-Winter.png'
      }
    ],
        // Card images for falling animation
    cards: [
      'Images/Jass/Cards/Jass-Autumn-C10.jpg',
      //'Images/Jass/Cards/Jass-Autumn-Acorns.jpg',
      'Images/Jass/Cards/Jass-Autumn-CU.jpg',
      'Images/Jass/Cards/Jass-Spring-RA.jpg',
      //'Images/Jass/Cards/Jass-Spring-RK.jpg',
      'Images/Jass/Cards/Jass-Spring-Roses.jpg',
      'Images/Jass/Cards/Jass-Summer-S10.jpg',
      'Images/Jass/Cards/Jass-Summer-SO.jpg',
      //'Images/Jass/Cards/Jass-Summer-Shields.jpg',
      'Images/Jass/Cards/Jass-Winter-B10.jpg',
      'Images/Jass/Cards/Jass-Winter-BU.jpg',
      'Images/Jass/Cards/Jass-Winter-Bells.jpg',
      'Images/suitscapes-intro-logo-contrast.png'
    ]  
  }
];

// Audio configuration by season
const SEASON_AUDIO = {
  Spring: {
    name: 'Spring',
    file: 'Audio/Spring-birds.wav',
    volume: 3.0,
    rate: 1.0
  },
  Summer: {
    name: 'Summer',
    file: 'Audio/Summer-cigal.wav',
    volume: 0.5,
    rate: 1.0
  },
  Autumn: {
    name: 'Autumn',
    file: 'Audio/Autumn-Rain-332496-dave-girtsman.m4a',
    volume: 0.5,
    rate: 1.0
  },
  Winter: {
    name: 'Winter',
    file: 'Audio/Winter-Wind-Trees-502523-simon-spiers.m4a',
    volume: 0.5,
    rate: 1.0
  }
};

// Configuration parameters
const CONFIG = {
  // Deck settings
  defaultDeckIndex: 0,
  
  // Layout settings
  circleRadiusRatio: 0.32,      // Radius of the circular arrangement (relative to canvas height)
  //imageHeightRatio: 0.25,       // Height of suit images (relative to canvas height)
  
  // Rotation settings
  rotationSpeed: 0.01,         // Speed of circular rotation (radians per frame)
  initialMessageDelay: 1000,    // Delay before showing initial message in milliseconds (2 seconds)
  initialRotationDuration: 2000, // Duration of intro rotation in milliseconds (3 seconds)

  // Suit introduction settings
  SuitIntroDuration: 3000, // Duration each suit shakes and introduces itself (3 seconds)
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

  // Falling cards settings - SMOOTH FLOATING LIKE LEAVES
  cardHeightRatio: 0.3,        // Height of falling cards (relative to canvas height)
  
  cardOpacity: 180,             // Opacity of falling cards (0 = invisible, 255 = fully opaque)
  
  cardFallSpeed: 4,           // Slower base falling speed for gentle float 2.5 medium
  
  cardFallSpeedVariation: 0.2,  // Less variation for smoother movement
  cardSwayAmplitude: 40,        // Horizontal sway distance (side to side)
  cardSwayFrequency: 0.5,       // How fast cards sway (lower = slower, smoother)
  cardRotationSpeed: 0.003,     // Slower rotation for gentle tumbling
  cardRotationAmplitude: 0.3,   // Maximum rotation amount (radians)
  
  cardSpawnInterval: 200,       // Spawn cards less frequently --- affects how visible background is
  cardSpawnCount: 1,            // Fewer cards at a time
  cardFallingDuration: 20000,    // Duration cards fall before freezing (10 seconds)
  
};

// Opening messages configuration
const OPENING_MESSAGES = [
  {
    text: "SUITSCAPES",
    color: [255, 0, 0],    // White
    size: 64,
    style: 'bold',             // Use string instead of BOLD
    duration: 5000             // 5 seconds
  },
  {
    text: "Landscapes of Suits",
    color: [255, 0, 0],         // Red
    size: 48,
    style: 'bold',            // Use string instead of NORMAL
    duration: 5000              // 5 seconds
  }
];

// Optional: Wave instruction message
const WAVE_INSTRUCTION = {
  text: "Wave Hello",
  color: [255, 0, 0],      // Light gray
  size: 32,
  yOffset: 100                 // Pixels below center message
};