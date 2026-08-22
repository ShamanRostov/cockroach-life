/**
 * Process raw AI-generated building PNGs into game-ready 256×256 sprites.
 * Input: public/assets/buildings/raw/building-{type}-{level}.png
 * Output: public/assets/buildings/building-{type}-{level}.png
 */
import sharp from 'sharp';
import { mkdir, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', 'public', 'assets', 'buildings');
const RAW = path.join(ROOT, 'raw');

function isBackdropPixel(r, g, b) {
  if (r < 32 && g < 32 && b < 32) return true;
  if (r > 230 && g > 230 && b > 230) return true;
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  const avg = (r + g + b) / 3;
  if (spread < 18) {
    if (avg >= 175 && avg <= 215) return true;
    if (avg >= 115 && avg <= 165) return true;
  }
  if (r > 200 && g > 200 && b > 200 && spread < 28) return true;
  return false;
}

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

async function processFile(name) {
  if (!name.match(/^building-[a-z]+-\d\.png$/)) return;
  const src = path.join(RAW, name);
  const out = path.join(ROOT, name);
  const keyed = await keyWhite(src);
  await keyed
    .trim({ threshold: 12 })
    .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(out);
  console.log('OK', name);
}

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

await mkdir(RAW, { recursive: true });
if (!(await exists(RAW))) {
  console.error('No raw folder');
  process.exit(1);
}

const files = await readdir(RAW);
for (const f of files) {
  await processFile(f);
}
console.log('Done building sprites.');
