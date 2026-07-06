/**
 * Removes white/near-white backgrounds, trims, and resizes game PNGs.
 * Run: node scripts/process-assets.mjs
 */
import sharp from 'sharp';
import { readdir, mkdir, stat } from 'node:fs/promises';
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
  'characters/cockroach-0.png': { w: 64, h: 40, keyed: true },
};

const BUILDINGS = [
  'kitchen', 'bedroom', 'storage', 'nursery', 'hospital', 'planter', 'shelter', 'locker', 'niche',
];
for (const b of BUILDINGS) {
  TARGETS[`buildings/building-${b}.png`] = { w: 256, h: 256, keyed: true };
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
  SRC_MAP[`buildings/building-${b}.png`] = `building-${b}.png`;
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

/** Make near-white pixels transparent. */
async function keyWhite(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = new Uint8Array(data);
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i], g = px[i + 1], b = px[i + 2];
    if (r > 235 && g > 235 && b > 235) {
      px[i + 3] = 0;
    } else if (r > 210 && g > 210 && b > 210) {
      px[i + 3] = Math.min(px[i + 3], 80);
    }
  }
  return sharp(px, { raw: { width: info.width, height: info.height, channels: 4 } }).png();
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

  await pipe.png().toFile(out);
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
