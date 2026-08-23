/**
 * Removes white/near-white backgrounds, trims, and resizes game PNGs.
 * Run: node scripts/process-assets.mjs
 */
import sharp from 'sharp';
import { mkdir, rename, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', 'public', 'assets');
const SRC = process.env.ASSET_SRC
  ?? 'C:\\Users\\Владимир\\.cursor\\projects\\c-UnityProject-ockroach-life\\assets';

const TARGETS = {
  'ui/ui-panel.png': { w: 512, h: 512 },
  'ui/ui-button.png': { w: 512, h: 512 },
  'ui/ui-button-hover.png': { w: 512, h: 512 },
  'ui/ui-hud-panel.png': { w: 512, h: 128 },
  'backgrounds/menu-bg.png': { w: 1280, h: 720 },
  'backgrounds/nest-bg.png': { w: 1280, h: 720 },
  'backgrounds/floor-tile.png': { w: 64, h: 32 },
  'backgrounds/world-map-bg.png': { w: 1280, h: 720 },
  'backgrounds/raid-infiltrate-bg.png': { w: 1280, h: 720 },
  'backgrounds/arcade-slipper-bg.png': { w: 1280, h: 720 },
  'backgrounds/arcade-spray-bg.png': { w: 1280, h: 720 },
  'backgrounds/arcade-food-bg.png': { w: 1280, h: 720 },
  'backgrounds/arcade-hospital-bg.png': { w: 1280, h: 720 },
  'backgrounds/arcade-catch-bg.png': { w: 1280, h: 720 },
  'sprites/slipper.png': { w: 64, h: 64, keyed: true },
  'sprites/food-crumb.png': { w: 32, h: 32, keyed: true },
  'sprites/spray-cloud.png': { w: 64, h: 64, keyed: true },
  'sprites/crack.png': { w: 64, h: 64, keyed: true },
  'sprites/glue-trap.png': { w: 64, h: 64, keyed: true },
  'sprites/heart-pulse.png': { w: 48, h: 48, keyed: true },
  'sprites/spark.png': { w: 32, h: 32, keyed: true },
  'sprites/nest-marker.png': { w: 48, h: 48, keyed: true },
  'sprites/cat.png': { w: 64, h: 64, keyed: true },
  'characters/cockroach-0.png': { w: 64, h: 64, keyed: true },
};

const BUILDINGS = [
  'kitchen', 'bedroom', 'storage', 'nursery', 'hospital', 'planter', 'shelter', 'locker', 'niche',
];
const BUILDING_LEVELS = 5;
for (const b of BUILDINGS) {
  for (let level = 1; level <= BUILDING_LEVELS; level++) {
    TARGETS[`buildings/building-${b}-${level}.png`] = { w: 256, h: 256, keyed: true };
  }
}

const SRC_MAP = {
  'ui/ui-panel.png': 'ui-panel.png',
  'ui/ui-button.png': 'ui-button.png',
  'ui/ui-button-hover.png': 'ui-button-hover.png',
  'ui/ui-hud-panel.png': 'ui-hud-panel.png',
  'backgrounds/menu-bg.png': 'menu-bg.png',
  'backgrounds/nest-bg.png': 'nest-bg.png',
  'backgrounds/floor-tile.png': 'floor-tile.png',
  'backgrounds/world-map-bg.png': 'world-map-bg.png',
  'backgrounds/raid-infiltrate-bg.png': 'raid-infiltrate-bg.png',
  'backgrounds/arcade-slipper-bg.png': 'arcade-slipper-bg.png',
  'backgrounds/arcade-spray-bg.png': 'arcade-spray-bg.png',
  'backgrounds/arcade-food-bg.png': 'arcade-food-bg.png',
  'backgrounds/arcade-hospital-bg.png': 'arcade-hospital-bg.png',
  'backgrounds/arcade-catch-bg.png': 'arcade-catch-bg.png',
  'sprites/slipper.png': ['sprite-slipper.png', 'slipper.png'],
  'sprites/food-crumb.png': ['sprite-food-crumb.png', 'food-crumb.png'],
  'sprites/spray-cloud.png': 'sprite-spray-cloud.png',
  'sprites/crack.png': 'sprite-crack.png',
  'sprites/glue-trap.png': 'sprite-glue-trap.png',
  'sprites/heart-pulse.png': 'sprite-heart-pulse.png',
  'sprites/spark.png': ['sprite-spark.png', 'spark.png'],
  'sprites/nest-marker.png': 'sprite-nest-marker.png',
  'sprites/cat.png': 'cat.png',
  'characters/cockroach-0.png': ['cockroach-0.png', 'cockroach.png', 'cockroach-walk.png'],
};

for (const b of BUILDINGS) {
  for (let level = 1; level <= BUILDING_LEVELS; level++) {
    SRC_MAP[`buildings/building-${b}-${level}.png`] = `building-${b}-${level}.png`;
  }
}

async function exists(p) {
  try { await stat(p); return true; } catch { return false; }
}

async function resolveSrc(rel) {
  const names = SRC_MAP[rel];
  const list = Array.isArray(names) ? names : [names ?? path.basename(rel)];
  for (const name of list) {
    const p = path.join(SRC, name);
    if (await exists(p)) return p;
  }
  const fallback = path.join(ROOT, rel);
  if (await exists(fallback)) return fallback;
  return null;
}

/** Match runtime backdrop stripping in textureUtils.ts — fully key, no semi-transparent halos. */
function isBackdropPixel(r, g, b) {
  if (r < 32 && g < 32 && b < 32) return true;
  if (r > 230 && g > 230 && b > 230) return true;

  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  const avg = (r + g + b) / 3;

  // Photoshop / AI checkerboard grays
  if (spread < 18) {
    if (avg >= 175 && avg <= 215) return true;
    if (avg >= 115 && avg <= 165) return true;
  }

  // Residual near-white fringe after export compression
  if (r > 200 && g > 200 && b > 200 && spread < 28) return true;

  return false;
}

/** Make backdrop and near-white fringe pixels fully transparent. */
async function keyWhite(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = new Uint8Array(data);
  for (let i = 0; i < px.length; i += 4) {
    if (isBackdropPixel(px[i], px[i + 1], px[i + 2])) {
      px[i + 3] = 0;
    }
  }
  return sharp(px, { raw: { width: info.width, height: info.height, channels: 4 } }).png();
}

/** Paint rectangles over baked English text on arcade backgrounds (1280×720). */
const BG_TEXT_REGIONS = {
  'backgrounds/arcade-hospital-bg.png': [
    { x: 0, y: 555, w: 1280, h: 165, r: 31, g: 24, b: 72 },
    { x: 900, y: 455, w: 210, h: 95, r: 106, g: 158, b: 184 },
  ],
  'backgrounds/arcade-spray-bg.png': [
    { x: 35, y: 175, w: 360, h: 420, r: 58, g: 92, b: 104 },
    { x: 95, y: 255, w: 240, h: 260, r: 74, g: 112, b: 120 },
  ],
  'backgrounds/arcade-food-bg.png': [
    { x: 55, y: 345, w: 200, h: 95, r: 242, g: 236, b: 228 },
    { x: 215, y: 285, w: 90, h: 175, r: 90, g: 142, b: 196 },
  ],
  'backgrounds/arcade-catch-bg.png': [
    { x: 25, y: 175, w: 150, h: 200, r: 216, g: 207, b: 192 },
    { x: 40, y: 565, w: 160, h: 55, r: 139, g: 105, b: 20 },
    { x: 575, y: 55, w: 130, h: 55, r: 46, g: 125, b: 50 },
    { x: 95, y: 318, w: 55, h: 40, r: 61, g: 111, b: 168 },
    { x: 1085, y: 318, w: 55, h: 40, r: 198, g: 40, b: 40 },
  ],
};

function paintRect(px, imgW, imgH, x, y, w, h, r, g, b) {
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(imgW, x + w);
  const y1 = Math.min(imgH, y + h);
  for (let py = y0; py < y1; py++) {
    for (let px_x = x0; px_x < x1; px_x++) {
      const i = (py * imgW + px_x) * 4;
      px[i] = r;
      px[i + 1] = g;
      px[i + 2] = b;
      px[i + 3] = 255;
    }
  }
}

async function sanitizeBgText(rel) {
  const regions = BG_TEXT_REGIONS[rel];
  if (!regions) return;
  const out = path.join(ROOT, rel);
  if (!(await exists(out))) return;

  const { data, info } = await sharp(out).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = new Uint8Array(data);
  for (const region of regions) {
    paintRect(px, info.width, info.height, region.x, region.y, region.w, region.h, region.r, region.g, region.b);
  }
  const tmp = `${out}.san.tmp`;
  await sharp(px, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(tmp);
  await unlink(out);
  await rename(tmp, out);
  console.log('SANITIZED', rel);
}

async function processOne(rel, opts) {
  const src = await resolveSrc(rel);
  const out = path.join(ROOT, rel);
  await mkdir(path.dirname(out), { recursive: true });
  if (!src) {
    console.warn('SKIP (no source):', rel);
    return;
  }

  let pipe = sharp(src);
  if (opts.keyed) {
    pipe = await keyWhite(src);
  }

  if (opts.keyed) {
    pipe = pipe.trim({ threshold: 10 });
  }

  pipe = pipe.resize(opts.w, opts.h, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  });

  const tmp = `${out}.tmp`;
  await pipe.png().toFile(tmp);
  try {
    await unlink(out);
  } catch {
    // first write
  }
  await rename(tmp, out);
  await sanitizeBgText(rel);
  console.log('OK', rel);
}

for (const [rel, opts] of Object.entries(TARGETS)) {
  await processOne(rel, opts);
}

// Duplicate cockroach frames
for (let i = 1; i < 8; i++) {
  const src = path.join(ROOT, 'characters/cockroach-0.png');
  const out = path.join(ROOT, `characters/cockroach-${i}.png`);
  if (await exists(src)) {
    await sharp(src).png().toFile(out);
  }
}

console.log('Done processing assets.');
