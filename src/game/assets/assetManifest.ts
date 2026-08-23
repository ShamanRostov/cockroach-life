import { ROOM_DEFINITIONS, type RoomType } from '../systems/BuildingSystem';
import { BUILDING_LEVELS, COCKROACH_FRAMES } from './AssetKeys';

const ALL_BUILDING_TYPES = Object.keys(ROOM_DEFINITIONS) as RoomType[];

export interface AssetEntry {
  key: string;
  path: string;
}

function ui(path: string, key: string): AssetEntry {
  return { key, path: `/assets/ui/${path}` };
}

function bg(path: string, key: string): AssetEntry {
  return { key, path: `/assets/backgrounds/${path}` };
}

function sprite(path: string, key: string): AssetEntry {
  return { key, path: `/assets/sprites/${path}` };
}

function building(type: RoomType, level: number): AssetEntry {
  return {
    key: `building-${type}-${level}`,
    path: `/assets/buildings/building-${type}-${level}.png`,
  };
}

function roach(frame: number): AssetEntry {
  return { key: `cockroach-${frame}`, path: `/assets/characters/cockroach-${frame}.png` };
}

function roachSide(frame: number): AssetEntry {
  return { key: `cockroach-side-${frame}`, path: `/assets/characters/cockroach-side-${frame}.png` };
}

/** All PNG textures loaded at boot — no procedural fallback. */
export const GAME_ASSET_MANIFEST: AssetEntry[] = [
  ui('ui-panel.png', 'ui-panel'),
  ui('ui-button.png', 'ui-button'),
  ui('ui-button-hover.png', 'ui-button-hover'),
  ui('ui-hud-panel.png', 'ui-hud-panel'),
  bg('menu-bg.png', 'menu-bg'),
  bg('nest-bg.png', 'nest-bg'),
  bg('floor-tile.png', 'floor-tile'),
  bg('world-map-bg.png', 'world-map-bg'),
  bg('raid-infiltrate-bg.png', 'raid-infiltrate-bg'),
  bg('arcade-slipper-bg.png', 'arcade-slipper-bg'),
  bg('arcade-spray-bg.png', 'arcade-spray-bg'),
  bg('arcade-food-bg.png', 'arcade-food-bg'),
  bg('arcade-hospital-bg.png', 'arcade-hospital-bg'),
  bg('arcade-catch-bg.png', 'arcade-catch-bg'),
  sprite('slipper.png', 'slipper'),
  sprite('food-crumb.png', 'food-crumb'),
  sprite('spray-cloud.png', 'spray-cloud'),
  sprite('crack.png', 'crack'),
  sprite('glue-trap.png', 'glue-trap'),
  sprite('heart-pulse.png', 'heart-pulse'),
  sprite('spark.png', 'spark'),
  sprite('nest-marker.png', 'nest-marker'),
  sprite('cat.png', 'cat'),
  ...ALL_BUILDING_TYPES.flatMap((t) =>
    Array.from({ length: BUILDING_LEVELS }, (_, i) => building(t, i + 1)),
  ),
  ...Array.from({ length: COCKROACH_FRAMES }, (_, i) => roach(i)),
  ...Array.from({ length: COCKROACH_FRAMES }, (_, i) => roachSide(i)),
];
