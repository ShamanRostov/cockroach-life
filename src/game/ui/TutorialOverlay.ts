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
    },
  ): void {
    this.destroy();
    const depth = 8000;

    this.container = scene.add.container(0, 0).setDepth(depth);

    const dim = scene.add.graphics();
    dim.fillStyle(0x000000, 0.72);
    if (options.target) {
      const t = options.target;
      const pad = 8;
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
      ring.strokeRoundedRect(left, top, right - left, bottom - top, 6);
      this.container.add(ring);
    } else {
      dim.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }
    this.container.add(dim);

    const panelY = options.target
      ? Math.min(GAME_HEIGHT - 120, options.target.y + options.target.height / 2 + 90)
      : GAME_HEIGHT / 2;

    const panel = scene.add
      .image(GAME_WIDTH / 2, panelY, 'ui-panel')
      .setDisplaySize(560, 150)
      .setAlpha(0.95);
    this.container.add(panel);

    const text = scene.add
      .text(GAME_WIDTH / 2, panelY - 28, message, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '18px',
        color: '#fff8e1',
        align: 'center',
        wordWrap: { width: 500 },
      })
      .setOrigin(0.5);
    this.container.add(text);

    const dotsY = panelY + 42;
    const dotSpacing = 18;
    const dotsStart = GAME_WIDTH / 2 - ((totalSteps - 1) * dotSpacing) / 2;
    for (let i = 0; i < totalSteps; i++) {
      const dot = scene.add
        .circle(dotsStart + i * dotSpacing, dotsY, 5, i === stepIndex ? 0xffa726 : 0x5d4037)
        .setStrokeStyle(1, 0xfff8e1, 0.5);
      this.container.add(dot);
    }

    const nextBtn = createTextButton(
      scene,
      GAME_WIDTH / 2 - 70,
      panelY + 58,
      options.nextLabel,
      options.onNext,
      130,
      40,
      'ui_click',
      depth + 1,
    );
    this.container.add(nextBtn);

    const skipBtn = createTextButton(
      scene,
      GAME_WIDTH / 2 + 90,
      panelY + 58,
      options.skipLabel,
      options.onSkip,
      110,
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
