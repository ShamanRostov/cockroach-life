import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, GAME_HEIGHT, isMobileDevice } from '../config';
import { minTouchTarget, mobileButtonSize } from './MobileUILayout';
import { SoundManager } from '../audio/SoundManager';
import type { SoundKey } from '../audio/generateSounds';

const UI_TEXTURE_KEYS = ['ui-panel', 'ui-button', 'ui-button-hover', 'ui-hud-panel'] as const;

export function createTextButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  width = 220,
  height = 48,
  sfx: SoundKey | 'none' = 'ui_click',
): Phaser.GameObjects.Container {
  const sizes = mobileButtonSize(width, height);
  const w = sizes.width;
  const h = sizes.height;
  const fontSize = w >= 380 ? '26px' : w >= 280 ? '22px' : isMobileDevice() ? '20px' : '18px';

  const container = scene.add.container(x, y);

  const bg = scene.add
    .image(0, 0, 'ui-button')
    .setDisplaySize(w, h);

  const text = scene.add.text(0, 0, label, {
    fontFamily: 'Segoe UI, Arial, sans-serif',
    fontSize,
    color: '#fff8e1',
    stroke: '#5d2e00',
    strokeThickness: 2,
  });
  text.setOrigin(0.5);

  container.add([bg, text]);
  wireButton(container, bg, w, h, onClick, sfx);

  return container;
}

export function createMobileButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  width = 220,
  height = 48,
  sfx: SoundKey | 'none' = 'ui_click',
): Phaser.GameObjects.Container {
  const sizes = mobileButtonSize(width, height);
  const hitW = Math.max(sizes.width, minTouchTarget(width));
  const hitH = Math.max(sizes.height, minTouchTarget(height));
  return createTextButton(scene, x, y, label, onClick, hitW, hitH, sfx);
}

function wireButton(
  container: Phaser.GameObjects.Container,
  bg: Phaser.GameObjects.Image,
  width: number,
  height: number,
  onClick: () => void,
  sfx: SoundKey | 'none',
): void {
  const fire = () => {
    if (sfx !== 'none') {
      SoundManager.getInstance().playSFX(sfx);
    }
    onClick();
  };

  const hitArea = new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height);

  bg.setInteractive({
    hitArea,
    hitAreaCallback: Phaser.Geom.Rectangle.Contains,
    useHandCursor: !isMobileDevice(),
  });

  if (!isMobileDevice()) {
    bg.on('pointerover', () => bg.setTexture('ui-button-hover'));
    bg.on('pointerout', () => bg.setTexture('ui-button'));
  }

  bg.on('pointerup', (
    _p: Phaser.Input.Pointer,
    _lx: number,
    _ly: number,
    event: Phaser.Types.Input.EventData,
  ) => {
    event.stopPropagation();
    fire();
  });

  container.setSize(width, height);
  container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
  container.on('pointerup', (
    _p: Phaser.Input.Pointer,
    _lx: number,
    _ly: number,
    event: Phaser.Types.Input.EventData,
  ) => {
    event.stopPropagation();
    fire();
  });
}

export function createPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  _alpha = 0.92,
): Phaser.GameObjects.Image {
  return scene.add
    .image(x + w / 2, y + h / 2, 'ui-panel')
    .setDisplaySize(w, h)
    .setAlpha(_alpha);
}

/** Dim layer — not interactive so modal buttons above receive clicks. */
export function createModalOverlay(scene: Phaser.Scene, depth = 900): Phaser.GameObjects.Rectangle {
  return scene.add
    .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.72)
    .setDepth(depth);
}

export function createModalPanel(
  scene: Phaser.Scene,
  cx: number,
  cy: number,
  w: number,
  h: number,
  depth = 901,
): Phaser.GameObjects.Image {
  return scene.add
    .image(cx, cy, 'ui-panel')
    .setDisplaySize(w, h)
    .setDepth(depth);
}

export function showToast(scene: Phaser.Scene, message: string, duration = 2000): void {
  const toastBg = scene.add
    .image(scene.scale.width / 2, scene.scale.height - 60, 'ui-panel')
    .setDisplaySize(Math.min(520, message.length * 10 + 80), 52)
    .setAlpha(0.92)
    .setDepth(1000);

  const toast = scene.add
    .text(scene.scale.width / 2, scene.scale.height - 60, message, {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '16px',
      color: '#fff8e1',
    })
    .setOrigin(0.5)
    .setDepth(1001);

  scene.tweens.add({
    targets: [toast, toastBg],
    alpha: 0,
    y: '-=30',
    duration,
    delay: duration * 0.5,
    onComplete: () => {
      toast.destroy();
      toastBg.destroy();
    },
  });
}

export function addFullscreenBg(
  scene: Phaser.Scene,
  key: string,
  depth = 0,
  alpha = 1,
): Phaser.GameObjects.Image {
  return scene.add
    .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, key)
    .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
    .setDepth(depth)
    .setAlpha(alpha);
}

export function addGlowBurst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color = COLORS.accent,
  depth = 24,
): Phaser.GameObjects.Image {
  const glow = scene.add.image(x, y, 'spark').setDepth(depth).setTint(color).setAlpha(0.85);
  scene.tweens.add({
    targets: glow,
    scale: 2.4,
    alpha: 0,
    duration: 650,
    onComplete: () => glow.destroy(),
  });
  return glow;
}

export function createAdaptiveButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  width = 220,
  height = 48,
  sfx: SoundKey | 'none' = 'ui_click',
): Phaser.GameObjects.Container {
  return isMobileDevice()
    ? createMobileButton(scene, x, y, label, onClick, width, height, sfx)
    : createTextButton(scene, x, y, label, onClick, width, height, sfx);
}

export { UI_TEXTURE_KEYS };
