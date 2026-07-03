import Phaser from 'phaser';
import { NEST_PALETTE, darken, lighten } from './artUtils';
import { ROOM_DEFINITIONS, type RoomType } from '../systems/BuildingSystem';
import { COLORS } from '../config';

const ALL_BUILDING_TYPES = Object.keys(ROOM_DEFINITIONS) as RoomType[];

export const PROCEDURAL_TEXTURE_KEYS = [
  'ui-panel',
  'ui-button',
  'ui-button-hover',
  'ui-hud-panel',
  'menu-bg',
  'nest-bg',
  'floor-tile',
  'world-map-bg',
  'raid-infiltrate-bg',
  'arcade-slipper-bg',
  'arcade-spray-bg',
  'arcade-food-bg',
  'arcade-hospital-bg',
  'arcade-catch-bg',
  'slipper',
  'food-crumb',
  'spray-cloud',
  'crack',
  'glue-trap',
  'heart-pulse',
  'spark',
  'nest-marker',
  'cat',
  ...ALL_BUILDING_TYPES.map((t) => `building-${t}`),
] as const;

type ProgressFn = (value: number) => void;

function gfx(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  return scene.make.graphics({ x: 0, y: 0 }, false);
}

function finish(g: Phaser.GameObjects.Graphics): void {
  g.destroy();
}

function drawRoundedRect(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: number,
  fillAlpha = 1,
  stroke?: number,
  strokeW = 2,
): void {
  g.fillStyle(fill, fillAlpha);
  g.beginPath();
  g.moveTo(x + r, y);
  g.lineTo(x + w - r, y);
  g.arc(x + w - r, y + r, r, -Math.PI / 2, 0);
  g.lineTo(x + w, y + h - r);
  g.arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
  g.lineTo(x + r, y + h);
  g.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
  g.lineTo(x, y + r);
  g.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
  g.closePath();
  g.fillPath();
  if (stroke !== undefined) {
    g.lineStyle(strokeW, stroke, 1);
    g.strokePath();
  }
}

function verticalGradient(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  top: number,
  bottom: number,
): void {
  const steps = Math.max(8, Math.floor(h / 4));
  for (let i = 0; i < steps; i++) {
    const t0 = i / steps;
    const t1 = (i + 1) / steps;
    const c0 = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.IntegerToColor(top),
      Phaser.Display.Color.IntegerToColor(bottom),
      steps,
      i,
    );
    const color = Phaser.Display.Color.GetColor(c0.r, c0.g, c0.b);
    g.fillStyle(color, 1);
    g.fillRect(x, y + t0 * h, w, (t1 - t0) * h + 1);
  }
}

function drawUiPanel(g: Phaser.GameObjects.Graphics): void {
  const s = 512;
  verticalGradient(g, 0, 0, s, s, 0x3d2817, 0x2a1a0e);
  drawRoundedRect(g, 16, 16, s - 32, s - 32, 28, 0x4a3220, 1, NEST_PALETTE.wallGlow, 4);
  drawRoundedRect(g, 24, 24, s - 48, s - 48, 22, 0x352318, 1, darken(NEST_PALETTE.wallGlow, 0.35), 2);
  g.lineStyle(1, lighten(NEST_PALETTE.cardboard, 0.15), 0.25);
  for (let y = 48; y < s - 48; y += 18) {
    g.lineBetween(40, y, s - 40, y);
  }
}

function drawUiButton(g: Phaser.GameObjects.Graphics, hover: boolean): void {
  const s = 512;
  const base = hover ? 0xff9800 : COLORS.accent;
  const top = lighten(base, hover ? 0.22 : 0.15);
  const bottom = darken(base, hover ? 0.05 : 0.12);
  verticalGradient(g, 0, 0, s, s, top, bottom);
  drawRoundedRect(g, 12, 12, s - 24, s - 24, 24, base, 1, lighten(base, 0.3), 3);
  g.fillStyle(0xffffff, hover ? 0.22 : 0.14);
  g.fillRoundedRect(28, 28, s - 56, (s - 56) * 0.35, 16);
  g.fillStyle(darken(base, 0.25), 0.35);
  g.fillRoundedRect(28, s - 28 - 40, s - 56, 40, 12);
}

function drawUiHudPanel(g: Phaser.GameObjects.Graphics): void {
  const w = 512;
  const h = 512;
  verticalGradient(g, 0, 0, w, h, 0x3a2818, 0x26180e);
  drawRoundedRect(g, 8, 8, w - 16, h - 16, 20, 0x322218, 0.95, NEST_PALETTE.wallGlow, 3);
  for (let i = 0; i < 3; i++) {
    const sy = 48 + i * 120;
    g.fillStyle(darken(NEST_PALETTE.linoleumBase, 0.55), 0.85);
    g.fillRoundedRect(36, sy, w - 72, 88, 12);
    g.lineStyle(2, NEST_PALETTE.metal, 0.5);
    g.strokeRoundedRect(36, sy, w - 72, 88, 12);
    g.fillStyle(NEST_PALETTE.metalShine, 0.35);
    g.fillCircle(72, sy + 44, 18);
    g.fillStyle(darken(NEST_PALETTE.metal, 0.2), 0.6);
    g.fillCircle(72, sy + 44, 10);
  }
}

