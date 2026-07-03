import Phaser from 'phaser';
import { generateAllProceduralAssets } from '../graphics/ProceduralAssets';
import { generateCockroachAssets } from '../graphics/CockroachSprite';

export function preloadGameAssets(_scene: Phaser.Scene): void {
  // All textures are generated procedurally in finalizeGameAssets — no PNG loading.
}

export function finalizeGameAssets(
  scene: Phaser.Scene,
  onProgress?: (value: number) => void,
): void {
  generateAllProceduralAssets(scene, onProgress);
  generateCockroachAssets(scene);
}
