import { TILE } from '../config';

/** Convert isometric grid coords to screen position (center of tile). */
export function gridToScreen(
  gridX: number,
  gridY: number,
  originX: number,
  originY: number,
): { x: number; y: number } {
  const x = originX + (gridX - gridY) * (TILE.width / 2);
  const y = originY + (gridX + gridY) * (TILE.height / 2);
  return { x, y };
}

/** Convert screen position to nearest grid cell. */
export function screenToGrid(
  screenX: number,
  screenY: number,
  originX: number,
  originY: number,
): { gridX: number; gridY: number } {
  const dx = screenX - originX;
  const dy = screenY - originY;
  const gridX = Math.round((dx / (TILE.width / 2) + dy / (TILE.height / 2)) / 2);
  const gridY = Math.round((dy / (TILE.height / 2) - dx / (TILE.width / 2)) / 2);
  return { gridX, gridY };
}

export function drawIsoTile(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  fillColor: number,
  strokeColor?: number,
  fillAlpha = 1,
  strokeAlpha = 0.5,
): void {
  const hw = TILE.width / 2;
  const hh = TILE.height / 2;
  graphics.fillStyle(fillColor, fillAlpha);
  graphics.beginPath();
  graphics.moveTo(x, y - hh);
  graphics.lineTo(x + hw, y);
  graphics.lineTo(x, y + hh);
  graphics.lineTo(x - hw, y);
  graphics.closePath();
  if (fillAlpha > 0) {
    graphics.fillPath();
  }
  if (strokeColor !== undefined && strokeAlpha > 0) {
    graphics.lineStyle(1, strokeColor, strokeAlpha);
    graphics.strokePath();
  }
}

export function drawIsoBlock(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  baseColor: number,
  roofColor: number,
  height = 28,
): void {
  const hw = TILE.width / 2;
  const hh = TILE.height / 2;

  // Left face
  graphics.fillStyle(darken(baseColor, 0.25), 1);
  graphics.beginPath();
  graphics.moveTo(x - hw, y);
  graphics.lineTo(x, y + hh);
  graphics.lineTo(x, y + hh - height);
  graphics.lineTo(x - hw, y - height);
  graphics.closePath();
  graphics.fillPath();

  // Right face
  graphics.fillStyle(darken(baseColor, 0.12), 1);
  graphics.beginPath();
  graphics.moveTo(x + hw, y);
  graphics.lineTo(x, y + hh);
  graphics.lineTo(x, y + hh - height);
  graphics.lineTo(x + hw, y - height);
  graphics.closePath();
  graphics.fillPath();

  // Roof (top diamond)
  graphics.fillStyle(roofColor, 1);
  graphics.beginPath();
  graphics.moveTo(x, y - height - hh);
  graphics.lineTo(x + hw, y - height);
  graphics.lineTo(x, y - height + hh);
  graphics.lineTo(x - hw, y - height);
  graphics.closePath();
  graphics.fillPath();

  graphics.lineStyle(1, 0x000000, 0.15);
  graphics.strokePath();
}

function darken(color: number, amount: number): number {
  const r = Math.max(0, ((color >> 16) & 0xff) * (1 - amount));
  const g = Math.max(0, ((color >> 8) & 0xff) * (1 - amount));
  const b = Math.max(0, (color & 0xff) * (1 - amount));
  return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
}
