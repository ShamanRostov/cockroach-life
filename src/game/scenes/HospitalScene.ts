import Phaser from 'phaser';
import { SCENES, COLORS, GAME_WIDTH, GAME_HEIGHT, isMobileDevice } from '../config';
import { GameState } from '../GameState';
import { createTextButton, addFullscreenBg, createMobileButton } from '../ui/ButtonHelper';
import { spawnSparkBurst } from '../graphics/ParticleEffects';
import { screenShake, showScorePopup } from '../graphics/VisualEffects';
import { L, fmt } from '../../i18n';
import { monetizationService } from '../../platforms/MonetizationService';
import { AnalyticsService } from '../../platforms/AnalyticsService';
import { SoundManager } from '../audio/SoundManager';
import { ARCADE_HOSPITAL } from '../systems/GameBalance';

export class HospitalScene extends Phaser.Scene {
  private pulse!: Phaser.GameObjects.Image;
  private ringOuter!: Phaser.GameObjects.Image;
  private ringInner!: Phaser.GameObjects.Image;
  private sweetMinRing!: Phaser.GameObjects.Image;
  private sweetMaxRing!: Phaser.GameObjects.Image;
  private timingHint!: Phaser.GameObjects.Text;
  private hits = 0;
  private required = ARCADE_HOSPITAL.requiredHits;
  private alive = true;
  private runCompleted = false;
  private progressText!: Phaser.GameObjects.Text;
  private pulseScale = 1;
  private growing = true;
  private state = GameState.getInstance();

  constructor() {
    super(SCENES.HOSPITAL);
  }

