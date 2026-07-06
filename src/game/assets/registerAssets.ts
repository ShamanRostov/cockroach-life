import Phaser from 'phaser';
import { GAME_ASSET_MANIFEST } from './assetManifest';
import { COCKROACH_FRAMES } from './AssetKeys';
import { COCKROACH_ANIM_WALK, COCKROACH_TEXTURE_KEY } from '../graphics/CockroachSprite';

export function preloadGameAssets(scene: Phaser.Scene): void {
  for (const { key, path } of GAME_ASSET_MANIFEST) {
    scene.load.image(key, path);
  }
}

export function finalizeGameAssets(
  scene: Phaser.Scene,
  onProgress?: (value: number) => void,
): void {
  if (!scene.anims.exists(COCKROACH_ANIM_WALK)) {
    const frames = Array.from({ length: COCKROACH_FRAMES }, (_, i) => ({
      key: `${COCKROACH_TEXTURE_KEY}-${i}`,
    })).filter((frame) => scene.textures.exists(frame.key));

    if (frames.length > 0) {
      scene.anims.create({
        key: COCKROACH_ANIM_WALK,
        frames,
        frameRate: 14,
        repeat: -1,
      });
    }
  }

  onProgress?.(1);
}
