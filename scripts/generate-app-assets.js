#!/usr/bin/env node
/**
 * Generate the App Store icon and splash source artwork.
 *
 * Produces `assets/icon.png` (1024x1024) and `assets/splash*.png` (2732x2732),
 * which are the two source files @capacitor/assets expands into every size iOS
 * needs. Run `npx @capacitor/assets generate --ios` afterwards.
 *
 *   node scripts/generate-app-assets.js            # writes the chosen concept
 *   node scripts/generate-app-assets.js --previews # also writes all concepts
 *
 * App Store icon rules encoded here:
 *  - Exactly 1024x1024, fully opaque. An alpha channel is an automatic
 *    rejection at upload, so every render is flattened onto the brand colour.
 *  - No rounded corners or drop shadow: iOS applies its own mask, and baking
 *    one in produces a visibly double-rounded icon on device.
 *  - The mark stays inside a centre safe zone, because that mask crops corners.
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const OUT = path.resolve(process.cwd(), 'assets');
fs.mkdirSync(OUT, { recursive: true });

const TEAL = '#0CC5BA';
const BLUE = '#26A8FF';

/** Shared gradient + subtle depth used by every concept. */
const defs = (id) => `
  <defs>
    <linearGradient id="bg-${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${TEAL}"/>
      <stop offset="100%" stop-color="${BLUE}"/>
    </linearGradient>
    <radialGradient id="glow-${id}" cx="0.32" cy="0.24" r="0.85">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg-${id})"/>
  <rect width="1024" height="1024" fill="url(#glow-${id})"/>
`;

/**
 * The leaf mark, shared by the concepts below.
 *
 * The midrib is clipped to the leaf outline rather than drawn as a plain line:
 * an unclipped diagonal overshoots both tips and leaves stray nubs floating
 * outside the silhouette, which is very obvious at large sizes.
 */
const leafMark = ({ id, x1, y1, x2, y2, fill, vein, veinWidth }) => {
  // Two mirrored cubic arcs meeting at the tips. `bulge` controls how fat the
  // leaf is; 0.64 of the diagonal gives a natural almond without looking like
  // a lens or an eye.
  const d = x2 - x1;
  const bulge = 0.64 * d;
  const lean = 0.36 * d;
  const outline =
    `M${x1} ${y1} ` +
    `C${x1} ${y1 - bulge} ${x1 + lean} ${y2} ${x2} ${y2} ` +
    `C${x2} ${y2 + bulge} ${x2 - lean} ${y1} ${x1} ${y1} Z`;

  // Extended past both tips, then clipped, so the vein meets the outline
  // exactly instead of stopping short or poking out.
  const veinPath = `M${x1 - 40} ${y1 + 40} L${x2 + 40} ${y2 - 40}`;

  return `
  <defs><clipPath id="leaf-${id}"><path d="${outline}"/></clipPath></defs>
  <path d="${outline}" fill="${fill}"/>
  <g clip-path="url(#leaf-${id})">
    <path d="${veinPath}" stroke="${vein}" stroke-width="${veinWidth}" opacity="0.28"/>
  </g>`;
};

/**
 * A. Scan — viewfinder brackets around a leaf.
 * Says what the app does (point the camera at food) in one glance, and the
 * bracket silhouette stays readable when the icon is 60px on a home screen.
 */
const conceptScan = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  ${defs('a')}
  <g fill="none" stroke="#ffffff" stroke-width="52" stroke-linecap="round" stroke-linejoin="round">
    <path d="M236 356 V292 A56 56 0 0 1 292 236 H356"/>
    <path d="M668 236 H732 A56 56 0 0 1 788 292 V356"/>
    <path d="M788 668 V732 A56 56 0 0 1 732 788 H668"/>
    <path d="M356 788 H292 A56 56 0 0 1 236 732 V668"/>
  </g>
  ${leafMark({ id: 'a', x1: 344, y1: 680, x2: 680, y2: 344, fill: '#ffffff', vein: TEAL, veinWidth: 18 })}
