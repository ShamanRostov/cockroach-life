import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, GAME_HEIGHT, isMobileDevice } from '../config';
import { minTouchTarget, mobileButtonSize } from './MobileUILayout';
import { DEPTH } from '../graphics/SceneDepth';
import { SoundManager } from '../audio/SoundManager';
import type { SoundKey } from '../audio/generateSounds';

const PANEL_FILL = 0x1e140c;
const PANEL_STROKE = 0xffa726;
const BTN_FILL = 0xe65100;
const BTN_HOVER = 0xff9800;

function buttonFontSize(w: number, h: number, label: string): string {
  const explicitLines = label.split('\n').length;
  const approxCharsPerLine = Math.max(10, Math.floor((w - 28) / 11));
  const plainLen = label.replace(/\n/g, '').length;
  const wrappedGuess = Math.max(explicitLines, Math.ceil(plainLen / approxCharsPerLine));
  const lines = Math.max(explicitLines, wrappedGuess);

  // Tall multi-line labels need smaller type or they clip the button.
  if (lines >= 2) {
    if (h >= 70) return w >= 350 ? '22px' : '18px';
    if (h >= 60) return w >= 350 ? '20px' : '17px';
    return w >= 350 ? '18px' : '15px';
  }

  if (w >= 400 && h >= 60) return '28px';
  if (w >= 350 && h >= 52) return '24px';
  if (w >= 280) return '22px';
  if (w >= 200) return '20px';
  if (w >= 120) return '18px';
  return '16px';
}

function buttonStroke(w: number): number {
  return w >= 280 ? 3 : 2;
}

function wireButtonHitRect(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  bg: Phaser.GameObjects.Rectangle,
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
    if (sfx !== 'none') SoundManager.getInstance().playSFX(sfx);
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
    hitRect.on('pointerover', () => bg.setFillStyle(BTN_HOVER, 0.98));
    hitRect.on('pointerout', () => bg.setFillStyle(BTN_FILL, 0.95));
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
  const fontSize = buttonFontSize(w, h, label);
  const pad = 12;

  const container = scene.add.container(x, y).setDepth(depth);
  const bg = scene.add
    .rectangle(0, 0, w, h, BTN_FILL, 0.95)
    .setStrokeStyle(2, PANEL_STROKE, 0.85);

  const text = scene.add.text(0, 0, label, {
    fontFamily: 'Segoe UI, Arial, sans-serif',
    fontSize,
    fontStyle: 'bold',
    color: '#fff8e1',
    stroke: '#3e2723',
    strokeThickness: buttonStroke(w),
    align: 'center',
    lineSpacing: 2,
    wordWrap: { width: w - pad * 2, useAdvancedWrap: true },
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

/** Flat semi-transparent panel — no stretched PNG chrome. */
export function createPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  alpha = 0.88,
  depth = DEPTH.ui,
): Phaser.GameObjects.Rectangle {
  return scene.add
    .rectangle(x + w / 2, y + h / 2, w, h, PANEL_FILL, alpha)
    .setStrokeStyle(2, PANEL_STROKE, 0.55)
    .setDepth(depth);
}

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
): Phaser.GameObjects.Rectangle {
  return scene.add
    .rectangle(cx, cy, w, h, PANEL_FILL, 0.96)
    .setStrokeStyle(3, PANEL_STROKE, 0.7)
    .setDepth(depth);
}

const TOAST_REGISTRY_KEY = '__nestToast';

type ActiveToast = {
  bg: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
  tween?: Phaser.Tweens.Tween;
};

/** One toast at a time — replaces any previous toast to avoid overlap. */
export function showToast(scene: Phaser.Scene, message: string, duration = 2200): void {
  const prev = scene.registry.get(TOAST_REGISTRY_KEY) as ActiveToast | undefined;
  if (prev) {
    prev.tween?.stop();
    prev.bg.destroy();
    prev.text.destroy();
    scene.registry.remove(TOAST_REGISTRY_KEY);
  }

  const maxW = Math.min(640, scene.scale.width - 48);
  const cx = scene.scale.width / 2;
  const cy = scene.scale.height - 72;

  const toast = scene.add
    .text(cx, cy, message, {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '17px',
      color: '#fff8e1',
      align: 'center',
      wordWrap: { width: maxW - 36 },
    })
    .setOrigin(0.5)
    .setDepth(DEPTH.modal + 11);

  const padX = 28;
  const padY = 14;
  const toastW = Math.min(maxW, Math.max(180, toast.width + padX * 2));
  const toastH = Math.max(44, toast.height + padY * 2);

  const toastBg = scene.add
    .rectangle(cx, cy, toastW, toastH, PANEL_FILL, 0.95)
    .setStrokeStyle(2, PANEL_STROKE, 0.6)
    .setDepth(DEPTH.modal + 10);

  const entry: ActiveToast = { bg: toastBg, text: toast };
  scene.registry.set(TOAST_REGISTRY_KEY, entry);

  entry.tween = scene.tweens.add({
    targets: [toast, toastBg],
    alpha: 0,
    y: '-=28',
    duration,
    delay: Math.max(700, duration * 0.45),
    onComplete: () => {
      toast.destroy();
      toastBg.destroy();
      if (scene.registry.get(TOAST_REGISTRY_KEY) === entry) {
        scene.registry.remove(TOAST_REGISTRY_KEY);
      }
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
  parent?: Phaser.GameObjects.Container,
): Phaser.GameObjects.Image {
  const glow = scene.add.image(x, y, 'spark').setDepth(depth).setTint(color).setAlpha(0.85);
  parent?.add(glow);
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
