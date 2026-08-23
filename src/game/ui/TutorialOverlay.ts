import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { createTextButton } from './ButtonHelper';

export interface TutorialTarget {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class TutorialOverlay {
  private container: Phaser.GameObjects.Container | null = null;

  show(
    scene: Phaser.Scene,
    message: string,
    stepIndex: number,
    totalSteps: number,
    options: {
      target?: TutorialTarget;
      nextLabel: string;
      skipLabel: string;
      onNext: () => void;
      onSkip: () => void;
      /** When true, only Skip is shown — player completes the step by playing. */
      hideNext?: boolean;
    },
  ): void {
    this.destroy();
    const depth = 8000;

    this.container = scene.add.container(0, 0).setDepth(depth);

    const dim = scene.add.graphics();
    dim.fillStyle(0x000000, 0.55);
    if (options.target) {
      const t = options.target;
      const pad = 10;
      const left = t.x - t.width / 2 - pad;
      const right = t.x + t.width / 2 + pad;
      const top = t.y - t.height / 2 - pad;
      const bottom = t.y + t.height / 2 + pad;
      dim.fillRect(0, 0, GAME_WIDTH, top);
      dim.fillRect(0, bottom, GAME_WIDTH, GAME_HEIGHT - bottom);
      dim.fillRect(0, top, left, bottom - top);
      dim.fillRect(right, top, GAME_WIDTH - right, bottom - top);

      const ring = scene.add.graphics();
      ring.lineStyle(3, 0xffa726, 0.95);
      ring.strokeRoundedRect(left, top, right - left, bottom - top, 8);
      this.container.add(ring);

      scene.tweens.add({
        targets: ring,
        alpha: { from: 0.55, to: 1 },
        duration: 700,
        yoyo: true,
        repeat: -1,
      });
    } else {
      dim.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }
    this.container.add(dim);

    const panelY = options.target
      ? Math.min(GAME_HEIGHT - 130, Math.max(110, options.target.y + options.target.height / 2 + 96))
      : GAME_HEIGHT / 2;

    const panel = scene.add
      .image(GAME_WIDTH / 2, panelY, 'ui-panel')
      .setDisplaySize(580, 158)
      .setAlpha(0.96);
    this.container.add(panel);

    const progress = scene.add
      .text(GAME_WIDTH / 2, panelY - 58, `${stepIndex + 1} / ${totalSteps}`, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '14px',
        color: '#ffca28',
      })
      .setOrigin(0.5);
    this.container.add(progress);

    const text = scene.add
      .text(GAME_WIDTH / 2, panelY - 18, message, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '17px',
        color: '#fff8e1',
        align: 'center',
        wordWrap: { width: 520 },
      })
      .setOrigin(0.5);
    this.container.add(text);

    const dotsY = panelY + 38;
    const dotSpacing = 16;
    const dotsStart = GAME_WIDTH / 2 - ((totalSteps - 1) * dotSpacing) / 2;
    for (let i = 0; i < totalSteps; i++) {
      const dot = scene.add
        .circle(dotsStart + i * dotSpacing, dotsY, 4, i === stepIndex ? 0xffa726 : 0x5d4037)
        .setStrokeStyle(1, 0xfff8e1, 0.45);
      this.container.add(dot);
    }

    if (!options.hideNext) {
      const nextBtn = createTextButton(
        scene,
        GAME_WIDTH / 2 - 70,
        panelY + 62,
        options.nextLabel,
        options.onNext,
        130,
        40,
        'ui_click',
        depth + 1,
      );
      this.container.add(nextBtn);
    }

    const skipBtn = createTextButton(
      scene,
      options.hideNext ? GAME_WIDTH / 2 : GAME_WIDTH / 2 + 90,
      panelY + 62,
      options.skipLabel,
      options.onSkip,
      120,
      40,
      'none',
      depth + 1,
    );
    this.container.add(skipBtn);
  }

  destroy(): void {
    this.container?.destroy(true);
    this.container = null;
  }
}