function drawTileGrid(
  g: Phaser.GameObjects.Graphics,
  w: number,
  h: number,
  tileW: number,
  tileH: number,
  base: number,
  alt: number,
  grout: number,
): void {
  for (let row = 0; row < Math.ceil(h / tileH) + 1; row++) {
    for (let col = 0; col < Math.ceil(w / tileW) + 1; col++) {
      const x = col * tileW + (row % 2 ? tileW / 2 : 0);
      const y = row * tileH;
      const c = (row + col) % 2 === 0 ? base : alt;
      g.fillStyle(c, 1);
      g.fillRect(x, y, tileW - 1, tileH - 1);
      g.lineStyle(1, grout, 0.6);
      g.strokeRect(x, y, tileW - 1, tileH - 1);
    }
  }
}

function drawPlinth(g: Phaser.GameObjects.Graphics, w: number, h: number, y: number): void {
  // Soft shadow cast by the wall onto the floor
  for (let i = 0; i < 6; i++) {
    const t = i / 6;
    g.fillStyle(0x000000, 0.12 * (1 - t));
    g.fillRect(0, y + 4 + t * 18, w, 4);
  }
  verticalGradient(g, 0, y, w, h - y, NEST_PALETTE.wallWarm, darken(NEST_PALETTE.wallWarm, 0.25));
  g.lineStyle(3, NEST_PALETTE.linoleumGrout, 0.8);
  g.lineBetween(0, y + 2, w, y + 2);
  g.fillStyle(darken(NEST_PALETTE.wallWarm, 0.35), 0.5);
  g.fillRect(0, y + 8, w, 24);
  g.lineStyle(1, lighten(NEST_PALETTE.wallWarm, 0.08), 0.35);
  g.lineBetween(0, y + 32, w, y + 32);
}

function drawWarmLampGlow(g: Phaser.GameObjects.Graphics, cx: number, cy: number, radius: number): void {
  for (let i = 12; i >= 0; i--) {
    const t = i / 12;
    g.fillStyle(NEST_PALETTE.wallGlow, 0.04 * (1 - t));
    g.fillCircle(cx, cy, radius * t);
  }
}

function drawMenuBg(g: Phaser.GameObjects.Graphics): void {
  const w = 640;
  const h = 360;
  g.fillStyle(darken(NEST_PALETTE.linoleumBase, 0.15), 1);
  g.fillRect(0, 0, w, h);
  drawTileGrid(g, w, h, 48, 24, NEST_PALETTE.linoleumBase, NEST_PALETTE.linoleumDark, NEST_PALETTE.linoleumGrout);
  drawPlinth(g, w, h, 72);
  drawWarmLampGlow(g, w * 0.72, 48, 180);
  // Baked-in dust motes floating in lamp light
  const dustSeeds = [
    [0.18, 0.42, 1.5], [0.31, 0.38, 1], [0.45, 0.52, 2], [0.58, 0.35, 1.2],
    [0.67, 0.48, 1.8], [0.74, 0.41, 1], [0.82, 0.55, 1.4], [0.25, 0.62, 1.6],
    [0.52, 0.68, 1.1], [0.88, 0.32, 1.3], [0.12, 0.58, 1.7], [0.38, 0.72, 1],
  ];
  for (const [nx, ny, r] of dustSeeds) {
    g.fillStyle(0xfff8e1, 0.08 + (r as number) * 0.02);
    g.fillCircle((nx as number) * w, (ny as number) * h, r as number);
    g.fillStyle(0xffcc80, 0.06);
    g.fillCircle((nx as number) * w + 2, (ny as number) * h - 1, (r as number) * 0.6);
  }
  g.fillStyle(NEST_PALETTE.dirt, 0.35);
  for (let i = 0; i < 18; i++) {
    g.fillEllipse(Phaser.Math.Between(20, w - 20), Phaser.Math.Between(h * 0.55, h - 10), 8, 4);
  }
  g.fillStyle(NEST_PALETTE.crumb, 0.5);
  g.fillCircle(w * 0.3, h * 0.78, 4);
  g.fillCircle(w * 0.62, h * 0.85, 3);
  // Scuff marks near plinth base
  g.lineStyle(1, darken(NEST_PALETTE.linoleumGrout, 0.1), 0.25);
  for (let i = 0; i < 5; i++) {
    const sx = 80 + i * 110;
    g.lineBetween(sx, h * 0.78, sx + 30, h * 0.8);
  }
}

function drawNestBg(g: Phaser.GameObjects.Graphics): void {
  const w = 640;
  const h = 360;
  verticalGradient(g, 0, 0, w, h, lighten(NEST_PALETTE.linoleumBase, 0.08), NEST_PALETTE.linoleumDark);
  drawTileGrid(g, w, h, 40, 20, NEST_PALETTE.linoleumBase, NEST_PALETTE.linoleumDark, NEST_PALETTE.linoleumGrout);
  drawPlinth(g, w, h, 56);
  drawWarmLampGlow(g, w / 2, 0, 220);
  g.lineStyle(2, NEST_PALETTE.wallGlow, 0.15);
  g.lineBetween(w * 0.2, 0, w * 0.8, 0);
}

