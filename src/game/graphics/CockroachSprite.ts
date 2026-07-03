import Phaser from 'phaser';
import { COLORS } from '../config';

export const COCKROACH_TEXTURE_KEY = 'cockroach';
export const COCKROACH_ANIM_WALK = 'roach-walk';

const FRAME_W = 64;
const FRAME_H = 40;
const FRAME_COUNT = 8;

/** Top-down cockroach ~22 px on nest grid. */
export const COCKROACH_DISPLAY_SCALE = 0.38;

function darken(color: number, amount: number): number {
  const r = Math.max(0, ((color >> 16) & 0xff) * (1 - amount));
  const g = Math.max(0, ((color >> 8) & 0xff) * (1 - amount));
  const b = Math.max(0, (color & 0xff) * (1 - amount));
  return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
}

/** Leg on LEFT or RIGHT side only — not radial (avoids spider look). */
function drawLeg(
  g: Phaser.GameObjects.Graphics,
  bx: number,
  by: number,
  side: -1 | 1,
  legIndex: 0 | 1 | 2,
  phase: number,
  color: number,
): void {
  const swing = Math.sin(phase + legIndex * 1.4) * 0.35;
  const attachX = bx + side * (10 + legIndex * 3);
  const attachY = by - 4 + legIndex * 5;
  const baseAngle = side < 0 ? Math.PI + 0.15 + legIndex * 0.08 : -0.15 - legIndex * 0.08;
  const angle = baseAngle + swing * side;
  const len = 9 - legIndex * 0.5;
  const ex = attachX + Math.cos(angle) * len * side;
  const ey = attachY + Math.sin(angle) * len * 0.55;
  g.lineStyle(1.5, color, 1);
  g.lineBetween(attachX, attachY, ex, ey);
  g.fillStyle(color, 1);
  g.fillCircle(ex, ey, 1.2);
}

function drawRoachFrame(g: Phaser.GameObjects.Graphics, cx: number, cy: number, phase: number): void {
  const body = COLORS.cockroach;
  const light = COLORS.cockroachLight;
  const legColor = darken(body, 0.05);

  // Legs behind body — only on sides
  for (let i = 0; i < 3; i++) {
    drawLeg(g, cx, cy, -1, i as 0 | 1 | 2, phase, legColor);
    drawLeg(g, cx, cy, 1, i as 0 | 1 | 2, phase + Math.PI, legColor);
  }

  g.fillStyle(0x000000, 0.15);
  g.fillEllipse(cx, cy + 7, 22, 6);

  // Elongated body (roach, not round spider)
  g.fillStyle(body, 1);
  g.fillEllipse(cx - 1, cy, 24, 11);
  g.fillStyle(light, 0.5);
  g.fillEllipse(cx - 4, cy - 1, 14, 6);

  // Head + thorax bump
  g.fillStyle(darken(body, 0.1), 1);
  g.fillEllipse(cx + 11, cy, 6, 5);

  // Antennae forward
  g.lineStyle(1, light, 0.9);
  g.lineBetween(cx + 14, cy - 1, cx + 21, cy - 6);
  g.lineBetween(cx + 14, cy + 1, cx + 21, cy + 4);

  // Front legs on top
  for (let i = 0; i < 3; i++) {
    drawLeg(g, cx, cy, -1, i as 0 | 1 | 2, phase + 0.5, legColor);
    drawLeg(g, cx, cy, 1, i as 0 | 1 | 2, phase + 0.5 + Math.PI, legColor);
  }
}

/** Procedural top-down cockroach — 6 side legs, elongated body. */
export function generateCockroachAssets(scene: Phaser.Scene): void {
  if (scene.textures.exists(`${COCKROACH_TEXTURE_KEY}-0`)) return;

  for (let f = 0; f < FRAME_COUNT; f++) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    const phase = (f / FRAME_COUNT) * Math.PI * 2;
    drawRoachFrame(g, FRAME_W / 2, FRAME_H / 2 + 1, phase);
    g.generateTexture(`${COCKROACH_TEXTURE_KEY}-${f}`, FRAME_W, FRAME_H);
    g.destroy();
  }

  if (!scene.anims.exists(COCKROACH_ANIM_WALK)) {
    scene.anims.create({
      key: COCKROACH_ANIM_WALK,
      frames: Array.from({ length: FRAME_COUNT }, (_, i) => ({
        key: `${COCKROACH_TEXTURE_KEY}-${i}`,
      })),
      frameRate: 14,
      repeat: -1,
    });
  }
}

export function cockroachScale(mult = 1): number {
  return COCKROACH_DISPLAY_SCALE * mult;
}

export function attachCockroachAnim(
  sprite: Phaser.GameObjects.Sprite | Phaser.Physics.Arcade.Sprite,
  scaleMult = 1,
  tint: number | null = null,
): typeof sprite {
  sprite.setTexture(`${COCKROACH_TEXTURE_KEY}-0`);
  sprite.setScale(cockroachScale(scaleMult));
  sprite.setOrigin(0.5, 0.58);
  if (tint !== null) {
    sprite.setTint(tint);
  } else {
    sprite.clearTint();
  }
  if (sprite.scene.anims.exists(COCKROACH_ANIM_WALK)) {
    sprite.play(COCKROACH_ANIM_WALK);
  }
  return sprite;
}

export function applyCockroachSkinTint(
  sprite: Phaser.GameObjects.Sprite | Phaser.Physics.Arcade.Sprite,
  tint: number | null,
): void {
  if (tint !== null) {
    sprite.setTint(tint);
  } else {
    sprite.clearTint();
  }
}

export function createCockroachSprite(
  scene: Phaser.Scene,
  x: number,
  y: number,
  scaleMult = 1,
  depth?: number,
  tint: number | null = null,
): Phaser.GameObjects.Sprite {
  const sprite = scene.add.sprite(x, y, `${COCKROACH_TEXTURE_KEY}-0`);
  if (depth !== undefined) sprite.setDepth(depth);
  return attachCockroachAnim(sprite, scaleMult, tint);
}

export function createCockroachPhysics(
  scene: Phaser.Scene,
  x: number,
  y: number,
  scaleMult = 1,
  tint: number | null = null,
): Phaser.Physics.Arcade.Sprite {
  const sprite = scene.physics.add.sprite(x, y, `${COCKROACH_TEXTURE_KEY}-0`);
  return attachCockroachAnim(sprite, scaleMult, tint) as Phaser.Physics.Arcade.Sprite;
}

export function syncCockroachMovement(
  sprite: Phaser.GameObjects.Sprite | Phaser.Physics.Arcade.Sprite,
  vx: number,
  vy = 0,
): void {
  const moving = Math.abs(vx) > 2 || Math.abs(vy) > 2;
  if (moving) {
    sprite.anims.resume();
    if (vx < -2) sprite.setFlipX(true);
    else if (vx > 2) sprite.setFlipX(false);
  } else {
    sprite.anims.pause();
  }
}