</svg>`;

/**
 * B. Leaf — a single bold mark with an AI spark.
 * The simplest silhouette, but less specific about what the app actually does.
 */
const conceptLeaf = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  ${defs('b')}
  ${leafMark({ id: 'b', x1: 286, y1: 726, x2: 700, y2: 312, fill: '#ffffff', vein: BLUE, veinWidth: 38 })}
  <path d="M782 232 L806 300 L874 324 L806 348 L782 416 L758 348 L690 324 L758 300 Z" fill="#ffffff"/>
</svg>`;

/**
 * C. Bowl — a plate of food with a rising leaf.
 * Most literally "nutrition", least distinctive in a crowded category.
 */
const conceptBowl = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  ${defs('c')}
  <path d="M232 512 H792 A280 280 0 0 1 232 512 Z" fill="#ffffff"/>
  <rect x="232" y="452" width="560" height="52" rx="26" fill="#ffffff"/>
  <path d="M436 404 C436 300 512 224 616 224 C616 328 540 404 436 404 Z" fill="#ffffff"/>
  <path d="M436 404 L616 224" stroke="${TEAL}" stroke-width="24" stroke-linecap="round" opacity="0.5"/>
</svg>`;

const concepts = { scan: conceptScan, leaf: conceptLeaf, bowl: conceptBowl };

/** Flatten onto an opaque brand colour — App Store icons may not have alpha. */
async function renderIcon(svg, file, size = 1024) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .flatten({ background: TEAL })
    .png({ compressionLevel: 9 })
    .toFile(file);
}

/**
 * Splash is mostly empty on purpose: iOS crops a 2732x2732 source hard across
 * device aspect ratios, so anything near the edge is lost. Only the centred
 * mark is guaranteed visible.
 */
const splash = (bg, markFill) => `
<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732" viewBox="0 0 2732 2732">
  <rect width="2732" height="2732" fill="${bg}"/>
  <g transform="translate(1366 1366) scale(1.3) translate(-512 -512)">
    <g fill="none" stroke="${markFill}" stroke-width="52" stroke-linecap="round" stroke-linejoin="round">
      <path d="M236 356 V292 A56 56 0 0 1 292 236 H356"/>
      <path d="M668 236 H732 A56 56 0 0 1 788 292 V356"/>
      <path d="M788 668 V732 A56 56 0 0 1 732 788 H668"/>
      <path d="M356 788 H292 A56 56 0 0 1 236 732 V668"/>
    </g>
    ${leafMark({ id: 'splash', x1: 344, y1: 680, x2: 680, y2: 344, fill: markFill, vein: bg, veinWidth: 18 })}
  </g>
</svg>`;

const chosen = process.env.ICON_CONCEPT || 'scan';

const run = async () => {
  if (!concepts[chosen]) {
    throw new Error(`Unknown concept "${chosen}". Options: ${Object.keys(concepts).join(', ')}`);
  }

  await renderIcon(concepts[chosen], path.join(OUT, 'icon.png'));

  // Light and dark splash. The dark variant uses the deep brand blue rather
  // than black, so the transition into the app is not a hard flash.
  await sharp(Buffer.from(splash('#ffffff', BLUE)))
    .flatten({ background: '#ffffff' })
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, 'splash.png'));

  await sharp(Buffer.from(splash('#0B1F2E', '#ffffff')))
    .flatten({ background: '#0B1F2E' })
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, 'splash-dark.png'));

  if (process.argv.includes('--previews')) {
    const dir = path.join(OUT, 'previews');
    fs.mkdirSync(dir, { recursive: true });
    for (const [name, svg] of Object.entries(concepts)) {
      // 1024 for review, 180 and 60 to check it survives being small.
      for (const size of [1024, 180, 60]) {
        await renderIcon(svg, path.join(dir, `${name}-${size}.png`), size);
      }
    }
    console.log(`Previews written to ${dir}`);
  }

  const { width, height, channels } = await sharp(path.join(OUT, 'icon.png')).metadata();
  console.log(`icon.png        ${width}x${height}, ${channels} channels (3 = opaque, required)`);
  console.log(`splash.png      2732x2732`);
  console.log(`splash-dark.png 2732x2732`);
  console.log(`\nConcept: ${chosen}. Next: npx @capacitor/assets generate --ios`);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
