import Phaser from 'phaser';

export const COCKROACH_TEXTURE_KEY = 'cockroach';
export const COCKROACH_ANIM_WALK = 'roach-walk';

/** Top-down cockroach fits ~one nest cell (texture 64×64). */
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
  sprite.setOrigin(0.5, 0.5);
  sprite.setFlipX(false);
  sprite.setRotation(0);
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

/** Top-down art faces up (negative Y / north). */
const ART_FACING_ANGLE = -Math.PI / 2;

/** Rotate top-down cockroach toward velocity (works on nest + arcades). */
export function syncCockroachMovement(
  sprite: Phaser.GameObjects.Sprite | Phaser.Physics.Arcade.Sprite,
  vx: number,
  vy = 0,
): void {
  const moving = Math.hypot(vx, vy) > 2;
  if (!moving) {
    sprite.anims.pause();
    return;
  }

  sprite.anims.resume();
  sprite.setFlipX(false);
  sprite.setRotation(Math.atan2(vy, vx) - ART_FACING_ANGLE);
}
