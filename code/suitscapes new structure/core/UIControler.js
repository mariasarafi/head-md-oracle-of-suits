// core/UIController.js
//
// Handles drawing simple UI elements (header info box and bottom prompt box).
// This keeps your scenes cleaner.

class UIController {
  constructor() {}

  drawHeader(p, deckLabel, seasonName, element, emotion) {
    const pad = 16;
    const boxW = p.width * 0.5;
    const boxH = 90;

    p.push();
    p.noStroke();
    p.fill(0, 0, 0, 150); // translucent dark background
    p.rect(p.width - boxW - pad, pad, boxW, boxH, 12);

    p.fill(255);
    p.textAlign(p.LEFT, p.TOP);
    p.textSize(16);
    p.textStyle(p.BOLD);
    p.text(deckLabel || "", p.width - boxW - pad + 12, pad + 12);

    p.textSize(14);
    p.textStyle(p.NORMAL);
    p.text(
      `Season: ${seasonName || ""}\nElement: ${element || ""}\nEmotion: ${emotion || ""}`,
      p.width - boxW - pad + 12,
      pad + 34
    );
    p.pop();
  }

  showPrompt(p, textStr) {
    const pad = 16;
    const boxW = p.width * 0.7;
    const boxH = p.height * 0.22;

    const x = (p.width - boxW) / 2;
    const y = p.height - boxH - pad;

    p.push();
    p.noStroke();
    p.fill(0, 0, 0, 160);
    p.rect(x, y, boxW, boxH, 16);

    p.fill(255, 230, 255);
    p.textAlign(p.CENTER, p.TOP);
    p.textSize(20);
    p.text(
      textStr || "",
      x + 20,
      y + 20,
      boxW - 40, // constrain text block width
      boxH - 40
    );
    p.pop();
  }
}
