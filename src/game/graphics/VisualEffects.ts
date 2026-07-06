import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { NEST_PALETTE } from './artUtils';
import { TEXTURE_KEYS } from '../assets/AssetKeys';
import { DEPTH } from './SceneDepth';

const VIGNETTE_KEY = 'fx-vignette';
const SPARK_KEY = TEXTURE_KEYS.sprites.spark;

/** Subtle dark edge vignette — below UI so it never blocks clicks. */
export function addVignette(
  scene: Phaser.Scene,
  depth = 7,
): Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle {
  if (scene.textures.exists(VIGNETTE_KEY)) {
    const img = scene.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, VIGNETTE_KEY)
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
      .setDepth(depth)
      .setScrollFactor(0)
      .setAlpha(0.55);
    img.disableInteractive();
    return img;
  }

  const fade = scene.add
    .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.2)
    .setDepth(depth)
    .setScrollFactor(0);
  fade.disableInteractive();
  return fade;
}

/** Brief camera shake for impacts and catches. */
export function screenShake(scene: Phaser.Scene, duration = 280, intensity = 0.022): void {
  scene.cameras.main.shake(duration, intensity);
}

/** Floating score text that rises and fades out. */
export function showScorePopup(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  color = '#ffca28',
): void {
  const popup = scene.add
    .text(x, y, text, {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '22px',
      color,
      stroke: '#1a1a1a',
      strokeThickness: 2,
    })
    .setOrigin(0.5)
    .setDepth(DEPTH.overlay);

  scene.tweens.add({
    targets: popup,
    y: y - 48,
    alpha: 0,
    duration: 750,
    ease: 'Cubic.easeOut',
    onComplete: () => popup.destroy(),
  });
}

/** Warm lamp-style point glow. */
export function addWarmGlow(
  scene: Phaser.Scene,
  x: number,
  y: number,
  depth = 4,
  scale = 1.4,
): Phaser.GameObjects.Image {
  return scene.add
    .image(x, y, SPARK_KEY)
    .setTint(NEST_PALETTE.wallGlow)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setScale(scale)
    .setAlpha(0.55)
    .setDepth(depth);
}
