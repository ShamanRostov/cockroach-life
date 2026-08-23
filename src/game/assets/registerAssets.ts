import Phaser from 'phaser';
import { GAME_ASSET_MANIFEST } from './assetManifest';
import { COCKROACH_FRAMES } from './AssetKeys';
import {
  COCKROACH_ANIM_WALK,
  COCKROACH_SIDE_ANIM_WALK,
  COCKROACH_SIDE_TEXTURE_KEY,
  COCKROACH_TEXTURE_KEY,
} from '../graphics/CockroachSprite';

export function preloadGameAssets(scene: Phaser.Scene): void {
  for (const { key, path } of GAME_ASSET_MANIFEST) {
    scene.load.image(key, path);
  }
}

/**
 * PNGs are already keyed/trimmed offline — do NOT reprocess at runtime.
 * Runtime strip/trim previously destroyed arcade sprites into tiny tinted
 * blobs that rendered as huge colored squares (grey/blue/green/red).
 */
export function finalizeGameAssets(
  scene: Phaser.Scene,
  onProgress?: (value: number) => void,
): void {
  const topKeys = Array.from({ length: COCKROACH_FRAMES }, (_, i) => `${COCKROACH_TEXTURE_KEY}-${i}`);
  const sideKeys = Array.from(
    { length: COCKROACH_FRAMES },
    (_, i) => `${COCKROACH_SIDE_TEXTURE_KEY}-${i}`,
  );

  if (!scene.anims.exists(COCKROACH_ANIM_WALK)) {
    const frames = topKeys.filter((key) => scene.textures.exists(key)).map((key) => ({ key }));
    if (frames.length > 0) {
      scene.anims.create({
        key: COCKROACH_ANIM_WALK,
        frames,
        frameRate: 14,
        repeat: -1,
      });
    }
  }

  if (!scene.anims.exists(COCKROACH_SIDE_ANIM_WALK)) {
    const frames = sideKeys.filter((key) => scene.textures.exists(key)).map((key) => ({ key }));
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
