import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { NEST_PALETTE } from './artUtils';

/** Ambient dust motes floating in the light cone. */
export function spawnAmbientDust(scene: Phaser.Scene): Phaser.GameObjects.Particles.ParticleEmitter {
  return scene.add.particles(0, 0, 'spark', {
    x: { min: 200, max: GAME_WIDTH - 200 },
    y: { min: 100, max: GAME_HEIGHT - 200 },
    speed: { min: 5, max: 18 },
    angle: { min: 260, max: 280 },
    scale: { min: 0.08, max: 0.18 },
    alpha: { start: 0.35, end: 0 },
    lifespan: { min: 3000, max: 6000 },
    frequency: 400,
    tint: NEST_PALETTE.wallGlow,
  }).setDepth(5);
}
