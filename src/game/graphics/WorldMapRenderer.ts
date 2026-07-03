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
    applyBalconyMapTheme(scene);
    bg.setTint(0xb8d4e8);
  } else if (region === 'stairwell') {
    applyStairwellMapTheme(scene);
    bg.setTint(0x616161);
  }

  return bg;
}

/** Sky gradient and balcony floor tint for the world map. */
export function applyBalconyMapTheme(scene: Phaser.Scene): void {
  const sky = scene.add.graphics().setDepth(1);
  sky.fillGradientStyle(0x87ceeb, 0x87ceeb, 0xe3f2fd, 0xc8e6c9, 1);
  sky.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT * 0.45);

  const floor = scene.add.graphics().setDepth(2);
  floor.fillStyle(0x8d9e7a, 0.35);
  floor.fillRect(0, GAME_HEIGHT * 0.42, GAME_WIDTH, GAME_HEIGHT * 0.58);

  const rail = scene.add.graphics().setDepth(3);
  rail.lineStyle(4, 0x78909c, 0.6);
  rail.lineBetween(40, GAME_HEIGHT * 0.55, GAME_WIDTH - 40, GAME_HEIGHT * 0.55);
}

/** Concrete gray stairwell with dim overhead lighting. */
export function applyStairwellMapTheme(scene: Phaser.Scene): void {
  const ceiling = scene.add.graphics().setDepth(1);
  ceiling.fillGradientStyle(0x263238, 0x263238, 0x37474f, 0x455a64, 1);
  ceiling.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT * 0.35);

  const floor = scene.add.graphics().setDepth(2);
  floor.fillStyle(0x757575, 0.45);
  floor.fillRect(0, GAME_HEIGHT * 0.32, GAME_WIDTH, GAME_HEIGHT * 0.68);

  const steps = scene.add.graphics().setDepth(3);
  steps.lineStyle(3, 0x9e9e9e, 0.35);
  for (let i = 0; i < 8; i++) {
    const y = GAME_HEIGHT * 0.4 + i * 42;
    steps.lineBetween(80 + i * 18, y, GAME_WIDTH - 80 - i * 18, y);
  }

  const dimLight = scene.add.graphics().setDepth(4);
  dimLight.fillStyle(0xffe082, 0.06);
  dimLight.fillCircle(GAME_WIDTH / 2, 60, 120);
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