function drawFloorTile(g: Phaser.GameObjects.Graphics): void {
  const w = 64;
  const h = 32;
  const groutDark = darken(NEST_PALETTE.linoleumGrout, 0.2);
  const groutLight = lighten(NEST_PALETTE.linoleumGrout, 0.12);

  // Grout base — full diamond outline
  g.fillStyle(groutDark, 1);
  g.beginPath();
  g.moveTo(w / 2, 0);
  g.lineTo(w, h / 2);
  g.lineTo(w / 2, h);
  g.lineTo(0, h / 2);
  g.closePath();
  g.fillPath();

  // Tile face inset from grout
  const inset = 2;
  g.fillStyle(NEST_PALETTE.linoleumBase, 1);
  g.beginPath();
  g.moveTo(w / 2, inset);
  g.lineTo(w - inset, h / 2);
  g.lineTo(w / 2, h - inset);
  g.lineTo(inset, h / 2);
  g.closePath();
  g.fillPath();

  // Inner grout cross at tile seams
  g.lineStyle(1, groutLight, 0.85);
  g.lineBetween(w / 2, inset, w / 2, h - inset);
  g.lineBetween(inset, h / 2, w - inset, h / 2);

  // Highlight / shadow facets
  g.fillStyle(lighten(NEST_PALETTE.linoleumBase, 0.12), 0.5);
  g.fillTriangle(w / 2, inset + 1, w - inset - 2, h / 2, w / 2, h / 2);
  g.fillStyle(darken(NEST_PALETTE.linoleumDark, 0.1), 0.45);
  g.fillTriangle(w / 2, h / 2, inset + 2, h / 2, w / 2, h - inset - 1);

  // Outer grout edge
  g.lineStyle(1, groutDark, 0.95);
  g.beginPath();
  g.moveTo(w / 2, 0);
  g.lineTo(w, h / 2);
  g.lineTo(w / 2, h);
  g.lineTo(0, h / 2);
  g.closePath();
  g.strokePath();
}

function drawWorldMapBg(g: Phaser.GameObjects.Graphics): void {
  const w = 640;
  const h = 360;
  g.fillStyle(0x1a2838, 1);
  g.fillRect(0, 0, w, h);
  g.lineStyle(1, 0x4fc3f7, 0.25);
  for (let x = 0; x < w; x += 32) g.lineBetween(x, 0, x, h);
  for (let y = 0; y < h; y += 32) g.lineBetween(0, y, w, y);
  const rooms = [
    { x: 80, y: 60, rw: 160, rh: 100, label: 0x4dd0e1 },
    { x: 260, y: 50, rw: 140, rh: 120, label: 0x81c784 },
    { x: 420, y: 70, rw: 160, rh: 90, label: 0xffb74d },
    { x: 100, y: 190, rw: 200, rh: 120, label: 0xce93d8 },
    { x: 320, y: 200, rw: 260, rh: 110, label: 0x90caf9 },
  ];
  for (const r of rooms) {
    g.lineStyle(2, r.label, 0.55);
    g.strokeRect(r.x, r.y, r.rw, r.rh);
    g.fillStyle(r.label, 0.08);
    g.fillRect(r.x, r.y, r.rw, r.rh);
  }
  g.lineStyle(3, 0xffa726, 0.7);
  g.strokeCircle(520, 280, 28);
  g.fillStyle(0xffa726, 0.15);
  g.fillCircle(520, 280, 28);
}

function drawRaidBg(g: Phaser.GameObjects.Graphics): void {
  const w = 640;
  const h = 360;
  g.fillStyle(0x0d0a08, 1);
  g.fillRect(0, 0, w, h);
  verticalGradient(g, w * 0.28, 0, w * 0.44, h, 0x2a2018, 0x1a1208);
  g.fillStyle(darken(NEST_PALETTE.wallWarm, 0.1), 1);
  g.fillRect(0, 0, w * 0.26, h);
  g.fillRect(w * 0.74, 0, w * 0.26, h);
  g.lineStyle(2, NEST_PALETTE.linoleumGrout, 0.3);
  for (let y = 0; y < h; y += 24) {
    g.lineBetween(w * 0.26, y, w * 0.74, y);
  }
  drawWarmLampGlow(g, w / 2, h * 0.15, 100);
}

function drawArcadeSlipperBg(g: Phaser.GameObjects.Graphics): void {
  const w = 640;
  const h = 360;
  drawTileGrid(g, w, h, 44, 22, 0xc9b896, 0xb39a72, NEST_PALETTE.linoleumGrout);
  g.fillStyle(COLORS.danger, 0.12);
  g.fillRect(0, h * 0.65, w, h * 0.35);
  g.lineStyle(4, COLORS.danger, 0.45);
  g.lineBetween(0, h * 0.65, w, h * 0.65);
  for (let i = 0; i < 8; i++) {
    g.fillStyle(COLORS.danger, 0.25);
    g.fillTriangle(i * 90 + 10, h * 0.68, i * 90 + 40, h * 0.68, i * 90 + 25, h * 0.62);
  }
}

