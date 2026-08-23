import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { DEPTH } from '../graphics/SceneDepth';

/**
 * Brief full-screen how-to banner at arcade start (fades out).
 */
export function showArcadeHint(
  scene: Phaser.Scene,
  howTo: string,
  controls: string,
  durationMs = 3800,
): void {
  const cx = GAME_WIDTH / 2;
  const cy = GAME_HEIGHT / 2 + 24;
  const depth = DEPTH.hud + 60;

  const bg = scene.add
    .rectangle(cx, cy, Math.min(720, GAME_WIDTH - 80), 110, 0x1a1208, 0.92)
    .setStrokeStyle(2, 0xffa726, 0.85)
    .setDepth(depth);

  const how = scene.add
    .text(cx, cy - 18, howTo, {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#fff8e1',
      align: 'center',
      wordWrap: { width: Math.min(680, GAME_WIDTH - 120) },
    })
    .setOrigin(0.5)
    .setDepth(depth + 1);

  const ctrl = scene.add
    .text(cx, cy + 22, controls, {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '16px',
      color: '#ffca28',
      align: 'center',
      wordWrap: { width: Math.min(680, GAME_WIDTH - 120) },
    })
    .setOrigin(0.5)
    .setDepth(depth + 1);

  scene.tweens.add({
    targets: [bg, how, ctrl],
    alpha: 0,
    delay: durationMs,
    duration: 500,
    onComplete: () => {
      bg.destroy();
      how.destroy();
      ctrl.destroy();
    },
  });
}
