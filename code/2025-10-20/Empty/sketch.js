// The setup function runs once when the program starts

function setup() {
  // create a canvas that fills the entire window
  createCanvas(windowWidth, windowHeight);
}

// The draw function runs continuously in a loop
// to create animations and render graphics
// until the program is stopped
// or noLoop() is called

function draw() {
  
  // set a pulsing background like breathing white light
  let r = map(sin(frameCount * 0.05), -1, 1, 100, 255);
  background(r, r, r);
  
}
