import Phaser from 'phaser';

export const COCKROACH_TEXTURE_KEY = 'cockroach';
export const COCKROACH_ANIM_WALK = 'roach-walk';

/** Top-down cockroach ~24 px on nest grid (texture 64×40 trimmed). */
export const COCKROACH_DISPLAY_SCALE = 0.55;

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
