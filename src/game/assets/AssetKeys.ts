import type { RoomType } from '../systems/BuildingSystem';
import { GRID_TILE } from '../config';

export const BUILDING_TYPES: RoomType[] = [
  'kitchen',
  'bedroom',
  'storage',
  'nursery',
  'hospital',
  'planter',
  'shelter',
  'locker',
  'niche',
];

export const BUILDING_LEVELS = 5;

/** Source PNG size after process-building-sprites (256×256 contain). */
const BUILDING_TEXTURE_SIZE = 256;

/** Phaser texture key for HD building sprite (level 1–5). */
export function buildingTextureKey(type: RoomType, level = 1): string {
  const clamped = Math.max(1, Math.min(BUILDING_LEVELS, level));
  return `building-${type}-${clamped}`;
}

export const COCKROACH_FRAMES = 8;

/**
 * Scale 256×256 building sprites to fit one top-down grid cell.
 * Uses ~88% of cell size so neighbors don't visually overlap.
 */
export function buildingDisplayScale(_level = 1): number {
  return (GRID_TILE.size * 0.88) / BUILDING_TEXTURE_SIZE;
}

export const TEXTURE_KEYS = {
  ui: {
    panel: 'ui-panel',
    button: 'ui-button',
    buttonHover: 'ui-button-hover',
    hudPanel: 'ui-hud-panel',
  },
  menu: { background: 'menu-bg' },
  nest: { background: 'nest-bg', floorTile: 'floor-tile' },
  world: { background: 'world-map-bg' },
  raid: { infiltrateBg: 'raid-infiltrate-bg' },
  arcade: {
    slipperBg: 'arcade-slipper-bg',
    sprayBg: 'arcade-spray-bg',
    foodBg: 'arcade-food-bg',
    hospitalBg: 'arcade-hospital-bg',
    catchBg: 'arcade-catch-bg',
  },
  sprites: {
    slipper: 'slipper',
    foodCrumb: 'food-crumb',
    sprayCloud: 'spray-cloud',
    crack: 'crack',
    glueTrap: 'glue-trap',
    heartPulse: 'heart-pulse',
    spark: 'spark',
    nestMarker: 'nest-marker',
    cat: 'cat',
  },
} as const;

/** @deprecated Procedural assets — use TEXTURE_KEYS instead. */
export const ASSET_PATHS = TEXTURE_KEYS;

/** Texture keys with alpha — kept for reference; procedural art is already transparent. */
export const TRANSPARENT_SPRITE_KEYS = [
  'slipper',
  'food-crumb',
  'spray-cloud',
  'crack',
  'glue-trap',
  'heart-pulse',
  'spark',
  'nest-marker',
  'cat',
  ...BUILDING_TYPES.flatMap((t) =>
    Array.from({ length: BUILDING_LEVELS }, (_, i) => `building-${t}-${i + 1}`),
  ),
] as const;
