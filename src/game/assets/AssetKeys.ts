import type { RoomType } from '../systems/BuildingSystem';

export const BUILDING_TYPES: RoomType[] = [
  'kitchen',
  'bedroom',
  'storage',
  'nursery',
  'hospital',
  'planter',
  'shelter',
];

/** Phaser texture key for HD building sprite. */
export function buildingTextureKey(type: RoomType, _level = 1): string {
  return `building-${type}`;
}

export const COCKROACH_FRAMES = 8;

/** Scale trimmed 256×256 building sprites to isometric cell (~70–90 px tall). */
export function buildingDisplayScale(level: number): number {
  return 0.32 + (level - 1) * 0.045;
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
  ...BUILDING_TYPES.map((t) => `building-${t}`),
] as const;