function drawArcadeSprayBg(g: Phaser.GameObjects.Graphics): void {
  const w = 640;
  const h = 360;
  drawTileGrid(g, w, h, 36, 36, 0xdcedc8, 0xc5e1a5, 0x81c784);
  for (let i = 0; i < 20; i++) {
    g.fillStyle(0x76ff03, 0.08 + Math.random() * 0.1);
    g.fillCircle(Phaser.Math.Between(0, w), Phaser.Math.Between(0, h), Phaser.Math.Between(20, 60));
  }
  g.fillStyle(0x33691e, 0.25);
  g.fillRect(0, 0, w, h);
}

function drawArcadeFoodBg(g: Phaser.GameObjects.Graphics): void {
  const w = 640;
  const h = 360;
  verticalGradient(g, 0, 0, w, h, 0x5d4037, 0x3e2723);
  g.fillStyle(0x6d4c41, 1);
  g.fillRoundedRect(40, 80, w - 80, h - 120, 16);
  g.lineStyle(3, darken(NEST_PALETTE.cardboard, 0.2), 0.8);
  g.strokeRoundedRect(40, 80, w - 80, h - 120, 16);
  for (let i = 0; i < 30; i++) {
    g.fillStyle(NEST_PALETTE.crumb, 0.5 + Math.random() * 0.4);
    g.fillCircle(
      Phaser.Math.Between(60, w - 60),
      Phaser.Math.Between(100, h - 60),
      Phaser.Math.Between(2, 6),
    );
  }
  g.fillStyle(0xffffff, 0.06);
  g.fillEllipse(w / 2, 100, w * 0.5, 40);
}

function drawArcadeHospitalBg(g: Phaser.GameObjects.Graphics): void {
  const w = 640;
  const h = 360;
  g.fillStyle(NEST_PALETTE.bandage, 1);
  g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 48) {
    for (let y = 0; y < h; y += 48) {
      g.lineStyle(1, 0xe3f2fd, 0.5);
      g.strokeRect(x, y, 48, 48);
    }
  }
  g.lineStyle(8, NEST_PALETTE.bandageCross, 0.35);
  g.lineBetween(w * 0.3, h * 0.35, w * 0.7, h * 0.65);
  g.lineBetween(w * 0.7, h * 0.35, w * 0.3, h * 0.65);
  g.fillStyle(NEST_PALETTE.cotton, 0.6);
  g.fillRoundedRect(w * 0.15, h * 0.2, w * 0.7, h * 0.55, 12);
}

function drawArcadeCatchBg(g: Phaser.GameObjects.Graphics): void {
  const w = 640;
  const h = 360;
  drawTileGrid(g, w, h, 44, 22, NEST_PALETTE.linoleumBase, NEST_PALETTE.linoleumDark, NEST_PALETTE.linoleumGrout);
  drawPlinth(g, w, h, 64);
  g.fillStyle(0x000000, 0.45);
  g.fillEllipse(w * 0.68, h * 0.55, 120, 50);
  g.fillStyle(0x000000, 0.35);
  g.fillEllipse(w * 0.68, h * 0.55, 90, 35);
  g.fillStyle(0x1a1208, 0.5);
  g.fillCircle(w * 0.68, h * 0.42, 28);
  g.fillEllipse(w * 0.55, h * 0.38, 18, 12);
  g.fillEllipse(w * 0.81, h * 0.38, 18, 12);
  g.lineStyle(6, 0x1a1208, 0.4);
  g.lineBetween(w * 0.68, h * 0.48, w * 0.68, h * 0.72);
  drawWarmLampGlow(g, w * 0.25, 40, 120);
}

function drawSlipper(g: Phaser.GameObjects.Graphics): void {
  const s = 64;
  g.fillStyle(0xf48fb1, 1);
  g.fillEllipse(s / 2, s / 2 + 4, 44, 28);
  g.fillStyle(0xec407a, 1);
  g.fillEllipse(s / 2 - 6, s / 2 + 2, 36, 22);
  g.fillStyle(0xffffff, 0.35);
  g.fillEllipse(s / 2 - 10, s / 2 - 2, 16, 8);
  g.lineStyle(2, darken(0xec407a, 0.2), 0.8);
  g.strokeEllipse(s / 2, s / 2 + 4, 44, 28);
}

function drawFoodCrumb(g: Phaser.GameObjects.Graphics): void {
  const s = 32;
  g.fillStyle(NEST_PALETTE.crumb, 1);
  g.fillCircle(s / 2, s / 2, 10);
  g.fillStyle(lighten(NEST_PALETTE.cereal, 0.1), 0.8);
  g.fillCircle(s / 2 - 3, s / 2 - 3, 4);
  g.fillStyle(darken(NEST_PALETTE.crumb, 0.15), 0.6);
  g.fillCircle(s / 2 + 4, s / 2 + 3, 3);
}

function drawSprayCloud(g: Phaser.GameObjects.Graphics): void {
  const s = 64;
  for (let i = 0; i < 6; i++) {
    const cx = s / 2 + Math.cos(i * 1.1) * 12;
    const cy = s / 2 + Math.sin(i * 1.1) * 10;
    g.fillStyle(0x76ff03, 0.35 + i * 0.05);
    g.fillCircle(cx, cy, 14 + i * 2);
  }
  g.fillStyle(0xc6ff00, 0.5);
  g.fillCircle(s / 2, s / 2, 12);
}

