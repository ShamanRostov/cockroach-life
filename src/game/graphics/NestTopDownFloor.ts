import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config';
import { getNestGridBounds } from '../ui/NestLayout';
import { NEST_PALETTE, darken } from './artUtils';
import { DEPTH } from './SceneDepth';

type NestRegion = 'apartment' | 'balcony' | 'stairwell';

/** Top-down nest play area: parquet floor, wall trim, optional region tint. */
export function createNestTopDownBackground(
  scene: Phaser.Scene,
  region: NestRegion,
): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0).setDepth(DEPTH.background);
  const bounds = getNestGridBounds();
  const { left, top, width, height } = bounds;
  const tile = 64;

  container.add(
    scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.bgWarm),
  );

  const floorG = scene.add.graphics();
  const cols = Math.ceil(width / tile);
  const rows = Math.ceil(height / tile);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const px = left + col * tile;
      const py = top + row * tile;
      const checker = (col + row) % 2;
      const base = checker ? NEST_PALETTE.linoleumBase : NEST_PALETTE.linoleumDark;
      floorG.fillStyle(base, 1);
      floorG.fillRect(px, py, tile, tile);
      floorG.lineStyle(1, NEST_PALETTE.linoleumGrout, 0.28);
      floorG.strokeRect(px, py, tile, tile);

      if (checker === 0) {
        floorG.fillStyle(darken(base, 0.08), 0.35);
        floorG.fillRect(px + 8, py + 8, tile - 16, tile - 16);
      }
    }
  }
  container.add(floorG);

  const trimG = scene.add.graphics();
  trimG.fillStyle(NEST_PALETTE.wallWarm, 1);
  trimG.fillRect(left - 10, top - 22, width + 20, 18);
  trimG.fillStyle(darken(NEST_PALETTE.wallWarm, 0.15), 1);
  trimG.fillRect(left - 10, top - 4, width + 20, 6);
  trimG.lineStyle(6, darken(NEST_PALETTE.wallWarm, 0.25), 1);
  trimG.strokeRect(left - 6, top - 6, width + 12, height + 12);
  trimG.lineStyle(2, NEST_PALETTE.linoleumGrout, 0.45);
  trimG.strokeRect(left + 4, top + 4, width - 8, height - 8);
  container.add(trimG);

  if (region === 'balcony') {
    container.add(
      scene.add.rectangle(left + width / 2, top + height / 2, width, height, 0x7ec8a0, 0.12),
    );
  } else if (region === 'stairwell') {
    container.add(
      scene.add.rectangle(left + width / 2, top + height / 2, width, height, 0x6e7a86, 0.18),
    );
  }

  return container;
}
