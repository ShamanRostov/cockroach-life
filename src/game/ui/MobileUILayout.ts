import { GAME_WIDTH, GAME_HEIGHT, MOBILE_UI_SCALE, isMobileDevice } from '../config';

export {
  getNestHudButtonX,
  getNestHudButtonY,
  getRightPanelWidth,
  getLeftPanelWidth,
  isNestUIRegion,
  NEST_LAYOUT,
  getBuildPanelX,
  getBuildPanelCenterX,
  getDefensePanelCenterX,
  getEventBannerY,
  getRegionSwitcherY,
} from './NestLayout';

export const MIN_TOUCH_TARGET = 44;

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface LayoutPoint {
  x: number;
  y: number;
}

/** Read safe-area insets from CSS variables (set in style.css). */
export function getSafeAreaInsets(): SafeAreaInsets {
  if (typeof document === 'undefined' || !isMobileDevice()) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  const root = document.documentElement;
  const style = getComputedStyle(root);
  const read = (name: string, fallback: number): number => {
    const raw = style.getPropertyValue(name).trim();
    const parsed = parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  return {
    top: read('--safe-area-top', 8),
    right: read('--safe-area-right', 8),
    bottom: read('--safe-area-bottom', 12),
    left: read('--safe-area-left', 8),
  };
}

/** Ensure a dimension meets the minimum touch target on mobile. */
export function minTouchTarget(size: number): number {
  if (!isMobileDevice()) return size;
  return Math.max(size, MIN_TOUCH_TARGET);
}

/** Scale a UI value for mobile screens. */
export function mobileScale(value: number): number {
  return isMobileDevice() ? value * MOBILE_UI_SCALE : value;
}

/** Button dimensions with mobile-friendly minimums. */
export function mobileButtonSize(width: number, height: number): { width: number; height: number } {
  if (!isMobileDevice()) return { width, height };
  return {
    width: Math.max(width, MIN_TOUCH_TARGET + 16),
    height: minTouchTarget(height),
  };
}

/** Position a UI element with safe-area offset on mobile. */
export function layoutCorner(
  corner: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight',
  offsetX: number,
  offsetY: number,
): LayoutPoint {
  const safe = getSafeAreaInsets();
  switch (corner) {
    case 'topLeft':
      return { x: offsetX + safe.left, y: offsetY + safe.top };
    case 'topRight':
      return { x: GAME_WIDTH - offsetX - safe.right, y: offsetY + safe.top };
    case 'bottomLeft':
      return { x: offsetX + safe.left, y: GAME_HEIGHT - offsetY - safe.bottom };
    case 'bottomRight':
      return { x: GAME_WIDTH - offsetX - safe.right, y: GAME_HEIGHT - offsetY - safe.bottom };
  }
}

/** True when a pointer is over world-map chrome (not the map). */
export function isWorldMapUIRegion(x: number, y: number): boolean {
  if (y < 70) return true;
  if (x > GAME_WIDTH - 150) return true;
  return false;
}

/** Larger pick radius for map markers on touch screens. */
export function mapPickRadius(): number {
  return isMobileDevice() ? 56 : 40;
}
