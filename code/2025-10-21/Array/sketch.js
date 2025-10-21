// ...existing code...
let values = [];
let original = [];
let vel = -0.5;

function setup() {
  createCanvas(windowWidth, windowHeight);
  for (let i = 0; i < 100; i++) {
    const v = random(height);
    values.push(v);
    original.push(v);
  }
}

function draw() {
  background(0);

  // draw the values as rectangles horizontally
  for (let i = 0; i < values.length; i++) {
    const h = max(0, values[i]);
    rect(i * 10, height - h, 10, h);
  }

  // draw the values as rectangles vertically and update movement
  for (let i = 0; i < values.length; i++) {
    const w = max(0, values[i]);
    rect(width - w, i * 10, w, 10);
    values[i] += vel; // change by velocity (positive => grow, negative => shrink)
    values[i] = constrain(values[i], 0, original[i]);
  }

  // when all disappeared, reverse direction to grow them back
  if (values.every(v => v <= 0)) {
    vel = abs(vel); // make positive to grow
  }

  // when all are fully restored, reverse again to shrink
  if (values.every((v, i) => v >= original[i])) {
    vel = -abs(vel); // make negative to shrink
  }
}
// ...existing code...
