import { GAME_WIDTH, GAME_HEIGHT } from '../config';
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
  hudW: 252,
  hudH: 76,
  rightRailW: 48,
  buildPanelW: 220,
  buildPanelTop: 112,
  buildPanelH: 340,
  defensePanelW: 252,
  defensePanelTop: 120,
  defensePanelH: 168,
  arcadePanelH: 118,
  arcadePanelBottom: 12,
  /** Isometric cell (0,0) center — aligned to nest-bg floor tiles at 1280×720. */
  gridOriginX: 608,
  gridOriginY: 252,
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
  const startX = getBuildPanelX() + 22;
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
  if (x < NEST_LAYOUT.leftChromeW && y < 340) return true;
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

export { GAME_WIDTH, GAME_HEIGHT };
