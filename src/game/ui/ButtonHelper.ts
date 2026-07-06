import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, GAME_HEIGHT, isMobileDevice } from '../config';
import { minTouchTarget, mobileButtonSize } from './MobileUILayout';
import { DEPTH } from '../graphics/SceneDepth';
import { SoundManager } from '../audio/SoundManager';
import type { SoundKey } from '../audio/generateSounds';

const UI_TEXTURE_KEYS = ['ui-panel', 'ui-button', 'ui-button-hover', 'ui-hud-panel'] as const;

function wireButtonHitRect(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  bg: Phaser.GameObjects.Image,
  w: number,
  h: number,
  onClick: () => void,
  sfx: SoundKey | 'none',
): Phaser.GameObjects.Rectangle {
  const hitRect = scene.add.rectangle(0, 0, w, h, 0x000000, 0);
  hitRect.setInteractive({ useHandCursor: !isMobileDevice() });

  hitRect.on('pointerdown', (
    _p: Phaser.Input.Pointer,
    _lx: number,
    _ly: number,
    event: Phaser.Types.Input.EventData,
  ) => {
    event.stopPropagation();
    if (sfx !== 'none') {
      SoundManager.getInstance().playSFX(sfx);
    }
    scene.tweens.add({
      targets: container,
      scaleX: 0.96,
      scaleY: 0.96,
      duration: 55,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
    onClick();
  });

  if (!isMobileDevice()) {
    hitRect.on('pointerover', () => bg.setTexture('ui-button-hover'));
    hitRect.on('pointerout', () => bg.setTexture('ui-button'));
  }

  return hitRect;
}

export function createTextButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  width = 220,
  height = 48,
  sfx: SoundKey | 'none' = 'ui_click',
  depth = DEPTH.ui + 5,
): Phaser.GameObjects.Container {
  const sizes = mobileButtonSize(width, height);
  const w = sizes.width;
  const h = sizes.height;
  const fontSize = w >= 380 ? '24px' : w >= 280 ? '20px' : isMobileDevice() ? '18px' : '16px';

  const container = scene.add.container(x, y).setDepth(depth);

  const bg = scene.add.image(0, 0, 'ui-button').setDisplaySize(w, h);

  const text = scene.add.text(0, 0, label, {
    fontFamily: 'Segoe UI, Arial, sans-serif',
    fontSize,
    color: '#fff8e1',
    stroke: '#3e2723',
    strokeThickness: 3,
  });
  text.setOrigin(0.5);

  const hitRect = wireButtonHitRect(scene, container, bg, w, h, onClick, sfx);
  container.add([bg, text, hitRect]);

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
  depth = DEPTH.ui + 5,
): Phaser.GameObjects.Container {
  const hitW = Math.max(width, minTouchTarget(width));
  const hitH = Math.max(height, minTouchTarget(height));
  return createTextButton(scene, x, y, label, onClick, hitW, hitH, sfx, depth);
}

export function createPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  alpha = 0.94,
  depth = DEPTH.ui,
): Phaser.GameObjects.Image {
  return scene.add
    .image(x + w / 2, y + h / 2, 'ui-panel')
    .setDisplaySize(w, h)
    .setAlpha(alpha)
    .setDepth(depth);
}

/** Dim layer — click outside modal to close. */
export function createModalOverlay(scene: Phaser.Scene, depth: number = DEPTH.overlay): Phaser.GameObjects.Rectangle {
  return scene.add
    .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.75)
    .setDepth(depth)
    .setInteractive();
}

export function createModalPanel(
  scene: Phaser.Scene,
  cx: number,
  cy: number,
  w: number,
  h: number,
  depth = DEPTH.overlay + 1,
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
    .setAlpha(0.95)
    .setDepth(DEPTH.modal + 10);

  const toast = scene.add
    .text(scene.scale.width / 2, scene.scale.height - 60, message, {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '16px',
      color: '#fff8e1',
      stroke: '#3e2723',
      strokeThickness: 2,
    })
    .setOrigin(0.5)
    .setDepth(DEPTH.modal + 11);

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
  depth = DEPTH.background,
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
  depth: number = DEPTH.particles,
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
  depth = DEPTH.ui + 5,
): Phaser.GameObjects.Container {
  return isMobileDevice()
    ? createMobileButton(scene, x, y, label, onClick, width, height, sfx, depth)
    : createTextButton(scene, x, y, label, onClick, width, height, sfx, depth);
}

export { UI_TEXTURE_KEYS };
