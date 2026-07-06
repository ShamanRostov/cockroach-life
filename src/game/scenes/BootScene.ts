import Phaser from 'phaser';
import { SCENES, COLORS } from '../config';
import { preloadGameAssets, finalizeGameAssets } from '../assets/registerAssets';
import { GameState } from '../GameState';
import { L } from '../../i18n';
import { AnalyticsService } from '../../platforms/AnalyticsService';
import { SoundManager } from '../audio/SoundManager';
import { platformManager } from '../../platforms/PlatformManager';
import { leaderboardService } from '../../platforms/LeaderboardService';
import { iapService } from '../../platforms/IAPService';
import { attachCockroachAnim, COCKROACH_TEXTURE_KEY } from '../graphics/CockroachSprite';
import { DEPTH } from '../graphics/SceneDepth';
import { withBootTimeout, showLaunchError } from '../../boot/launchGuard';

export class BootScene extends Phaser.Scene {
  private loadFill!: Phaser.GameObjects.Rectangle;
  private loadBarW = 400;
  private barX = 0;
  private barY = 0;
  private loadingText!: Phaser.GameObjects.Text;
  private loadRoach!: Phaser.GameObjects.Sprite;

  constructor() {
    super(SCENES.BOOT);
  }

  preload(): void {
    this.cameras.main.setBackgroundColor(COLORS.bgDark);
    this.createLoadingBar();
    preloadGameAssets(this);
  }

  create(): void {
    finalizeGameAssets(this, (value) => {
      this.loadFill.width = Math.max(8, (this.loadBarW - 8) * value);
      this.updateLoadRoach(value);
    });
    this.spawnLoadRoach();
    void this.bootGame();
  }

  private async bootGame(): Promise<void> {
    try {
      SoundManager.getInstance().init();
      await withBootTimeout(platformManager.init(), 8000, 'Platform init');
      await withBootTimeout(leaderboardService.init(), 5000, 'Leaderboards init');
      if (new URLSearchParams(location.search).get('screenshots') === '1') {
        const { applyScreenshotSaveToStorage } = await import('../../dev/setupScreenshotState');
        applyScreenshotSaveToStorage();
      }
      const state = GameState.getInstance();
      await withBootTimeout(state.init(), 5000, 'Game state init');
      await withBootTimeout(iapService.init(state.getPurchasedProducts()), 5000, 'IAP init');
      await state.syncIAPPurchases();
      AnalyticsService.getInstance().trackEvent('session_start');
      platformManager.gameReady();
      this.scene.start(SCENES.MENU);
    } catch (error) {
      console.error('[BootScene] Failed to start:', error);
      showLaunchError(
        'Ошибка загрузки игры. Попробуйте очистить localStorage или откройте в режиме инкогнито.',
      );
    }
  }

  private createLoadingBar(): void {
    const { width, height } = this.scale;
    const barW = this.loadBarW;
    const barH = 14;
    const x = (width - barW) / 2;
    const y = height / 2;
    this.barX = x;
    this.barY = y;
    const t = L();

    this.add.rectangle(width / 2, height / 2, width, height, COLORS.bgDark, 1).setDepth(DEPTH.background);

    this.add.rectangle(width / 2, y, barW, barH + 6, 0x2d1f0e, 0.9).setDepth(DEPTH.ui);
    this.loadFill = this.add
      .rectangle(x + 4, y, 8, barH, COLORS.accent, 1)
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.ui + 1);

    this.load.on('progress', (value: number) => {
      this.loadFill.width = Math.max(8, (barW - 8) * value);
      this.updateLoadRoach(value);
    });

    this.add
      .text(width / 2, y - 48, t.game.title, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '36px',
        color: '#fff8e1',
        stroke: '#e65100',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.ui);

    this.loadingText = this.add
      .text(width / 2, y + 36, t.game.loading, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '16px',
        color: '#bcaaa4',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.ui);

    this.tweens.add({
      targets: this.loadingText,
      alpha: { from: 0.45, to: 1 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private spawnLoadRoach(): void {
    const startX = this.barX + 12;
    this.loadRoach = this.add.sprite(startX, this.barY - 18, `${COCKROACH_TEXTURE_KEY}-0`);
    attachCockroachAnim(this.loadRoach, 0.55);
    this.loadRoach.setDepth(DEPTH.ui + 2);
    this.loadRoach.setFlipX(false);
  }

  private updateLoadRoach(progress: number): void {
    if (!this.loadRoach?.active) return;
    const travelW = this.loadBarW - 24;
    this.loadRoach.x = this.barX + 12 + travelW * progress;
    this.loadRoach.y = this.barY - 18 + Math.sin(progress * Math.PI * 6) * 2;
  }
}
