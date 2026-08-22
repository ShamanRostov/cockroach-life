import { GRID_TILE } from '../config';

/** Convert orthogonal grid coords to screen position (center of cell). */
export function gridToScreen(
  gridX: number,
  gridY: number,
  originX: number,
  originY: number,
): { x: number; y: number } {
  return {
    x: originX + gridX * GRID_TILE.size,
    y: originY + gridY * GRID_TILE.size,
  };
}

/** Convert screen position to nearest grid cell. */
export function screenToGrid(
  screenX: number,
  screenY: number,
  originX: number,
  originY: number,
): { gridX: number; gridY: number } {
  const gridX = Math.round((screenX - originX) / GRID_TILE.size);
  const gridY = Math.round((screenY - originY) / GRID_TILE.size);
  return { gridX, gridY };
}

export function drawGridCell(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  fillColor: number,
  strokeColor?: number,
  fillAlpha = 1,
  strokeAlpha = 0.5,
): void {
  const half = GRID_TILE.size / 2;
  const left = x - half;
  const top = y - half;

  if (fillAlpha > 0) {
    graphics.fillStyle(fillColor, fillAlpha);
    graphics.fillRect(left, top, GRID_TILE.size, GRID_TILE.size);
  }

  if (strokeColor !== undefined && strokeAlpha > 0) {
    graphics.lineStyle(1, strokeColor, strokeAlpha);
    graphics.strokeRect(left, top, GRID_TILE.size, GRID_TILE.size);
  }
}
