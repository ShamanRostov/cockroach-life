import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { getSafeAreaInsets } from './MobileUILayout';

/** Nest scene chrome layout — panels spaced to avoid overlap. */
export const NEST_LAYOUT = {
  topBarH: 100,
  sideMargin: 12,
  hudW: 300,
  hudH: 88,
  rightRailW: 56,
  buildPanelW: 228,
  buildPanelTop: 108,
  defensePanelW: 220,
  defensePanelTop: 108,
  defensePanelH: 192,
  arcadePanelH: 100,
  arcadePanelBottom: 16,
  gridCenterX: 640,
  gridCenterY: 400,
} as const;

export function getNestHudButtonX(): number {
  const safe = getSafeAreaInsets();
  return GAME_WIDTH - NEST_LAYOUT.sideMargin - NEST_LAYOUT.rightRailW / 2 - safe.right;
}

export function getNestHudButtonY(slot: 'daily' | 'shop' | 'breeding' | 'seasonPass'): number {
  const safe = getSafeAreaInsets();
  const base = 108 + safe.top;
  const gap = 46;
  const order = ['daily', 'shop', 'breeding', 'seasonPass'] as const;
  return base + order.indexOf(slot) * gap;
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

export function getDefensePanelCenterX(): number {
  return NEST_LAYOUT.sideMargin + NEST_LAYOUT.defensePanelW / 2;
}

export function isNestUIRegion(x: number, y: number): boolean {
  const safe = getSafeAreaInsets();
  const buildX = getBuildPanelX();
  const rightRailX = GAME_WIDTH - NEST_LAYOUT.sideMargin - NEST_LAYOUT.rightRailW - safe.right;
  const leftPanelRight = NEST_LAYOUT.defensePanelW + NEST_LAYOUT.sideMargin + 16;
  const defenseBottom = NEST_LAYOUT.defensePanelTop + NEST_LAYOUT.defensePanelH + 52;

  if (y < NEST_LAYOUT.topBarH + safe.top) return true;
  if (x >= rightRailX && y < 320) return true;
  if (x >= buildX - 8) return true;
  if (x < leftPanelRight && y < defenseBottom) return true;
  if (x < 440 && y > GAME_HEIGHT - NEST_LAYOUT.arcadePanelH - NEST_LAYOUT.arcadePanelBottom - 20) return true;
  return false;
}

export function getEventBannerY(): number {
  return 52;
}

export function getRegionSwitcherY(): number {
  return 96;
}

export { GAME_WIDTH, GAME_HEIGHT };
