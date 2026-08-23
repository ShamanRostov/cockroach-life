import { GAME_WIDTH, GAME_HEIGHT, GRID_TILE } from '../config';
import { getSafeAreaInsets } from './MobileUILayout';

/**
 * Nest scene layout — three columns, no overlap:
 * [ left chrome 0–272 ] [ play 272–1008 ] [ rail+build 1008–1280 ]
 */
export const NEST_LAYOUT = {
  leftChromeW: 272,
  rightChromeW: 272,
  topBarH: 100,
  sideMargin: 10,
  /** ResourceHUD panel size (must fit food/money/HP + bar). */
  hudW: 252,
  hudH: 102,
  rightRailW: 48,
  buildPanelW: 220,
  buildPanelTop: 112,
  buildPanelH: 420,
  defensePanelW: 252,
  /** Below resource HUD with a clear gap. */
  defensePanelTop: 128,
  /** Title + 3 traps + world map, all inside the panel. */
  defensePanelH: 248,
  arcadePanelH: 140,
  arcadePanelBottom: 12,
  eventBannerX: 640,
  eventBannerY: 40,
  regionSwitcherX: 640,
  regionSwitcherY: 96,
} as const;

export type NestHudSlot = 'daily' | 'shop' | 'breeding' | 'seasonPass';

const HUD_SLOTS: NestHudSlot[] = ['daily', 'shop', 'breeding', 'seasonPass'];

/** Icon buttons in a row above the build panel — no overlap with construction rail. */
export function getNestHudButtonX(slot: NestHudSlot): number {
  const idx = HUD_SLOTS.indexOf(slot);
  const startX = getBuildPanelX() + 32;
  return startX + idx * 56;
}

export function getNestHudButtonY(_slot?: NestHudSlot): number {
  return 56 + getSafeAreaInsets().top;
}

export function getRightPanelWidth(): number {
  return NEST_LAYOUT.buildPanelW;
}

export function getLeftPanelWidth(): number {
  return NEST_LAYOUT.defensePanelW;
}

export function getBuildPanelX(): number {
  return GAME_WIDTH - NEST_LAYOUT.sideMargin - NEST_LAYOUT.buildPanelW;
}

export function getBuildPanelCenterX(): number {
  return getBuildPanelX() + NEST_LAYOUT.buildPanelW / 2;
}

export function isNestUIRegion(x: number, y: number): boolean {
  const safe = getSafeAreaInsets();
  const buildX = getBuildPanelX();

  if (y < NEST_LAYOUT.topBarH + safe.top) return true;
  if (x >= buildX - 4) return true;
  if (x < NEST_LAYOUT.leftChromeW && y < NEST_LAYOUT.defensePanelTop + NEST_LAYOUT.defensePanelH + 8) {
    return true;
  }
  if (x < NEST_LAYOUT.leftChromeW && y > GAME_HEIGHT - NEST_LAYOUT.arcadePanelH - 24) return true;
  return false;
}

export function getEventBannerX(): number {
  return NEST_LAYOUT.eventBannerX;
}

export function getEventBannerY(): number {
  return NEST_LAYOUT.eventBannerY;
}

export function getRegionSwitcherX(): number {
  return NEST_LAYOUT.regionSwitcherX;
}

export function getRegionSwitcherY(): number {
  return NEST_LAYOUT.regionSwitcherY;
}

/** Center of grid cell (0,0) — top-down, centered in play column. */
export function getNestGridOrigin(): { x: number; y: number } {
  const playLeft = NEST_LAYOUT.leftChromeW;
  const playRight = GAME_WIDTH - NEST_LAYOUT.rightChromeW;
  const playTop = NEST_LAYOUT.topBarH;
  const playBottom =
    GAME_HEIGHT - NEST_LAYOUT.arcadePanelBottom - NEST_LAYOUT.arcadePanelH;
  const gridW = GRID_TILE.columns * GRID_TILE.size;
  const gridH = GRID_TILE.rows * GRID_TILE.size;

  return {
    x: playLeft + (playRight - playLeft - gridW) / 2 + GRID_TILE.size / 2,
    y: playTop + (playBottom - playTop - gridH) / 2 + GRID_TILE.size / 2,
  };
}

export function getNestGridBounds(): {
  left: number;
  top: number;
  width: number;
  height: number;
  originX: number;
  originY: number;
} {
  const { x: originX, y: originY } = getNestGridOrigin();
  const width = GRID_TILE.columns * GRID_TILE.size;
  const height = GRID_TILE.rows * GRID_TILE.size;

  return {
    left: originX - GRID_TILE.size / 2,
    top: originY - GRID_TILE.size / 2,
    width,
    height,
    originX,
    originY,
  };
}

export { GAME_WIDTH, GAME_HEIGHT };
