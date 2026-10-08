// Hand-drawn vector art for the collectible products.
//
// These replace emoji: emoji render differently on every OS (and on some
// platforms come with an opaque glyph background), they can't be brand-coloured,
// and they don't read at 30 px. Each product below is drawn as paths on a
// transparent canvas, sized to stay legible small, using the Ootybites palette.
//
// Every function draws into a 44×44 box with the origin already translated to
// the centre, so callers just pick a type.

const SIZE = 44;

function roundRect(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  c.beginPath();
  c.moveTo(x + rr, y);
  c.arcTo(x + w, y, x + w, y + h, rr);
  c.arcTo(x + w, y + h, x, y + h, rr);
  c.arcTo(x, y + h, x, y, rr);
  c.arcTo(x, y, x + w, y, rr);
  c.closePath();
}

// Thin dark keyline — makes every item pop against the green hills.
function outline(c: CanvasRenderingContext2D, color = "rgba(20,48,31,0.55)", w = 1.4) {
  c.strokeStyle = color;
  c.lineWidth = w;
  c.stroke();
}

/** Nilgiri tea — a single tipped leaf. */
function drawTeaLeaf(c: CanvasRenderingContext2D) {
  const g = c.createLinearGradient(-10, -12, 8, 12);
  g.addColorStop(0, "#57d78e");
  g.addColorStop(0.55, "#22ab5f");
  g.addColorStop(1, "#166b3d");
  c.save();
  c.rotate(-0.5);
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(0, -14);
  c.bezierCurveTo(10, -8, 11, 7, 0, 14);
  c.bezierCurveTo(-11, 7, -10, -8, 0, -14);
  c.closePath();
  c.fill();
  outline(c);
  // Midrib + veins
  c.strokeStyle = "rgba(255,255,255,0.55)";
  c.lineWidth = 1.3;
  c.beginPath();
  c.moveTo(0, -12);
  c.lineTo(0, 12);
  c.stroke();
  c.lineWidth = 0.9;
  for (let i = -1; i <= 1; i++) {
    const y = i * 5;
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(5.5, y + 3.5);
    c.moveTo(0, y);
    c.lineTo(-5.5, y + 3.5);
    c.stroke();
  }
  c.restore();
}

/** Wild honey — a squat jar with a dipper-gold body. */
function drawHoneyJar(c: CanvasRenderingContext2D) {
  // Body
  const g = c.createLinearGradient(-9, -6, 9, 12);
  g.addColorStop(0, "#f6d873");
  g.addColorStop(0.5, "#e9a53c");
  g.addColorStop(1, "#b86a1a");
  c.fillStyle = g;
  roundRect(c, -10, -6, 20, 19, 5);
  c.fill();
  outline(c);
  // Label band
  c.fillStyle = "rgba(255,252,240,0.92)";
  roundRect(c, -10, 0, 20, 7, 2);
  c.fill();
  // Honey drip motif on the label
  c.fillStyle = "#d98324";
  c.beginPath();
  c.arc(0, 3.4, 2.1, 0, Math.PI * 2);
  c.fill();
  // Neck + lid
  c.fillStyle = "#8a5f34";
  roundRect(c, -7, -11, 14, 6, 2);
  c.fill();
  outline(c);
  // Lid shine
  c.fillStyle = "rgba(255,255,255,0.4)";
  roundRect(c, -5, -10, 5, 2, 1);
  c.fill();
}

/** Ooty chocolate — a bar with one square broken off. */
function drawChocolate(c: CanvasRenderingContext2D) {
  c.save();
  c.rotate(-0.22);
  const g = c.createLinearGradient(-11, -9, 11, 9);
  g.addColorStop(0, "#8a5f34");
  g.addColorStop(0.5, "#6b4423");
  g.addColorStop(1, "#4a2d16");
  c.fillStyle = g;
  roundRect(c, -11, -9, 22, 18, 2.5);
  c.fill();
  outline(c);
  // Segment grooves
  c.strokeStyle = "rgba(0,0,0,0.42)";
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(0, -9);
  c.lineTo(0, 9);
  c.moveTo(-11, 0);
  c.lineTo(11, 0);
  c.stroke();
  // Top-left highlight on each square
  c.fillStyle = "rgba(255,255,255,0.16)";
  c.fillRect(-9.5, -7.5, 8, 2);
  c.fillRect(1.5, -7.5, 8, 2);
  // Foil wrapper peeking at the bottom-right
  c.fillStyle = "#e7e9ea";
  c.beginPath();
  c.moveTo(11, 2);
  c.lineTo(15, 5);
  c.lineTo(11, 9);
  c.closePath();
  c.fill();
  c.restore();
}

/** Varki — the flaky layered Ooty sweet, drawn as stacked golden leaves. */
function drawVarki(c: CanvasRenderingContext2D) {
  c.save();
  c.rotate(0.18);
  const shades = ["#b8813c", "#d29a51", "#e9b66d", "#f6d29a"];
  for (let i = 0; i < 4; i++) {
    c.fillStyle = shades[i];
    c.beginPath();
    c.ellipse(0, 4 - i * 3.1, 12 - i * 0.5, 5.2, 0, 0, Math.PI * 2);
    c.fill();
    if (i === 0) outline(c);
  }
  // Sugar crystals on top
  c.fillStyle = "rgba(255,255,255,0.9)";
  for (let i = 0; i < 5; i++) {
    const a = -0.5 + i * 0.32;
    c.beginPath();
    c.arc(Math.cos(a) * 6.5, -8 + Math.sin(a) * 2, 1.1, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

/** Hill spice — a cardamom pod with a sprig. */
function drawSpice(c: CanvasRenderingContext2D) {
  c.save();
  c.rotate(-0.3);
  const g = c.createLinearGradient(-6, -10, 6, 10);
  g.addColorStop(0, "#9fd8a8");
  g.addColorStop(0.55, "#57b06a");
  g.addColorStop(1, "#2f7a42");
  c.fillStyle = g;
  c.beginPath();
  c.ellipse(0, 1, 7.5, 12, 0, 0, Math.PI * 2);
  c.fill();
  outline(c);
  // Pod ridges
  c.strokeStyle = "rgba(255,255,255,0.5)";
  c.lineWidth = 1;
  for (const dx of [-3.2, 0, 3.2]) {
    c.beginPath();
    c.moveTo(dx, -10);
    c.quadraticCurveTo(dx * 1.25, 0, dx, 11);
    c.stroke();
  }
  // Stem
  c.strokeStyle = "#7a5a22";
  c.lineWidth = 2;
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(0, -11);
  c.lineTo(1.5, -15);
  c.stroke();
  c.restore();
}

const DRAWERS: Record<string, (c: CanvasRenderingContext2D) => void> = {
  tea: drawTeaLeaf,
  honey: drawHoneyJar,
  chocolate: drawChocolate,
  varki: drawVarki,
  spice: drawSpice,
};

/** Renders one product onto a transparent offscreen canvas, cached by caller. */
export function buildProductSprite(type: string, dpr: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(SIZE * dpr);
  canvas.height = Math.ceil(SIZE * dpr);
  const c = canvas.getContext("2d")!;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.translate(SIZE / 2, SIZE / 2);
  (DRAWERS[type] ?? drawTeaLeaf)(c);
  return canvas;
}

export const PRODUCT_SPRITE_SIZE = SIZE;
