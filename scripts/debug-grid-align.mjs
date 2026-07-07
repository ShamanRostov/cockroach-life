import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

function makeOverlay(width, height, ox, oy, hw, hh, gw, gh, color) {
  const parts = [];
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      const cx = ox + (gx - gy) * hw;
      const cy = oy + (gx + gy) * hh;
      const pts = [
        [cx, cy - hh],
        [cx + hw, cy],
        [cx, cy + hh],
        [cx - hw, cy],
      ]
        .map((p) => p.join(','))
        .join(' ');
      parts.push(
        `<polygon points="${pts}" fill="none" stroke="${color}" stroke-width="2"/>`,
      );
    }
  }
  return Buffer.from(
    `<svg width="${width}" height="${height}">${parts.join('')}</svg>`,
  );
}

async function render(name, ox, oy, hw, hh, gw = 10, gh = 8) {
  const base = sharp('public/assets/backgrounds/nest-bg.png');
  const meta = await base.metadata();
  const overlay = makeOverlay(meta.width, meta.height, ox, oy, hw, hh, gw, gh, '#ff1744');
  await base
    .composite([{ input: overlay, top: 0, left: 0 }])
    .png()
    .toFile(`logs/${name}`);
  console.log('wrote', name, { ox, oy, hw, hh });
}

await mkdir('logs', { recursive: true });
await render('grid-origin-693-357.png', 693, 357, 32, 16);
await render('grid-origin-608-252.png', 608, 252, 32, 16);