function drawCrack(g: Phaser.GameObjects.Graphics): void {
  const s = 64;
  g.lineStyle(3, NEST_PALETTE.linoleumGrout, 0.9);
  g.lineBetween(8, 10, s * 0.44, s * 0.47);
  g.lineBetween(s * 0.44, s * 0.47, s * 0.34, s * 0.78);
  g.lineBetween(s * 0.34, s * 0.78, s * 0.625, s * 0.84);
  g.lineStyle(2, darken(NEST_PALETTE.wallWarm, 0.1), 0.7);
  g.lineBetween(12, 14, s * 0.47, s * 0.5);
  g.fillStyle(darken(NEST_PALETTE.wallWarm, 0.2), 0.5);
  g.fillTriangle(s * 0.31, s * 0.75, s * 0.69, s * 0.81, s * 0.56, s * 0.91);
}

function drawGlueTrap(g: Phaser.GameObjects.Graphics): void {
  const s = 64;
  g.fillStyle(NEST_PALETTE.cardboard, 1);
  g.fillRoundedRect(6, 14, s - 12, s - 28, 4);
  g.fillStyle(0xffc107, 0.85);
  g.fillRoundedRect(12, 20, s - 24, s - 40, 3);
  g.fillStyle(0xffa000, 0.5);
  g.fillCircle(s / 2, s / 2, 10);
  g.lineStyle(1, NEST_PALETTE.cardboardLine, 0.6);
  g.strokeRoundedRect(6, 14, s - 12, s - 28, 4);
}

function drawHeartPulse(g: Phaser.GameObjects.Graphics): void {
  const s = 48;
  g.fillStyle(COLORS.health, 1);
  g.fillCircle(s * 0.33, s * 0.375, 10);
  g.fillCircle(s * 0.67, s * 0.375, 10);
  g.fillTriangle(s * 0.17, s * 0.46, s * 0.83, s * 0.46, s * 0.5, s * 0.875);
  g.fillStyle(lighten(COLORS.health, 0.2), 0.5);
  g.fillCircle(s * 0.29, s * 0.33, 4);
}

function drawSpark(g: Phaser.GameObjects.Graphics): void {
  const s = 32;
  const cx = s / 2;
  const cy = s / 2;
  g.fillStyle(COLORS.food, 1);
  g.fillCircle(cx, cy, 4);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    g.fillTriangle(
      cx,
      cy,
      cx + Math.cos(a - 0.15) * 14,
      cy + Math.sin(a - 0.15) * 14,
      cx + Math.cos(a + 0.15) * 14,
      cy + Math.sin(a + 0.15) * 14,
    );
  }
}

function drawNestMarker(g: Phaser.GameObjects.Graphics): void {
  const s = 48;
  g.fillStyle(COLORS.accent, 1);
  g.fillCircle(s / 2, s / 2 + 4, 14);
  g.fillTriangle(s / 2, 6, s / 2 - 12, s / 2 + 2, s / 2 + 12, s / 2 + 2);
  g.fillStyle(NEST_PALETTE.dirt, 0.8);
  g.fillCircle(s / 2, s / 2 + 6, 6);
}

function drawCat(g: Phaser.GameObjects.Graphics): void {
  const s = 64;
  g.fillStyle(0xff7043, 1);
  g.fillEllipse(s / 2, s / 2 + 6, 36, 26);
  g.fillStyle(0xe64a19, 1);
  g.fillCircle(s / 2, s / 2 - 4, 16);
  g.fillTriangle(s / 2 - 14, s / 2 - 14, s / 2 - 6, s / 2 - 6, s / 2 - 2, s / 2 - 16);
  g.fillTriangle(s / 2 + 14, s / 2 - 14, s / 2 + 6, s / 2 - 6, s / 2 + 2, s / 2 - 16);
  g.fillStyle(0xffffff, 0.9);
  g.fillCircle(s / 2 - 6, s / 2 - 6, 3);
  g.fillCircle(s / 2 + 6, s / 2 - 6, 3);
  g.fillStyle(0x1a1208, 1);
  g.fillCircle(s / 2 - 6, s / 2 - 6, 1.5);
  g.fillCircle(s / 2 + 6, s / 2 - 6, 1.5);
  g.lineStyle(3, 0xe64a19, 0.8);
  g.lineBetween(s / 2 + 10, s / 2, s / 2 + 28, s / 2 - 4);
}

function drawBuildingKitchen(g: Phaser.GameObjects.Graphics, def: (typeof ROOM_DEFINITIONS)['kitchen']): void {
  const s = 512;
  const cx = s / 2;
  const base = s * 0.72;
  g.fillStyle(NEST_PALETTE.shadow, 0.5);
  g.fillEllipse(cx, base + 20, 210, 44);
  g.fillStyle(NEST_PALETTE.cardboard, 1);
  g.fillRect(cx - 90, base - 120, 180, 110);
  g.lineStyle(4, darken(NEST_PALETTE.cardboard, 0.4), 0.9);
  g.strokeRect(cx - 90, base - 120, 180, 110);
  g.lineStyle(2, NEST_PALETTE.cardboardDark, 0.6);
  g.lineBetween(cx - 90, base - 60, cx + 90, base - 60);
  g.fillStyle(def.roofColor, 0.85);
  g.fillTriangle(cx - 100, base - 120, cx + 100, base - 120, cx, base - 200);
  g.lineStyle(3, darken(def.roofColor, 0.3), 0.85);
  g.beginPath();
  g.moveTo(cx - 100, base - 120);
  g.lineTo(cx + 100, base - 120);
  g.lineTo(cx, base - 200);
  g.closePath();
  g.strokePath();
  for (let i = 0; i < 8; i++) {
    g.lineStyle(2, NEST_PALETTE.straw, 0.9);
    g.lineBetween(cx - 60 + i * 16, base - 115, cx - 50 + i * 16, base - 175);
  }
}

