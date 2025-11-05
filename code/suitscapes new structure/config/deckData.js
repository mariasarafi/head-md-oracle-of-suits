const DECKS = [
  {
    id: 1,
    label: "Jass",
    backImg: "assets/images/jass-back.jpg",
    order: 1,
    suits: [
      {
        name: "Rose",
        seasonName: "Spring",
        seasonOrder: 1,
        element: "Fire",
        emotion: "Love",
        landscapeImg: "assets/images/Jass-Spring.png" ,
        interactions: [
          {
            type: "face",
            mode: "smile",

            // Optional instructional overlay frames for this interaction.
            // They animate in GIFOverlay during calibration/prompt.
            // If you don't want an overlay, just remove this array.
            gifFrames: [
              "Assets/Images/Jass/Jass-Summer-Joy-01.png",
              "Assets/Images/Jass/Jass-Summer-Joy-02.png"
            ],

            textIntro: "Spring — Love.\nShow your smile.",
            textDuring: "Please smile",
            durationSec: 5
          }
        ]
      },
      // ...summer, autumn, winter
      {
        name: "Shield",
        seasonName: "Summer",
        seasonOrder: 2,
        element: "Water",
        emotion: "Joy",
        landscapeImg: "assets/images/Jass-Summer.png",
        interactions: [
          {
            type: "face",
            mode: "smile",

            // Optional instructional overlay frames for this interaction.
            // They animate in GIFOverlay during calibration/prompt.
            // If you don't want an overlay, just remove this array.
            gifFrames: [
              "Assets/Images/Jass/Jass-Summer-Joy-01.png",
              "Assets/Images/Jass/Jass-Summer-Joy-02.png"
            ],

            textIntro: "Spring — Love.\nShow your smile.",
            textDuring: "Please smile",
            durationSec: 5
          }
        ]
      },
      {
        name: "Acorn",
        seasonName: "Autumn",
        seasonOrder: 3,
        element: "Earth",
        emotion: "Sadness",
        landscapeImg: "assets/images/Jass-Autumn.png",
        interactions: [
          {
            type: "face",
            mode: "smile",

            // Optional instructional overlay frames for this interaction.
            // They animate in GIFOverlay during calibration/prompt.
            // If you don't want an overlay, just remove this array.
            gifFrames: [
              "Assets/Images/Jass/Jass-Summer-Joy-01.png",
              "Assets/Images/Jass/Jass-Summer-Joy-02.png"
            ],

            textIntro: "Spring — Love.\nShow your smile.",
            textDuring: "Please smile",
            durationSec: 5
          }
        ]
      },
      {
        name: "Bell",
        seasonName: "Winter",
        seasonOrder: 4,
        element: "Air",
        emotion: "Anger",
        landscapeImg: "assets/images/Jass-Winter.png",
        interactions: [
          {
            type: "face",
            mode: "smile",

            // Optional instructional overlay frames for this interaction.
            // They animate in GIFOverlay during calibration/prompt.
            // If you don't want an overlay, just remove this array.
            gifFrames: [
              "Assets/Images/Jass/Jass-Summer-Joy-01.png",
              "Assets/Images/Jass/Jass-Summer-Joy-02.png"
            ],

            textIntro: "Spring — Love.\nShow your smile.",
            textDuring: "Please smile",
            durationSec: 5
          }
        ]
      }
    ]
  },
  // deck 2, 3, 4 ...
  {
    id: 2,
    label: "Latin - Italian",
    backImg: "assets/images/Jass-Back.jpg",
    order: 2,
    suits: [
      {
        name: "Sword",
        seasonName: "Spring",
        seasonOrder: 1,
        element: "Fire",
        emotion: "Love",
        landscapeImg: "assets/images/Jass-Spring.png" /*,
        interactions: [
          { type:"face", textIntro:"Show calm...", textDuring:"Hold calm face...", durationSec:5 },
          { type:"hand", textIntro:"Now feel water...", textDuring:"Flow slowly...", durationSec:5 }
        ]*/
      },
      // ...summer, autumn, winter
      {
        name: "Club",
        seasonName: "Summer",
        seasonOrder: 2,
        element: "Water",
        emotion: "Joy",
        landscapeImg: "assets/images/Jass-Summer.png"/*,
        interactions: [
          { type:"face", textIntro:"Show calm...", textDuring:"Hold calm face...", durationSec:5 },
          { type:"hand", textIntro:"Now feel water...", textDuring:"Flow slowly...", durationSec:5 }
        ]*/
      },
      {
        name: "Cup",
        seasonName: "Autumn",
        seasonOrder: 3,
        element: "Earth",
        emotion: "Sadness",
        landscapeImg: "assets/images/Jass-Autumn.png"/*,
        interactions: [
          { type:"face", textIntro:"Show calm...", textDuring:"Hold calm face...", durationSec:5 },
          { type:"hand", textIntro:"Now feel water...", textDuring:"Flow slowly...", durationSec:5 }
        ]*/
      },
      {
        name: "Coin",
        seasonName: "Winter",
        seasonOrder: 4,
        element: "Air",
        emotion: "Anger",
        landscapeImg: "assets/images/Jass-Winter.png"/*,
        interactions: [
          { type:"face", textIntro:"Show calm...", textDuring:"Hold calm face...", durationSec:5 },
          { type:"hand", textIntro:"Now feel water...", textDuring:"Flow slowly...", durationSec:5 }
        ]*/
      }
    ]
  },
  {
    id: 3,
    label: "French",
    backImg: "assets/images/Jass-Back.jpg",
    order: 3,
    suits: [
      {
        name: "Spade",
        seasonName: "Spring",
        seasonOrder: 1,
        element: "Fire",
        emotion: "Love",
        landscapeImg: "assets/images/Jass-Spring.png" /*,
        interactions: [
          { type:"face", textIntro:"Show calm...", textDuring:"Hold calm face...", durationSec:5 },
          { type:"hand", textIntro:"Now feel water...", textDuring:"Flow slowly...", durationSec:5 }
        ]*/
      },
      // ...summer, autumn, winter
      {
        name: "Heart",
        seasonName: "Summer",
        seasonOrder: 2,
        element: "Water",
        emotion: "Joy",
        landscapeImg: "assets/images/Jass-Summer.png"/*,
        interactions: [
          { type:"face", textIntro:"Show calm...", textDuring:"Hold calm face...", durationSec:5 },
          { type:"hand", textIntro:"Now feel water...", textDuring:"Flow slowly...", durationSec:5 }
        ]*/
      },
      {
        name: "Club",
        seasonName: "Autumn",
        seasonOrder: 3,
        element: "Earth",
        emotion: "Sadness",
        landscapeImg: "assets/images/Jass-Autumn.png"/*,
        interactions: [
          { type:"face", textIntro:"Show calm...", textDuring:"Hold calm face...", durationSec:5 },
          { type:"hand", textIntro:"Now feel water...", textDuring:"Flow slowly...", durationSec:5 }
        ]*/
      },
      {
        name: "Diamond",
        seasonName: "Winter",
        seasonOrder: 4,
        element: "Air",
        emotion: "Anger",
        landscapeImg: "assets/images/Jass-Winter.png"/*,
        interactions: [
          { type:"face", textIntro:"Show calm...", textDuring:"Hold calm face...", durationSec:5 },
          { type:"hand", textIntro:"Now feel water...", textDuring:"Flow slowly...", durationSec:5 }
        ]*/
      }
    ]
  },
  {
    id: 4,
    label: "Hanafuda",
    backImg: "assets/images/Jass-Back.jpg",
    order: 4,
    suits: [
      {
        name: "Rose",
        seasonName: "Spring",
        seasonOrder: 1,
        element: "Fire",
        emotion: "Love",
        landscapeImg: "assets/images/Jass-Spring.png" /*,
        interactions: [
          { type:"face", textIntro:"Show calm...", textDuring:"Hold calm face...", durationSec:5 },
          { type:"hand", textIntro:"Now feel water...", textDuring:"Flow slowly...", durationSec:5 }
        ]*/
      },
      // ...summer, autumn, winter
      {
        name: "Rose",
        seasonName: "Summer",
        seasonOrder: 2,
        element: "Water",
        emotion: "Joy",
        landscapeImg: "assets/images/Jass-Summer.png"/*,
        interactions: [
          { type:"face", textIntro:"Show calm...", textDuring:"Hold calm face...", durationSec:5 },
          { type:"hand", textIntro:"Now feel water...", textDuring:"Flow slowly...", durationSec:5 }
        ]*/
      },
      {
        name: "Acorn",
        seasonName: "Autumn",
        seasonOrder: 3,
        element: "Earth",
        emotion: "Sadness",
        landscapeImg: "assets/images/Jass-Autumn.png"/*,
        interactions: [
          { type:"face", textIntro:"Show calm...", textDuring:"Hold calm face...", durationSec:5 },
          { type:"hand", textIntro:"Now feel water...", textDuring:"Flow slowly...", durationSec:5 }
        ]*/
      },
      {
        name: "Bell",
        seasonName: "Winter",
        seasonOrder: 4,
        element: "Air",
        emotion: "Anger",
        landscapeImg: "assets/images/Jass-Winter.png"/*,
        interactions: [
          { type:"face", textIntro:"Show calm...", textDuring:"Hold calm face...", durationSec:5 },
          { type:"hand", textIntro:"Now feel water...", textDuring:"Flow slowly...", durationSec:5 }
        ]*/
      }
    ]
  }
];