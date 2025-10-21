/* class Thing {
  constructor(x, y, hex = '#2ea36f') {
    this.x = x;
    this.y = y;
    this.r = random(10, 60);

    // allow passing a p5.Color or a hex string; fall back to default
    if (hex instanceof p5.Color) {
      this.c = hex;
    } else {
      this.c = color(String(hex)); // safe conversion to string
    }

    // ensure alpha is applied
    this.c.setAlpha(140);
  }

  draw() {
    noStroke();
    fill(this.c);
    ellipse(this.x, this.y, this.r * 2);
  }
}*/
/*class Thing {
  constructor(x, y, hex = '#2ea36f') {
    this.x = x;
    this.baseY = y;
    this.r = random(10, 60);

    // color handling (accept hex string or p5.Color)
    if (hex instanceof p5.Color) {
      this.c = hex;
    } else {
      this.c = color(String(hex));
    }
    this.c.setAlpha(140);

    // movement / oscillation parameters
    this.phase = random(TWO_PI);
    this.speed = random(0.01, 0.06); // how fast it oscillates

    // determine the vertical zone bounds based on canvas center and 30% height band
    const cy = height / 2;
    const hz = 0.30 * height; // half-band distance from center line

    let minY, maxY;

    if (abs(this.baseY - cy) <= hz) {
      // inside the horizontal green band -> stay within the band
      minY = cy - hz + this.r;
      maxY = cy + hz - this.r;
    } else if (this.baseY < cy - hz) {
      // above the band -> stay in the upper region
      minY = this.r;
      maxY = cy - hz - this.r;
    } else {
      // below the band -> stay in the lower region
      minY = cy + hz + this.r;
      maxY = height - this.r;
    }

    // fallback if space is tight
    if (minY > maxY) {
      minY = maxY = constrain(this.baseY, this.r, height - this.r);
    }

    // center and amplitude for smooth sinusoidal motion
    this.centerY = (minY + maxY) / 2;
    this.amplitude = (maxY - minY) / 2;
  }

  draw() {
    // update phase and compute current y with sine; amplitude 0 = stationary
    this.phase += this.speed;
    const y = this.centerY + (this.amplitude > 0 ? sin(this.phase) * this.amplitude : 0);

    noStroke();
    fill(this.c);
    ellipse(this.x, y, this.r * 2);
  }
}
// ...existing code...*/

class Thing {
  constructor(x, y, hex = '#2ea36f') {
    this.x = x;
    this.baseY = y;
    this.r = random(10, 60);

    // color handling (accept hex string or p5.Color)
    if (hex instanceof p5.Color) {
      this.c = hex;
    } else {
      this.c = color(String(hex));
    }
    this.c.setAlpha(140);

    // movement / oscillation parameters
    this.phase = random(TWO_PI);
    this.speed = random(0.01, 0.06); // how fast it oscillates

    // determine the vertical zone bounds based on canvas center and 30% height band
    const cy = height / 2;
    const hz = 0.30 * height; // half-band distance from center line

    let minY, maxY;

    if (abs(this.baseY - cy) <= hz) {
      // inside the horizontal green band -> stay within the band
      minY = cy - hz + this.r;
      maxY = cy + hz - this.r;
    } else if (this.baseY < cy - hz) {
      // above the band -> stay in the upper region
      minY = this.r;
      maxY = cy - hz - this.r;
    } else {
      // below the band -> stay in the lower region
      minY = cy + hz + this.r;
      maxY = height - this.r;
    }

    // fallback if space is tight
    if (minY > maxY) {
      minY = maxY = constrain(this.baseY, this.r, height - this.r);
    }

    // center and amplitude for smooth sinusoidal motion
    this.centerY = (minY + maxY) / 2;
    this.amplitude = (maxY - minY) / 2;
  }

  draw() {
    // update phase and compute current y with sine; amplitude 0 = stationary
    this.phase += this.speed;
    const y = this.centerY + (this.amplitude > 0 ? sin(this.phase) * this.amplitude : 0);

    noStroke();
    fill(this.c);

    // apply global camera horizontal offset so all Things move left/right with hand
    const drawX = this.x + (typeof camOffsetX !== 'undefined' ? camOffsetX : 0);
    ellipse(drawX, y, this.r * 2);
  }
}