function drawBuildingBedroom(g: Phaser.GameObjects.Graphics, def: (typeof ROOM_DEFINITIONS)['bedroom']): void {
  const s = 512;
  const cx = s / 2;
  const base = s * 0.72;
  g.fillStyle(NEST_PALETTE.shadow, 0.5);
  g.fillEllipse(cx, base + 20, 190, 40);
  g.fillStyle(NEST_PALETTE.fabric, 1);
  g.fillRoundedRect(cx - 100, base - 80, 200, 70, 30);
  g.lineStyle(4, darken(NEST_PALETTE.fabricDark, 0.15), 0.85);
  g.strokeRoundedRect(cx - 100, base - 80, 200, 70, 30);
  g.fillStyle(NEST_PALETTE.fabricDark, 1);
  g.fillCircle(cx - 70, base - 55, 35);
  g.fillCircle(cx + 70, base - 55, 35);
  g.fillStyle(def.color, 0.7);
  g.fillRoundedRect(cx - 40, base - 100, 80, 90, 20);
  g.lineStyle(3, darken(def.color, 0.25), 0.8);
  g.strokeRoundedRect(cx - 40, base - 100, 80, 90, 20);
  g.lineStyle(2, lighten(NEST_PALETTE.fabric, 0.1), 0.5);
  g.strokeRoundedRect(cx - 100, base - 80, 200, 70, 30);
}

function drawBuildingStorage(g: Phaser.GameObjects.Graphics, def: (typeof ROOM_DEFINITIONS)['storage']): void {
  const s = 512;
  const cx = s / 2;
  const base = s * 0.72;
  g.fillStyle(NEST_PALETTE.shadow, 0.5);
  g.fillEllipse(cx, base + 20, 170, 36);
  g.fillStyle(NEST_PALETTE.metal, 1);
  g.fillRect(cx - 55, base - 130, 110, 120);
  g.lineStyle(4, darken(NEST_PALETTE.metalDark, 0.2), 0.9);
  g.strokeRect(cx - 55, base - 130, 110, 120);
  g.fillStyle(NEST_PALETTE.metalDark, 1);
  g.fillRect(cx - 55, base - 130, 110, 18);
  g.fillStyle(NEST_PALETTE.metalShine, 0.4);
  g.fillRect(cx - 48, base - 100, 12, 80);
  g.fillStyle(def.roofColor, 0.6);
  g.fillRect(cx - 60, base - 138, 120, 10);
  g.lineStyle(2, darken(def.roofColor, 0.3), 0.8);
  g.strokeRect(cx - 60, base - 138, 120, 10);
}

function drawBuildingNursery(g: Phaser.GameObjects.Graphics, def: (typeof ROOM_DEFINITIONS)['nursery']): void {
  const s = 512;
  const cx = s / 2;
  const base = s * 0.72;
  g.fillStyle(NEST_PALETTE.shadow, 0.5);
  g.fillEllipse(cx, base + 20, 200, 42);
  g.fillStyle(NEST_PALETTE.eggCarton, 1);
  g.fillRect(cx - 95, base - 90, 190, 80);
  g.lineStyle(3, darken(NEST_PALETTE.eggCartonDark, 0.2), 0.85);
  g.strokeRect(cx - 95, base - 90, 190, 80);
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      g.fillStyle(row % 2 === col % 2 ? NEST_PALETTE.eggCartonDark : NEST_PALETTE.eggCarton, 1);
      g.fillRoundedRect(cx - 85 + col * 58, base - 82 + row * 36, 50, 30, 6);
      g.fillStyle(NEST_PALETTE.eggShell, 0.9);
      g.fillEllipse(cx - 60 + col * 58, base - 68 + row * 36, 14, 10);
    }
  }
  g.fillStyle(def.roofColor, 0.5);
  g.fillTriangle(cx - 100, base - 90, cx + 100, base - 90, cx, base - 130);
  g.lineStyle(3, darken(def.roofColor, 0.25), 0.8);
  g.beginPath();
  g.moveTo(cx - 100, base - 90);
  g.lineTo(cx + 100, base - 90);
  g.lineTo(cx, base - 130);
  g.closePath();
  g.strokePath();
}

