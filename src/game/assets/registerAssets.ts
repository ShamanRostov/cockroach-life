import Phaser from 'phaser';
import { GAME_ASSET_MANIFEST } from './assetManifest';
import { COCKROACH_FRAMES, TRANSPARENT_SPRITE_KEYS } from './AssetKeys';
import {
  COCKROACH_ANIM_WALK,
  COCKROACH_SIDE_ANIM_WALK,
  COCKROACH_SIDE_TEXTURE_KEY,
  COCKROACH_TEXTURE_KEY,
} from '../graphics/CockroachSprite';
import { processSpriteTextures } from './textureUtils';

export function preloadGameAssets(scene: Phaser.Scene): void {
  for (const { key, path } of GAME_ASSET_MANIFEST) {
    scene.load.image(key, path);
  }
}

export function finalizeGameAssets(
  scene: Phaser.Scene,
  onProgress?: (value: number) => void,
): void {
  const topKeys = Array.from({ length: COCKROACH_FRAMES }, (_, i) => `${COCKROACH_TEXTURE_KEY}-${i}`);
  const sideKeys = Array.from(
    { length: COCKROACH_FRAMES },
    (_, i) => `${COCKROACH_SIDE_TEXTURE_KEY}-${i}`,
  );

  // Only light keying — aggressive gray stripping turned arcade sprites into colored squares.
  processSpriteTextures(scene, [...TRANSPARENT_SPRITE_KEYS, ...topKeys, ...sideKeys]);

  if (!scene.anims.exists(COCKROACH_ANIM_WALK)) {
    const frames = topKeys
      .filter((key) => scene.textures.exists(key))
      .map((key) => ({ key }));
    if (frames.length > 0) {
      scene.anims.create({
        key: COCKROACH_ANIM_WALK,
        frames,
        frameRate: 16,
        repeat: -1,
      });
    }
  }

  if (!scene.anims.exists(COCKROACH_SIDE_ANIM_WALK)) {
    const frames = sideKeys
      .filter((key) => scene.textures.exists(key))
      .map((key) => ({ key }));
    if (frames.length > 0) {
      scene.anims.create({
        key: COCKROACH_SIDE_ANIM_WALK,
        frames,
        frameRate: 12,
        repeat: -1,
      });
    }
  }

  onProgress?.(1);
}
