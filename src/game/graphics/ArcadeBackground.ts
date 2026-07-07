import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { DEPTH } from './SceneDepth';
import { i18n } from '../../i18n';

/**
 * Full-screen arcade background. Locale-specific PNGs use suffix `-ru` / `-en` when loaded;
 * otherwise falls back to the shared texture (baked English labels stripped at asset build).
 * All UI strings come from i18n — never from PNG art.
 */
export function addLocaleSafeArcadeBg(
  scene: Phaser.Scene,
  textureKey: string,
  depth = DEPTH.background,
): Phaser.GameObjects.Image {
  const localizedKey = `${textureKey}-${i18n.getLocale()}`;
  const key = scene.textures.exists(localizedKey) ? localizedKey : textureKey;

  return scene.add
    .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, key)
    .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
    .setDepth(depth);
}
