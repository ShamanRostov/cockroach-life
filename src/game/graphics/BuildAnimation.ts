import Phaser from 'phaser';
import { COLORS } from '../config';
import { buildingTextureKey, buildingDisplayScale } from '../assets/AssetKeys';
import { addGlowBurst } from '../ui/ButtonHelper';
import { spawnBuildSparkles } from './ParticleEffects';
import type { RoomType } from '../systems/BuildingSystem';

interface BuildAnimOptions {
  scene: Phaser.Scene;
  x: number;
  y: number;
  type: RoomType;
  level: number;
  onComplete: () => void;
}

/** Construction: glow burst → HD sprite materializes with bounce → spark particles. */
export function playBuildAnimation(opts: BuildAnimOptions): void {
  const { scene, x, y, type, level, onComplete } = opts;
  const key = buildingTextureKey(type, level);
  const targetScale = buildingDisplayScale(level);

  addGlowBurst(scene, x, y + 8, COLORS.accent, 24);
  spawnBuildSparkles(scene, x, y);

  const dust = scene.add.particles(x, y + 8, 'spark', {
    speed: { min: 20, max: 60 },
    scale: { start: 0.25, end: 0 },
    lifespan: 500,
    quantity: 16,
    tint: 0xc9b896,
  });
  scene.time.delayedCall(600, () => dust.destroy());

  const sprite = scene.add
    .image(x, y - 10, key)
    .setDepth(25)
    .setOrigin(0.5, 0.92)
    .setScale(0)
    .setAlpha(0);

  scene.tweens.add({
    targets: sprite,
    scaleX: targetScale,
    scaleY: targetScale,
    alpha: 1,
    duration: 900,
    ease: 'Back.easeOut',
    onComplete: () => {
      const spark = scene.add.particles(x, y - 30, 'spark', {
        speed: { min: 40, max: 120 },
        scale: { start: 0.35, end: 0 },
        lifespan: 700,
        quantity: 20,
        tint: [COLORS.accent, 0xffeb3b, 0xffffff],
      });
      scene.time.delayedCall(800, () => spark.destroy());
      sprite.destroy();
      onComplete();
    },
  });
}

export function playUpgradeAnimation(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Image,
  level: number,
  onComplete?: () => void,
): void {
  const targetScale = buildingDisplayScale(level);

  addGlowBurst(scene, sprite.x, sprite.y - 25, COLORS.accent, sprite.depth + 1);

  scene.tweens.add({
    targets: sprite,
    scaleX: targetScale * 1.15,
    scaleY: targetScale * 1.15,
    duration: 200,
    yoyo: true,
    ease: 'Sine.easeOut',
    onComplete: () => {
      sprite.setScale(targetScale);
      onComplete?.();
    },
  });

  const spark = scene.add.particles(sprite.x, sprite.y - 20, 'spark', {
    speed: { min: 30, max: 100 },
    scale: { start: 0.3, end: 0 },
    lifespan: 550,
    quantity: 14,
    tint: COLORS.accent,
  });
  scene.time.delayedCall(600, () => spark.destroy());
}
