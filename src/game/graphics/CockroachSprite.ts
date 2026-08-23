import Phaser from 'phaser';

export type CockroachView = 'top' | 'side';

export const COCKROACH_TEXTURE_KEY = 'cockroach';
export const COCKROACH_SIDE_TEXTURE_KEY = 'cockroach-side';
export const COCKROACH_ANIM_WALK = 'roach-walk';
export const COCKROACH_SIDE_ANIM_WALK = 'roach-side-walk';

/** Top-down nest cockroach (~one cell). */
export const COCKROACH_DISPLAY_SCALE = 0.55;
/** Side-view arcade cockroach (legacy look). */
export const COCKROACH_SIDE_DISPLAY_SCALE = 0.72;

export function cockroachScale(mult = 1, view: CockroachView = 'top'): number {
  const base = view === 'side' ? COCKROACH_SIDE_DISPLAY_SCALE : COCKROACH_DISPLAY_SCALE;
  return base * mult;
}

function texturePrefix(view: CockroachView): string {
  return view === 'side' ? COCKROACH_SIDE_TEXTURE_KEY : COCKROACH_TEXTURE_KEY;
}

function animKey(view: CockroachView): string {
  return view === 'side' ? COCKROACH_SIDE_ANIM_WALK : COCKROACH_ANIM_WALK;
}

export function attachCockroachAnim(
  sprite: Phaser.GameObjects.Sprite | Phaser.Physics.Arcade.Sprite,
  scaleMult = 1,
  tint: number | null = null,
  view: CockroachView = 'top',
): typeof sprite {
  const prefix = texturePrefix(view);
  sprite.setTexture(`${prefix}-0`);
  sprite.setScale(cockroachScale(scaleMult, view));
  sprite.setOrigin(0.5, view === 'side' ? 0.58 : 0.5);
  sprite.setFlipX(false);
  sprite.setRotation(0);
  if (tint !== null) {
    sprite.setTint(tint);
  } else {
    sprite.clearTint();
  }
  const walk = animKey(view);
  if (sprite.scene.anims.exists(walk)) {
    sprite.play(walk);
  }
  sprite.setData('cockroachView', view);
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

/** Nest / top-down cockroach. */
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
  return attachCockroachAnim(sprite, scaleMult, tint, 'top');
}

/** Physics cockroach — arcades/raids use side-view by default. */
export function createCockroachPhysics(
  scene: Phaser.Scene,
  x: number,
  y: number,
  scaleMult = 1,
  tint: number | null = null,
  view: CockroachView = 'side',
): Phaser.Physics.Arcade.Sprite {
  const prefix = texturePrefix(view);
  const sprite = scene.physics.add.sprite(x, y, `${prefix}-0`);
  return attachCockroachAnim(sprite, scaleMult, tint, view) as Phaser.Physics.Arcade.Sprite;
}

/** Top-down art faces up (negative Y). Side art faces left. */
const TOP_ART_FACING = -Math.PI / 2;

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
  const view = (sprite.getData('cockroachView') as CockroachView | undefined) ?? 'top';

  if (view === 'side') {
    const horizontal = Math.abs(vy) < Math.abs(vx) * 0.35;
    if (horizontal) {
      sprite.setFlipX(vx > 0);
      sprite.setRotation(0);
      return;
    }
    sprite.setFlipX(false);
    sprite.setRotation(Math.atan2(vy, vx) - Math.PI);
    return;
  }

  sprite.setFlipX(false);
  sprite.setRotation(Math.atan2(vy, vx) - TOP_ART_FACING);
}
