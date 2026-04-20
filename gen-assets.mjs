/**
 * Generates favicon and OG image assets for king·
 * Run: node gen-assets.mjs
 */
import { createRequire } from 'module';
import { writeFileSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const sharp = require('/Users/christiancoorey/.npm/_npx/76dc10efc80ca823/node_modules/sharp');

const BG = '#0B0A0F';
const FG = '#F3F0EA';
const ACCENT = '#7C5CFF';
const OUT = path.join(__dirname, 'public');

// ── Square logo SVG for favicon (87-90% canvas width) ───────────────────────
// font-size 430 → "king" ≈800px + gap(15) + dot(76) ≈ 891px = 89% of 1000
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">
  <defs>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${ACCENT}" stop-opacity="0.3"/>
      <stop offset="70%" stop-color="${ACCENT}" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="${ACCENT}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1000" height="1000" fill="${BG}"/>
  <ellipse cx="500" cy="500" rx="480" ry="480" fill="url(#glow)"/>
  <text
    x="855" y="585"
    font-family="'Instrument Sans', ui-sans-serif, system-ui, sans-serif"
    font-weight="600"
    font-size="430"
    letter-spacing="-17"
    fill="${FG}"
    text-anchor="end"
  >king</text>
  <circle cx="908" cy="540" r="38" fill="${ACCENT}"/>
</svg>`;

// ── Square logo SVG for apple-touch-icon (77% canvas — iOS clips corners) ───
// font-size 370 → "king" ≈689px + gap(13) + dot(66) ≈ 768px = 77% of 1000
const appleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">
  <defs>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${ACCENT}" stop-opacity="0.3"/>
      <stop offset="70%" stop-color="${ACCENT}" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="${ACCENT}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1000" height="1000" fill="${BG}"/>
  <ellipse cx="500" cy="500" rx="420" ry="420" fill="url(#glow)"/>
  <text
    x="805" y="580"
    font-family="'Instrument Sans', ui-sans-serif, system-ui, sans-serif"
    font-weight="600"
    font-size="370"
    letter-spacing="-15"
    fill="${FG}"
    text-anchor="end"
  >king</text>
  <circle cx="851" cy="540" r="33" fill="${ACCENT}"/>
</svg>`;

// ── OG image SVG (1200×630, wordmark ~55% canvas width) ──────────────────────
// font-size 325 → "king" ≈605px + gap(14) + dot(58) ≈ 677px = 56% of 1200
const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${ACCENT}" stop-opacity="0.28"/>
      <stop offset="65%" stop-color="${ACCENT}" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="${ACCENT}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="${BG}"/>
  <ellipse cx="600" cy="315" rx="560" ry="300" fill="url(#glow)"/>
  <text
    x="867" y="403"
    font-family="'Instrument Sans', ui-sans-serif, system-ui, sans-serif"
    font-weight="600"
    font-size="325"
    letter-spacing="-14"
    fill="${FG}"
    text-anchor="end"
  >king</text>
  <circle cx="910" cy="369" r="29" fill="${ACCENT}"/>
</svg>`;

// ── ICO encoder (BMP-based, supports multiple resolutions) ────────────────────
function encodeBmpPixels(pixels, size) {
  // pixels: Uint8Array of RGBA, size×size
  const stride = size * 4;
  const rows = [];
  for (let y = size - 1; y >= 0; y--) {
    // ICO BMP is bottom-up; rows must be 4-byte aligned (already: size*4 always divisible by 4)
    rows.push(pixels.slice(y * stride, (y + 1) * stride));
  }
  return Buffer.concat(rows);
}

function buildIco(entries) {
  // entries: [{ size, pngBuffer }]
  // Use PNG-in-ICO (Vista+) — simpler and higher quality than BMP-in-ICO
  const numImages = entries.length;
  const headerSize = 6 + 16 * numImages;
  let offset = headerSize;

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);        // reserved
  header.writeUInt16LE(1, 2);        // type: 1 = ICO
  header.writeUInt16LE(numImages, 4);

  const dirEntries = [];
  for (const { size, pngBuffer } of entries) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);   // width (0 = 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1);   // height
    entry.writeUInt8(0, 2);    // color count (0 = no palette)
    entry.writeUInt8(0, 3);    // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(pngBuffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    dirEntries.push(entry);
    offset += pngBuffer.length;
  }

  return Buffer.concat([header, ...dirEntries, ...entries.map(e => e.pngBuffer)]);
}

// ── Generate assets ───────────────────────────────────────────────────────────
async function main() {
  console.log('Generating favicon and OG assets…');

  // 16×16 PNG
  const png16 = await sharp(Buffer.from(faviconSvg))
    .resize(16, 16)
    .png()
    .toBuffer();
  writeFileSync(path.join(OUT, 'favicon-16.png'), png16);
  console.log('✓ favicon-16.png');

  // 32×32 PNG
  const png32 = await sharp(Buffer.from(faviconSvg))
    .resize(32, 32)
    .png()
    .toBuffer();
  writeFileSync(path.join(OUT, 'favicon-32.png'), png32);
  console.log('✓ favicon-32.png');

  // 180×180 apple-touch-icon
  const png180 = await sharp(Buffer.from(appleSvg))
    .resize(180, 180)
    .png()
    .toBuffer();
  writeFileSync(path.join(OUT, 'apple-touch-icon.png'), png180);
  console.log('✓ apple-touch-icon.png');

  // favicon.ico — PNG-in-ICO with 16×16 and 32×32
  const ico = buildIco([
    { size: 16, pngBuffer: png16 },
    { size: 32, pngBuffer: png32 },
  ]);
  writeFileSync(path.join(OUT, 'favicon.ico'), ico);
  console.log('✓ favicon.ico (16+32)');

  // og-image.png 1200×630
  const ogPng = await sharp(Buffer.from(ogSvg))
    .resize(1200, 630)
    .png()
    .toBuffer();
  writeFileSync(path.join(OUT, 'og-image.png'), ogPng);
  console.log('✓ og-image.png (1200×630)');

  console.log('Done.');
}

main().catch(e => { console.error(e); process.exit(1); });
