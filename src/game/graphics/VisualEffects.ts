import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { NEST_PALETTE } from './artUtils';

const VIGNETTE_KEY = 'fx-vignette';
const WARM_GLOW_KEY = 'fx-warm-glow';

function ensureVignetteTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(VIGNETTE_KEY)) return;
  const w = 640;
  const h = 360;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x += 8) {
      const nx = (x / w - 0.5) * 2;
      const ny = (y / h - 0.5) * 2;
      const dist = Math.sqrt(nx * nx + ny * ny);
      const alpha = Phaser.Math.Clamp((dist - 0.35) * 0.85, 0, 0.65);
      if (alpha > 0.01) {
        g.fillStyle(0x000000, alpha);
        g.fillRect(x, y, 8, 1);
      }
    }
  }
  g.generateTexture(VIGNETTE_KEY, w, h);
  g.destroy();
}

function ensureWarmGlowTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(WARM_GLOW_KEY)) return;
  const s = 256;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  for (let i = 14; i >= 0; i--) {
    const t = i / 14;
    g.fillStyle(NEST_PALETTE.wallGlow, 0.045 * (1 - t));
    g.fillCircle(s / 2, s / 2, 40 + t * 100);
  }
  g.generateTexture(WARM_GLOW_KEY, s, s);
  g.destroy();
}

/** Subtle dark edge vignette over the scene. */
export function addVignette(scene: Phaser.Scene, depth = 900): Phaser.GameObjects.Image {
  ensureVignetteTexture(scene);
  return scene.add
    .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, VIGNETTE_KEY)
    .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
    .setDepth(depth)
    .setScrollFactor(0);
}

/** Brief camera shake for impacts and catches. */
export function screenShake(scene: Phaser.Scene, duration = 280, intensity = 0.022): void {
  scene.cameras.main.shake(duration, intensity);
}

/** Warm lamp-style point glow. */
export function addWarmGlow(
  scene: Phaser.Scene,
  x: number,
  y: number,
  depth = 4,
  scale = 1.4,
): Phaser.GameObjects.Image {
  ensureWarmGlowTexture(scene);
  return scene.add
    .image(x, y, WARM_GLOW_KEY)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setScale(scale)
    .setAlpha(0.55)
    .setDepth(depth);
}
