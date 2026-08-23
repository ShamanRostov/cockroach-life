import Phaser from 'phaser';
import { COLORS } from '../config';
import { DEPTH } from './SceneDepth';

function autoDestroy(scene: Phaser.Scene, emitter: Phaser.GameObjects.Particles.ParticleEmitter, ms: number): void {
  scene.time.delayedCall(ms, () => emitter.destroy());
}

/** Golden construction sparkles when a building is placed. */
export function spawnBuildSparkles(
  scene: Phaser.Scene,
  x: number,
  y: number,
  parent?: Phaser.GameObjects.Container,
): void {
  const emitter = scene.add
    .particles(x, y - 16, 'spark', {
      speed: { min: 50, max: 160 },
      angle: { min: 210, max: 330 },
      scale: { start: 0.45, end: 0 },
      lifespan: { min: 350, max: 750 },
      quantity: 20,
      tint: [COLORS.accent, 0xffeb3b, 0xffffff, 0xc9b896],
      blendMode: Phaser.BlendModes.ADD,
    })
    .setDepth(DEPTH.particles);
  parent?.add(emitter);
  autoDestroy(scene, emitter, 850);
}

/** Coin shimmer when money is earned. */
export function spawnCoinBurst(scene: Phaser.Scene, x: number, y: number): void {
  const emitter = scene.add
    .particles(x, y, 'spark', {
      speed: { min: 25, max: 85 },
      angle: { min: 200, max: 340 },
      scale: { start: 0.4, end: 0 },
      lifespan: { min: 400, max: 650 },
      quantity: 12,
      tint: [0xffd54f, 0xffeb3b, 0xffa726],
      gravityY: 100,
      blendMode: Phaser.BlendModes.ADD,
    })
    .setDepth(DEPTH.particles);
  autoDestroy(scene, emitter, 700);
}

/** Crumb sparkle arc when food is collected in arcades. */
export function spawnFoodPickup(scene: Phaser.Scene, x: number, y: number): void {
  const emitter = scene.add
    .particles(x, y, 'food-crumb', {
      speed: { min: 40, max: 110 },
      angle: { min: 220, max: 320 },
      scale: { start: 0.25, end: 0 },
      lifespan: { min: 350, max: 600 },
      quantity: 8,
      tint: [COLORS.food, 0xffb74d, 0xffcc80],
      gravityY: 80,
    })
    .setDepth(DEPTH.particles);
  autoDestroy(scene, emitter, 650);

  const spark = scene.add
    .particles(x, y, 'spark', {
      speed: { min: 30, max: 70 },
      scale: { start: 0.3, end: 0 },
      lifespan: 350,
      quantity: 6,
      tint: COLORS.food,
      blendMode: Phaser.BlendModes.ADD,
    })
    .setDepth(DEPTH.particles);
  autoDestroy(scene, spark, 450);
}

/** Generic spark burst for arcade hits, collects, and combos. */
export function spawnSparkBurst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  quantity = 10,
  tint: number | number[] = COLORS.accent,
): void {
  const emitter = scene.add
    .particles(x, y, 'spark', {
      speed: { min: 40, max: 130 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.4, end: 0 },
      lifespan: { min: 300, max: 550 },
      quantity,
      tint,
      blendMode: Phaser.BlendModes.ADD,
    })
    .setDepth(DEPTH.particles);
  autoDestroy(scene, emitter, 600);
}

/** Faint crumb trail behind magnet-pulled food. */
export function spawnCrumbTrail(scene: Phaser.Scene, x: number, y: number): void {
  const emitter = scene.add
    .particles(x, y, 'food-crumb', {
      speed: { min: 5, max: 25 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.12, end: 0 },
      lifespan: { min: 200, max: 400 },
      quantity: 1,
      tint: [COLORS.food, 0xffb74d],
      alpha: { start: 0.5, end: 0 },
    })
    .setDepth(DEPTH.particles);
  autoDestroy(scene, emitter, 450);
}

/** Dust puff when infiltrating a raid target nest. */
export function spawnRaidSmoke(scene: Phaser.Scene, x: number, y: number): void {
  const emitter = scene.add
    .particles(x, y, 'spray-cloud', {
      speed: { min: 15, max: 55 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.15, end: 0.45 },
      alpha: { start: 0.55, end: 0 },
      lifespan: { min: 600, max: 1100 },
      quantity: 14,
      tint: [0x8d6e63, 0x6d4c41, 0x5d4037],
      blendMode: Phaser.BlendModes.MULTIPLY,
    })
    .setDepth(DEPTH.particles);
  autoDestroy(scene, emitter, 1200);

  const dust = scene.add
    .particles(x, y + 10, 'spark', {
      speed: { min: 10, max: 40 },
      angle: { min: 240, max: 300 },
      scale: { start: 0.12, end: 0 },
      lifespan: 500,
      quantity: 10,
      tint: [0xbcaaa4, 0x8d6e63],
      alpha: { start: 0.4, end: 0 },
    })
    .setDepth(DEPTH.particles);
  autoDestroy(scene, dust, 600);
}
