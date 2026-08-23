import Phaser from 'phaser';

/**
 * Backdrop detection for runtime keying.
 * Keep this STRICT — mid-gray stripping destroyed slipper/cat/crumb art and left
 * tiny tinted blobs that rendered as huge colored squares in arcades.
 */
function isBackdropPixel(r: number, g: number, b: number, a: number): boolean {
  if (a < 8) return true;
  // Near-black studio / keyed backdrop only
  if (r < 18 && g < 18 && b < 18) return true;
  // Near-white only
  if (r > 248 && g > 248 && b > 248) return true;
  return false;
}

/** Remove pure black / pure white backdrop pixels. */
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

  let stripped = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (isBackdropPixel(data[i], data[i + 1], data[i + 2], data[i + 3])) {
      data[i + 3] = 0;
      stripped += 1;
    }
  }

  // Nothing useful left — keep original texture (avoid 1×1 color squares).
  const opaqueLeft = data.reduce((n, _v, i) => (i % 4 === 3 && data[i] > 12 ? n + 1 : n), 0);
  if (opaqueLeft < 24) {
    return;
  }

  ctx.putImageData(imageData, 0, 0);
  if (stripped === 0) return;

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

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;
  // Reject tiny remnants — those become colored squares when scaled up in arcades.
  if (cropW < 8 || cropH < 8) return;

  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(width - 1, maxX + padding);
  maxY = Math.min(height - 1, maxY + padding);

  const finalW = maxX - minX + 1;
  const finalH = maxY - minY + 1;
  const trimmed = document.createElement('canvas');
  trimmed.width = finalW;
  trimmed.height = finalH;
  const tctx = trimmed.getContext('2d');
  if (!tctx) return;

  tctx.drawImage(canvas, minX, minY, finalW, finalH, 0, 0, finalW, finalH);
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
