import Phaser from 'phaser';

function isBackdropPixel(r: number, g: number, b: number, a: number): boolean {
  if (a < 8) return true;
  if (r < 32 && g < 32 && b < 32) return true;
  if (r > 235 && g > 235 && b > 235) return true;

  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  const avg = (r + g + b) / 3;

  // Photoshop / AI checkerboard grays
  if (spread < 18) {
    if (avg >= 175 && avg <= 215) return true;
    if (avg >= 115 && avg <= 165) return true;
  }

  return false;
}

/** Remove black, white, and checkerboard backdrop pixels. */
export function stripAssetBackground(scene: Phaser.Scene, key: string): void {
  if (!scene.textures.exists(key)) return;

  const texture = scene.textures.get(key);
  const source = texture.getSourceImage() as HTMLCanvasElement | HTMLImageElement;
  const width = source.width;
  const height = source.height;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.drawImage(source, 0, 0);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    if (isBackdropPixel(data[i], data[i + 1], data[i + 2], data[i + 3])) {
      data[i + 3] = 0;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
}

export function stripAssetBackgrounds(scene: Phaser.Scene, keys: string[]): void {
  keys.forEach((key) => stripAssetBackground(scene, key));
}

/** Crop transparent padding so display scale matches visible art. */
export function trimTransparentTexture(scene: Phaser.Scene, key: string, padding = 2): void {
  if (!scene.textures.exists(key)) return;

  const texture = scene.textures.get(key);
  const source = texture.getSourceImage() as HTMLCanvasElement | HTMLImageElement;
  const width = source.width;
  const height = source.height;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.drawImage(source, 0, 0);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] > 12) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX <= minX || maxY <= minY) return;

  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(width - 1, maxX + padding);
  maxY = Math.min(height - 1, maxY + padding);

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;
  const trimmed = document.createElement('canvas');
  trimmed.width = cropW;
  trimmed.height = cropH;
  const tctx = trimmed.getContext('2d');
  if (!tctx) return;

  tctx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
  scene.textures.remove(key);
  scene.textures.addCanvas(key, trimmed);
}

export function processSpriteTextures(scene: Phaser.Scene, keys: string[]): void {
  keys.forEach((key) => {
    stripAssetBackground(scene, key);
    trimTransparentTexture(scene, key);
  });
}

/** @deprecated use stripAssetBackground */
export function stripBlackBackground(scene: Phaser.Scene, key: string): void {
  stripAssetBackground(scene, key);
}

export function stripBlackBackgrounds(scene: Phaser.Scene, keys: string[]): void {
  stripAssetBackgrounds(scene, keys);
}
