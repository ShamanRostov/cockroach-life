import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import type { MapPlayer } from '../types';
import type { MapDistrict, MapRegion } from '../systems/WorldMapData';

export interface TutorialTarget {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function addWorldMapBackground(
  scene: Phaser.Scene,
  region: MapRegion = 'apartment',
): Phaser.GameObjects.Image {
  const bg = scene.add
    .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'world-map-bg')
    .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
    .setDepth(0);

  if (region === 'balcony') {
    bg.setTint(0xb8d4e8);
  } else if (region === 'stairwell') {
    bg.setTint(0x9e9e9e);
  }

  return bg;
}

export function applyBalconyMapTheme(_scene: Phaser.Scene): void {
  /* PNG background + tint only — no procedural overlays */
}

export function applyStairwellMapTheme(_scene: Phaser.Scene): void {
  /* PNG background + tint only */
}

export function addNestMarker(
  scene: Phaser.Scene,
  player: MapPlayer,
  selected: boolean,
  pulse: number,
): Phaser.GameObjects.Image {
  const scale = (selected ? 0.14 : 0.11) + Math.sin(pulse) * 0.008;
  const marker = scene.add
    .image(player.mapX, player.mapY, 'nest-marker')
    .setScale(scale)
    .setTint(player.accentColor)
    .setDepth(selected ? 22 : 20);

  if (player.shieldUntil > Date.now()) {
    marker.setAlpha(0.85);
  }

  return marker;
}

/** District labels only — no procedural glow blobs. */
export function addDistrictGlow(
  _scene: Phaser.Scene,
  _districts: MapDistrict[],
  _depth = 12,
): Phaser.GameObjects.Graphics | null {
  return null;
}

export function addNeutralCrumb(
  scene: Phaser.Scene,
  x: number,
  y: number,
  pulse: number,
): Phaser.GameObjects.Image {
  return scene.add
    .image(x, y, 'food-crumb')
    .setScale(0.12 + Math.sin(pulse * 2) * 0.015)
    .setAlpha(0.75)
    .setDepth(18);
}

export function createRaidTrailImages(
  scene: Phaser.Scene,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  progress: number,
): Phaser.GameObjects.Image[] {
  const images: Phaser.GameObjects.Image[] = [];
  const steps = 12;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * progress;
    const x = Phaser.Math.Linear(fromX, toX, t);
    const y = Phaser.Math.Linear(fromY, toY, t);
    images.push(
      scene.add
        .image(x, y, 'spark')
        .setScale(0.08)
        .setAlpha(0.35 + t * 0.4)
        .setTint(0xffa726)
        .setDepth(30),
    );
  }
  return images;
}

export function districtLabelPosition(district: MapDistrict): { x: number; y: number } {
  return { x: district.mapX, y: district.mapY + 48 };
}