  create(): void {
    const t = L();
    addFullscreenBg(this, 'arcade-hospital-bg');

    this.add
      .image(GAME_WIDTH / 2, 50, 'ui-panel')
      .setDisplaySize(420, 52)
      .setAlpha(0.88);

    this.add
      .text(GAME_WIDTH / 2, 50, t.arcade.hospital.title, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '26px',
        color: '#fff8e1',
      })
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        100,
        isMobileDevice() ? L().mobile.tapToPulse : t.arcade.hospital.controls,
        {
          fontFamily: 'Segoe UI, Arial, sans-serif',
          fontSize: '18px',
          color: '#90caf9',
        },
      )
      .setOrigin(0.5);

    this.progressText = this.add
      .text(GAME_WIDTH / 2, 140, fmt(t.arcade.hospital.progress, { current: 0, total: this.required }), {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '22px',
        color: '#66bb6a',
      })
      .setOrigin(0.5);

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.ringOuter = this.add
      .image(cx, cy, 'heart-pulse')
      .setScale(1.6)
      .setAlpha(0.25)
      .setTint(COLORS.success);

    this.ringInner = this.add
      .image(cx, cy, 'heart-pulse')
      .setScale(1.1)
      .setAlpha(0.35)
      .setTint(COLORS.success);

    this.sweetMinRing = this.add
      .image(cx, cy, 'heart-pulse')
      .setScale(0.55 * ARCADE_HOSPITAL.pulseMin)
      .setAlpha(0.55)
      .setTint(COLORS.success);

    this.sweetMaxRing = this.add
      .image(cx, cy, 'heart-pulse')
      .setScale(0.55 * ARCADE_HOSPITAL.pulseMax)
      .setAlpha(0.55)
      .setTint(COLORS.success);

    this.timingHint = this.add
      .text(cx, cy + 120, '', {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '20px',
        color: '#a5d6a7',
        stroke: '#1b5e20',
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    this.pulse = this.add.image(cx, cy, 'heart-pulse').setScale(0.55).setAlpha(0.9);

    this.input.keyboard?.on('keydown-SPACE', () => this.onPulseHit());

    if (isMobileDevice()) {
      createMobileButton(
        this,
        GAME_WIDTH / 2,
        GAME_HEIGHT - 100,
        L().mobile.tapToPulse,
        () => this.onPulseHit(),
        280,
        56,
      ).setDepth(100);
    }

    createTextButton(this, GAME_WIDTH - 100, 40, t.common.esc, () => this.exitScene(), 80, 36);
    this.input.keyboard?.on('keydown-ESC', () => this.exitScene());

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 40,
        fmt(t.common.health, { current: Math.floor(this.state.economy.health) }),
        {
          fontFamily: 'Segoe UI, Arial, sans-serif',
          fontSize: '20px',
          color: '#ef5350',
        },
      )
      .setOrigin(0.5);
  }

  update(_time: number, delta: number): void {
    if (!this.alive) return;

    const speed = delta * 0.002;
    if (this.growing) {
      this.pulseScale += speed;
      if (this.pulseScale >= 1.8) this.growing = false;
    } else {
      this.pulseScale -= speed;
      if (this.pulseScale <= 0.6) this.growing = true;
    }

    this.pulse.setScale(0.55 * this.pulseScale);
    this.ringInner.setScale(1.1 * (0.9 + this.pulseScale * 0.15));
    this.ringOuter.setScale(1.6 * (0.85 + this.pulseScale * 0.12));

    const inZone =
      this.pulseScale >= ARCADE_HOSPITAL.pulseMin && this.pulseScale <= ARCADE_HOSPITAL.pulseMax;
    const zoneAlpha = inZone ? 0.85 : 0.35;
    this.sweetMinRing.setAlpha(zoneAlpha);
    this.sweetMaxRing.setAlpha(zoneAlpha);
    this.timingHint.setText(inZone ? L().arcade.hospital.now : '');
    this.timingHint.setAlpha(inZone ? 1 : 0.4);
  }

  private onPulseHit(): void {
    if (!this.alive) return;

    const inZone =
      this.pulseScale >= ARCADE_HOSPITAL.pulseMin && this.pulseScale <= ARCADE_HOSPITAL.pulseMax;
    const t = L();

    if (inZone) {
      this.hits += 1;
      this.state.economy.heal(ARCADE_HOSPITAL.healPerHit);
      SoundManager.getInstance().playSFX('ui_click');
      this.progressText.setText(
        fmt(t.arcade.hospital.progress, { current: this.hits, total: this.required }),
      );
      this.pulse.setTint(COLORS.success);
      this.cameras.main.flash(100, 67, 160, 71);
      spawnSparkBurst(this, this.pulse.x, this.pulse.y, 10, COLORS.success);
      showScorePopup(this, this.pulse.x, this.pulse.y - 40, `+${ARCADE_HOSPITAL.healPerHit}`, '#66bb6a');

      this.time.delayedCall(200, () => {
        this.pulse.clearTint();
      });

      if (this.hits >= this.required) {
        this.complete();
      }
    } else {
      SoundManager.getInstance().playSFX('arcade_hit');
      screenShake(this, 120, 0.012);
      spawnSparkBurst(this, this.pulse.x, this.pulse.y, 6, COLORS.danger);
      this.pulse.setTint(COLORS.danger);
      this.time.delayedCall(200, () => {
        this.pulse.clearTint();
      });
    }
  }

  private complete(): void {
    this.alive = false;
    this.runCompleted = true;
    const score = this.hits * ARCADE_HOSPITAL.scorePerHit;
    this.state.economy.heal(ARCADE_HOSPITAL.completionHeal);
    this.state.updateHighScore(SCENES.HOSPITAL, score);
    AnalyticsService.getInstance().trackArcadeComplete(SCENES.HOSPITAL, score, true);
    SoundManager.getInstance().playSFX('arcade_win');
    this.state.trackDailyProgress('arcade', 1);
    this.state.persist();

    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT - 100, 'ui-panel').setDisplaySize(420, 72).setAlpha(0.92);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 100, L().arcade.hospital.healed, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '28px',
        color: '#fff8e1',
      })
      .setOrigin(0.5);

    this.time.delayedCall(2000, () => this.exitScene());
  }

  private exitScene(): void {
    void this.finishArcade();
  }

  private async finishArcade(): Promise<void> {
    if (this.runCompleted) {
      await monetizationService.onArcadeComplete(SCENES.HOSPITAL);
    }
    this.state.persist();
    this.scene.start(SCENES.NEST);
  }
}