function drawBuildingHospital(g: Phaser.GameObjects.Graphics, def: (typeof ROOM_DEFINITIONS)['hospital']): void {
  const s = 512;
  const cx = s / 2;
  const base = s * 0.72;
  g.fillStyle(NEST_PALETTE.shadow, 0.5);
  g.fillEllipse(cx, base + 20, 180, 38);
  g.fillStyle(NEST_PALETTE.bandage, 1);
  g.fillTriangle(cx - 90, base - 40, cx + 90, base - 40, cx, base - 160);
  g.lineStyle(4, darken(NEST_PALETTE.bandageCross, 0.5), 0.75);
  g.beginPath();
  g.moveTo(cx - 90, base - 40);
  g.lineTo(cx + 90, base - 40);
  g.lineTo(cx, base - 160);
  g.closePath();
  g.strokePath();
  g.fillStyle(def.color, 0.85);
  g.fillRect(cx - 70, base - 50, 140, 50);
  g.lineStyle(3, darken(def.color, 0.25), 0.8);
  g.strokeRect(cx - 70, base - 50, 140, 50);
  g.lineStyle(10, NEST_PALETTE.bandageCross, 0.7);
  g.lineBetween(cx - 30, base - 35, cx + 30, base - 15);
  g.lineBetween(cx + 30, base - 35, cx - 30, base - 15);
}

function drawBuildingPlanter(g: Phaser.GameObjects.Graphics, def: (typeof ROOM_DEFINITIONS)['planter']): void {
  const s = 512;
  const cx = s / 2;
  const base = s * 0.72;
  g.fillStyle(NEST_PALETTE.shadow, 0.5);
  g.fillEllipse(cx, base + 20, 160, 34);
  g.fillStyle(0x795548, 1);
  g.fillRect(cx - 50, base - 80, 100, 70);
  g.lineStyle(3, darken(0x5d4037, 0.1), 0.9);
  g.strokeRect(cx - 50, base - 80, 100, 70);
  g.fillStyle(0x5d4037, 1);
  g.fillRect(cx - 55, base - 88, 110, 14);
  g.fillStyle(def.color, 1);
  for (let i = 0; i < 5; i++) {
    const angle = -0.8 + i * 0.4;
    g.fillTriangle(
      cx,
      base - 90,
      cx + Math.cos(angle - 0.3) * 40,
      base - 90 + Math.sin(angle - 0.3) * 30,
      cx + Math.cos(angle + 0.3) * 40,
      base - 90 + Math.sin(angle + 0.3) * 30,
    );
  }
  g.lineStyle(2, darken(def.color, 0.35), 0.75);
  g.strokeEllipse(cx, base - 95, 48, 36);
  g.fillStyle(0xff7043, 0.8);
  g.fillCircle(cx, base - 95, 8);
}

function drawBuildingShelter(g: Phaser.GameObjects.Graphics, def: (typeof ROOM_DEFINITIONS)['shelter']): void {
  const s = 512;
  const cx = s / 2;
  const base = s * 0.72;
  g.fillStyle(NEST_PALETTE.shadow, 0.5);
  g.fillEllipse(cx, base + 20, 180, 38);
  g.fillStyle(0x6d4c41, 1);
  g.fillRect(cx - 80, base - 70, 160, 60);
  g.lineStyle(4, 0x4e342e, 0.85);
  g.strokeRect(cx - 80, base - 70, 160, 60);
  g.fillStyle(0x5d4037, 1);
  g.fillTriangle(cx - 88, base - 70, cx + 88, base - 70, cx, base - 130);
  g.lineStyle(3, 0x3e2723, 0.8);
  g.beginPath();
  g.moveTo(cx - 88, base - 70);
  g.lineTo(cx + 88, base - 70);
  g.lineTo(cx, base - 130);
  g.closePath();
  g.strokePath();
  g.fillStyle(def.color, 0.5);
  g.fillRect(cx - 60, base - 55, 120, 8);
  g.lineStyle(2, 0x4e342e, 0.5);
  g.lineBetween(cx - 70, base - 40, cx - 70, base - 10);
  g.lineBetween(cx + 70, base - 40, cx + 70, base - 10);
}

function drawBuildingLocker(g: Phaser.GameObjects.Graphics, def: (typeof ROOM_DEFINITIONS)['locker']): void {
  const s = 512;
  const cx = s / 2;
  const base = s * 0.72;
  g.fillStyle(NEST_PALETTE.shadow, 0.5);
  g.fillEllipse(cx, base + 20, 160, 34);
  g.fillStyle(NEST_PALETTE.metal, 1);
  g.fillRect(cx - 55, base - 140, 110, 130);
  g.lineStyle(4, darken(NEST_PALETTE.metalDark, 0.15), 0.9);
  g.strokeRect(cx - 55, base - 140, 110, 130);
  g.fillStyle(NEST_PALETTE.metalDark, 1);
  g.fillRect(cx - 55, base - 140, 110, 16);
  g.lineStyle(2, NEST_PALETTE.metalShine, 0.5);
  g.lineBetween(cx - 48, base - 120, cx - 48, base - 20);
  g.fillStyle(def.roofColor, 0.7);
  g.fillRect(cx - 58, base - 148, 116, 10);
  g.fillStyle(0xffd54f, 0.9);
  g.fillCircle(cx + 38, base - 70, 6);
}

