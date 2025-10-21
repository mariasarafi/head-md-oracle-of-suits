// create a class called Planet
class Planet {
  //create an x,y position for the planet
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.color = color(random(50, 255), random(50, 255), random(50, 255));
  }
  // draw the planet as a circle
  draw() {
    //stroke(255,255,255);
    //strokeWeight(2);
    //fill(100, 150, 250);
    
    // empty circle that moves slightly each frame
    noFill();
    stroke(0,20);
  
    this.x += random(-1,1);
    this.y += random(-1,1);

    //fill(this.color);
    //noStroke();

    ellipse(this.x, this.y, 50, 50);
  }
}

// create a single planet object
let planets = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  //position the planet in the center of the canvas
 
}

function draw() {
  //background(180);
  for (let planet of planets) {
    planet.draw();
  }
}

//when the mouse is pressed, create a new planet at the mouse position
function mousePressed() {
  let newPlanet = new Planet(mouseX, mouseY);
  planets.push(newPlanet);
}
