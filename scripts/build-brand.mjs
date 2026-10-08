/**
 * Brand asset pipeline — regenerates every logo file the app ships.
 *
 * Run:  node frontend/scripts/build-brand.mjs   (deps resolve from frontend/)
 *
 * Sources (brand-kit/source/, exported from the designer's artwork):
 *   colour-pair.png          both colour lockups side by side
 *   bw-horizontal-chennai.png  black horizontal lockup — tagline reads
 *                            "FROM CHENNAI TO HOME", which is WRONG; the
 *                            pipeline drops it and splices in the correct
 *                            "FROM OOTY TO HOME" taken from the colour artwork,
 *                            so the real brand typography is preserved rather
 *                            than substituted with a lookalike font.
 *   bw-badge.png             black circular packaging badge
 *
 * Crop boxes below were measured from pixel ink-density profiles, not eyeballed.
 */
import sharp from "sharp";
import { trace } from "potrace";
import { mkdir, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Anchored to the repo root so the script runs from any working directory.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const p = (...parts) => resolve(ROOT, ...parts);

const traceAsync = promisify(trace);
const SRC = p("brand-kit/source");
const OUT_WEB = p("public/brand");
const OUT_PKG = p("brand-kit/brand-export");

// Measured ink boxes.
const BOX = {
  colourLogo: { left: 72, top: 123, width: 852, height: 524 }, // full colour lockup incl. tagline
  colourTagline: { left: 170, top: 617, width: 614, height: 31 }, // "FROM OOTY TO HOME" text only
  bwMark: { left: 47, top: 174, width: 708, height: 340 }, // leaf + wordmark + wave, tagline excluded
  badge: { left: 30, top: 28, width: 727, height: 721 }, // complete circle
  // Wordmark = leaf + "Ootybites" + wave, no tagline. The UI needs this: in a
  // 36px-tall navbar the full lockup would render its tagline ~3px tall.
  colourWordmark: { left: 72, top: 123, width: 852, height: 477 },
  // Just the two-leaf sprout. The badge is the brand's icon, but its mountain
  // scene and micro-text turn to mush below ~64px, so small favicons use this.
  sprout: { left: 313, top: 174, width: 263, height: 147 },
};

/** Dark pixels become opaque ink; everything else becomes transparent. */
async function inkMask(input, box) {
  const grey = await sharp(input)
    .flatten({ background: "#ffffff" })
    .extract(box)
    .greyscale()
    .toBuffer();
  // Alpha = inverse luminance, so paper drops out and ink stays. The linear ramp
  // puts a floor under the scan noise in the empty margins (normalise() used to
  // stretch that noise into visible grey smudges beside the tagline) while still
  // keeping the antialiased edges that a hard threshold would destroy.
  const NOISE_FLOOR = 48;
  const alpha = await sharp(grey)
    .negate()
    .linear(255 / (255 - NOISE_FLOOR), -NOISE_FLOOR * (255 / (255 - NOISE_FLOOR)))
    .toBuffer();
  const { width, height } = await sharp(grey).metadata();
  return sharp({ create: { width, height, channels: 3, background: "#000000" } })
    .joinChannel(alpha)
    .png()
    .toBuffer();
}

/**
 * The colour artwork was supplied matted onto white, so a straight crop ships an
 * opaque white rectangle — visible as a box wherever the logo sits on anything
 * but white. This rebuilds an alpha channel from each pixel's distance from
 * white: paper drops out, the logo keeps its colours, and the narrow ramp keeps
 * the antialiased edges instead of the jagged ones a hard key would give.
 *
 * White enclosed by the artwork (the counter of the "O", the leaf cut into it)
 * becomes transparent too — that is correct for a logo, so those shapes show
 * whatever sits behind them.
 */
async function unmatteWhite(rgbBuffer) {
  const FLOOR = 6; // distance-from-white below this is paper
  const SOLID = 45; // at/above this the pixel is fully the logo
  const gain = 255 / (SOLID - FLOOR);

  // Done on raw pixels rather than with sharp's channel ops: greyscale() still
  // emits a 3-channel PNG and joinChannel() then silently produces no alpha at
  // all, which shipped an opaque white box. Distance uses max() across channels,
  // not luminance, so a bright-but-saturated green stays fully opaque.
  const { data, info } = await sharp(rgbBuffer)
    .flatten({ background: "#ffffff" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const out = Buffer.alloc(width * height * 4);
  for (let p = 0, q = 0; p < data.length; p += channels, q += 4) {
    const r = data[p], g = data[p + 1], b = data[p + 2];
    const dist = Math.max(255 - r, 255 - g, 255 - b);
    const a = Math.min(255, Math.max(0, Math.round((dist - FLOOR) * gain)));
    out[q] = r; out[q + 1] = g; out[q + 2] = b; out[q + 3] = a;
  }
  return sharp(out, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

async function main() {
  await mkdir(OUT_WEB, { recursive: true });
  await mkdir(OUT_PKG, { recursive: true });

  // ── 1. Primary colour lockup (website) ─────────────────────────────────────
  const colour = await unmatteWhite(await sharp(`${SRC}/colour-pair.png`).extract(BOX.colourLogo).png().toBuffer());
  for (const [name, w] of [["logo.png", 640], ["logo@2x.png", 1280], ["logo@3x.png", 1920]]) {
    await sharp(colour).resize({ width: w }).png({ compressionLevel: 9 }).toFile(`${OUT_WEB}/${name}`);
  }
  await sharp(colour).resize({ width: 2400 }).png().toFile(`${OUT_PKG}/ootybites-logo-colour.png`);

  // ── 1b. Colour wordmark (no tagline) — the lockup the UI actually uses ─────
  const colourWm = await unmatteWhite(await sharp(`${SRC}/colour-pair.png`).extract(BOX.colourWordmark).png().toBuffer());
  for (const [name, w] of [["wordmark.png", 480], ["wordmark@2x.png", 960]]) {
    await sharp(colourWm).resize({ width: w }).png({ compressionLevel: 9 }).toFile(`${OUT_WEB}/${name}`);
  }

  // ── 2. Black horizontal lockup with the CORRECT tagline ────────────────────
  const mark = await inkMask(`${SRC}/bw-horizontal-chennai.png`, BOX.bwMark);
  const tagline = await inkMask(`${SRC}/colour-pair.png`, BOX.colourTagline);

  const W = 1600;
  const markH = Math.round((BOX.bwMark.height / BOX.bwMark.width) * W);
  const tagW = Math.round(W * 0.88); // tagline sits inboard of the wave ends
  const tagH = Math.round((BOX.colourTagline.height / BOX.colourTagline.width) * tagW);
  const gap = Math.round(W * 0.022);

  const markR = await sharp(mark).resize({ width: W }).toBuffer();
  const tagR = await sharp(tagline).resize({ width: tagW }).toBuffer();

  const blackPng = await sharp({
    create: { width: W, height: markH + gap + tagH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: markR, top: 0, left: 0 },
      { input: tagR, top: markH + gap, left: Math.round((W - tagW) / 2) },
    ])
    .png()
    .toBuffer();

  await writeFile(`${OUT_WEB}/logo-black.png`, blackPng);
  await sharp(blackPng).resize({ width: 2400 }).png().toFile(`${OUT_PKG}/ootybites-logo-black.png`);

  // White knockout for dark surfaces (footer / nav).
  const whitePng = await sharp(blackPng)
    .composite([{ input: { create: { width: W, height: markH + gap + tagH, channels: 3, background: "#ffffff" } }, blend: "in" }])
    .png()
    .toBuffer();
  await writeFile(`${OUT_WEB}/logo-white.png`, whitePng);
  await sharp(whitePng).resize({ width: 2400 }).png().toFile(`${OUT_PKG}/ootybites-logo-white.png`);

  // Black / white wordmark (no tagline) for dark and single-colour surfaces.
  const wmBlack = await sharp(mark).resize({ width: 960 }).png().toBuffer();
  await writeFile(`${OUT_WEB}/wordmark-black.png`, wmBlack);
  const wmWhite = await sharp(wmBlack)
    .composite([{ input: { create: { width: 960, height: Math.round((BOX.bwMark.height / BOX.bwMark.width) * 960), channels: 3, background: "#ffffff" } }, blend: "in" }])
    .png()
    .toBuffer();
  await writeFile(`${OUT_WEB}/wordmark-white.png`, wmWhite);

  // ── 3. Circular packaging badge ────────────────────────────────────────────
  const badge = await inkMask(`${SRC}/bw-badge.png`, BOX.badge);
  await sharp(badge).resize({ width: 1024 }).png().toFile(`${OUT_WEB}/badge.png`);
  await sharp(badge).resize({ width: 3000 }).png().toFile(`${OUT_PKG}/ootybites-badge-black-3000.png`);

  // ── 4. App icons / favicons ────────────────────────────────────────────────
  // Large sizes use the badge (detail still reads). Small sizes use the sprout
  // on a filled brand tile: a thin black mark on transparent disappears against
  // a dark browser tab.
  const BRAND = "#12402a";
  const sprout = await inkMask(`${SRC}/bw-horizontal-chennai.png`, BOX.sprout);

  async function tile(size) {
    const inner = Math.round(size * 0.62);
    const scaled = await sharp(sprout).resize({ width: inner, fit: "inside" }).png().toBuffer();
    const sm = await sharp(scaled).metadata();
    // blend:"in" keeps the sprout's alpha but paints it white; the overlay must
    // match the base exactly, so build it from the scaled mark's real size.
    const white = await sharp(scaled)
      .composite([{ input: { create: { width: sm.width, height: sm.height, channels: 3, background: "#ffffff" } }, blend: "in" }])
      .png()
      .toBuffer();
    const m = sm;
    return sharp({ create: { width: size, height: size, channels: 4, background: BRAND } })
      .composite([{ input: white, top: Math.round((size - m.height) / 2), left: Math.round((size - m.width) / 2) }])
      .png()
      .toBuffer();
  }

  for (const size of [32, 48]) {
    await writeFile(`${OUT_WEB}/icon-${size}.png`, await tile(size));
  }
  for (const size of [180, 192, 512]) {
    await sharp(badge)
      .resize({ width: size, height: size, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(`${OUT_WEB}/icon-${size}.png`);
  }
  // Apple requires an opaque square; it does not honour transparency.
  await writeFile(`${OUT_WEB}/apple-touch-icon.png`, await tile(180));
  // Next serves src/app/icon.png as the favicon.
  await writeFile(p("src/app/icon.png"), await tile(512));

  // ── 5. Genuine vectors (potrace on the black artwork) ──────────────────────
  // Real traced paths, not a raster wrapped in <svg>, so these stay crisp at any
  // size. Only the black art is traceable this way — see README for the colour
  // lockup caveat.
  for (const [buf, name] of [[blackPng, "logo-black.svg"], [badge, "badge.svg"], [wmBlack, "wordmark-black.svg"]]) {
    const flat = await sharp(buf).flatten({ background: "#ffffff" }).png().toBuffer();
    const svg = await traceAsync(flat, { color: "#14301f", threshold: 170, turdSize: 2 });
    await writeFile(`${OUT_WEB}/${name}`, svg);
    await writeFile(`${OUT_PKG}/ootybites-${name}`, svg);
    // White variant: same geometry, inverted fill.
    await writeFile(`${OUT_WEB}/${name.replace("-black", "").replace(".svg", "-white.svg")}`,
      svg.replace(/fill="[^"]*"/g, 'fill="#ffffff"'));
  }

  console.log("brand assets written to", OUT_WEB, "and", OUT_PKG);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