function drawBuildingNiche(g: Phaser.GameObjects.Graphics, def: (typeof ROOM_DEFINITIONS)['niche']): void {
  const s = 512;
  const cx = s / 2;
  const base = s * 0.72;
  g.fillStyle(NEST_PALETTE.shadow, 0.5);
  g.fillEllipse(cx, base + 20, 150, 32);
  g.fillStyle(darken(NEST_PALETTE.wallWarm, 0.05), 1);
  g.fillRect(cx - 70, base - 110, 140, 100);
  g.lineStyle(4, darken(NEST_PALETTE.wallWarm, 0.35), 0.85);
  g.strokeRect(cx - 70, base - 110, 140, 100);
  g.fillStyle(def.color, 0.85);
  g.fillRoundedRect(cx - 55, base - 95, 110, 75, 8);
  g.lineStyle(3, darken(def.color, 0.25), 0.8);
  g.strokeRoundedRect(cx - 55, base - 95, 110, 75, 8);
  g.lineStyle(3, NEST_PALETTE.linoleumGrout, 0.6);
  g.strokeRoundedRect(cx - 70, base - 110, 140, 100, 10);
  g.fillStyle(NEST_PALETTE.dirt, 0.4);
  g.fillEllipse(cx, base - 50, 40, 16);
}

const BUILDING_DRAWERS: Record<RoomType, (g: Phaser.GameObjects.Graphics, def: (typeof ROOM_DEFINITIONS)[RoomType]) => void> = {
  kitchen: drawBuildingKitchen,
  bedroom: drawBuildingBedroom,
  storage: drawBuildingStorage,
  nursery: drawBuildingNursery,
  hospital: drawBuildingHospital,
  planter: drawBuildingPlanter,
  shelter: drawBuildingShelter,
  locker: drawBuildingLocker,
  niche: drawBuildingNiche,
};

function generateUiAssets(scene: Phaser.Scene): void {
  let g = gfx(scene);
  if (!scene.textures.exists('ui-panel')) {
    drawUiPanel(g);
    g.generateTexture('ui-panel', 512, 512);
  }
  finish(g);

  g = gfx(scene);
  if (!scene.textures.exists('ui-button')) {
    drawUiButton(g, false);
    g.generateTexture('ui-button', 512, 512);
  }
  finish(g);

  g = gfx(scene);
  if (!scene.textures.exists('ui-button-hover')) {
    drawUiButton(g, true);
    g.generateTexture('ui-button-hover', 512, 512);
  }
  finish(g);

  g = gfx(scene);
  if (!scene.textures.exists('ui-hud-panel')) {
    drawUiHudPanel(g);
    g.generateTexture('ui-hud-panel', 512, 512);
  }
  finish(g);
}

function generateBackgroundAssets(scene: Phaser.Scene): void {
  const bgs: [string, (g: Phaser.GameObjects.Graphics) => void, number, number][] = [
    ['menu-bg', drawMenuBg, 640, 360],
    ['nest-bg', drawNestBg, 640, 360],
    ['floor-tile', drawFloorTile, 64, 32],
    ['world-map-bg', drawWorldMapBg, 640, 360],
    ['raid-infiltrate-bg', drawRaidBg, 640, 360],
    ['arcade-slipper-bg', drawArcadeSlipperBg, 640, 360],
    ['arcade-spray-bg', drawArcadeSprayBg, 640, 360],
    ['arcade-food-bg', drawArcadeFoodBg, 640, 360],
    ['arcade-hospital-bg', drawArcadeHospitalBg, 640, 360],
    ['arcade-catch-bg', drawArcadeCatchBg, 640, 360],
  ];
  for (const [key, drawer, w, h] of bgs) {
    if (scene.textures.exists(key)) continue;
    const g = gfx(scene);
    drawer(g);
    g.generateTexture(key, w, h);
    finish(g);
  }
}

function generateSpriteAssets(scene: Phaser.Scene): void {
  const sprites: [string, (g: Phaser.GameObjects.Graphics) => void, number, number][] = [
    ['slipper', drawSlipper, 64, 64],
    ['food-crumb', drawFoodCrumb, 32, 32],
    ['spray-cloud', drawSprayCloud, 64, 64],
    ['crack', drawCrack, 64, 64],
    ['glue-trap', drawGlueTrap, 64, 64],
    ['heart-pulse', drawHeartPulse, 48, 48],
    ['spark', drawSpark, 32, 32],
    ['nest-marker', drawNestMarker, 48, 48],
    ['cat', drawCat, 64, 64],
  ];
  for (const [key, drawer, w, h] of sprites) {
    if (scene.textures.exists(key)) continue;
    const g = gfx(scene);
    drawer(g);
    g.generateTexture(key, w, h);
    finish(g);
  }
}

function generateBuildingAssets(scene: Phaser.Scene): void {
  for (const type of ALL_BUILDING_TYPES) {
    const key = `building-${type}`;
    if (scene.textures.exists(key)) continue;
    const g = gfx(scene);
    BUILDING_DRAWERS[type](g, ROOM_DEFINITIONS[type]);
    g.generateTexture(key, 512, 512);
    finish(g);
  }
}

/** Generate every procedural texture used by the game. */
export function generateAllProceduralAssets(scene: Phaser.Scene, onProgress?: ProgressFn): void {
  const steps = [
    () => generateUiAssets(scene),
    () => generateBackgroundAssets(scene),
    () => generateSpriteAssets(scene),
    () => generateBuildingAssets(scene),
  ];
  steps.forEach((step, i) => {
    step();
    onProgress?.((i + 1) / steps.length);
  });
}
