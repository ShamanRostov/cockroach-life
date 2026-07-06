import Phaser from 'phaser';
import { SCENES, COLORS, GAME_WIDTH, GAME_HEIGHT, isMobileDevice } from '../config';
import { GameState } from '../GameState';
import { createTextButton, addFullscreenBg } from '../ui/ButtonHelper';
import { createCockroachPhysics, syncCockroachMovement } from '../graphics/CockroachSprite';
import { screenShake, showScorePopup } from '../graphics/VisualEffects';
import { spawnSparkBurst } from '../graphics/ParticleEffects';
import { TouchControls } from '../ui/TouchControls';
import { L, fmt } from '../../i18n';
import { monetizationService } from '../../platforms/MonetizationService';
import { AnalyticsService } from '../../platforms/AnalyticsService';
import { SoundManager } from '../audio/SoundManager';
import { leaderboardService, LEADERBOARD_IDS } from '../../platforms/LeaderboardService';
import { LeaderboardPanel } from '../ui/LeaderboardPanel';
import { ARCADE_SLIPPER } from '../systems/GameBalance';
import { SS_REGISTRY } from '../../dev/screenshotRegistry';

export class SlipperDodgeScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private slipper!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { A: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private touchControls: TouchControls | null = null;
  private score = 0;
  private alive = true;
  private runCompleted = false;
  private scoreText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private combo = 0;
  private spawnTimer = 0;
  private slippers: Phaser.Physics.Arcade.Sprite[] = [];
  private state = GameState.getInstance();
  private leaderboardPanel = new LeaderboardPanel();

  constructor() {
    super(SCENES.SLIPPER);
  }

  create(): void {
    const t = L();
    addFullscreenBg(this, 'arcade-slipper-bg');
    this.physics.world.setBounds(0, 80, GAME_WIDTH, GAME_HEIGHT - 80);

    this.add
      .image(GAME_WIDTH / 2, 36, 'ui-panel')
      .setDisplaySize(420, 52)
      .setAlpha(0.85);

    this.add
      .text(GAME_WIDTH / 2, 36, t.arcade.slipper.title, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '26px',
        color: '#fff8e1',
        stroke: '#5d2e00',
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    this.scoreText = this.add.text(24, 18, fmt(t.common.score, { score: 0 }), {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '20px',
      color: '#ffca28',
    });

    this.comboText = this.add.text(24, 44, '', {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '16px',
      color: '#81d4fa',
    });

    this.player = createCockroachPhysics(
      this,
      GAME_WIDTH / 2,
      GAME_HEIGHT - 120,
      1.5,
      GameState.getInstance().skins.getTint(),
    );
    this.player.setCollideWorldBounds(true);

    this.slipper = this.physics.add.sprite(GAME_WIDTH / 2, -50, 'slipper');
    this.slipper.setScale(0.55);
    this.slipper.setData('dodged', false);
    this.slippers.push(this.slipper);

    this.physics.add.overlap(this.player, this.slipper, () => this.onHit(), undefined, this);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      A: this.input.keyboard!.addKey('A'),
      D: this.input.keyboard!.addKey('D'),
    };

    createTextButton(this, GAME_WIDTH - 100, 40, t.common.esc, () => this.exitArcade(), 80, 36);
    this.input.keyboard?.on('keydown-ESC', () => this.exitArcade());

    this.touchControls = new TouchControls({ scene: this, layout: 'horizontal-zones' });

    const controlsHint = isMobileDevice() ? L().mobile.touchLeftRight : t.arcade.slipper.controls;
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 30, controlsHint, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '14px',
        color: '#bcaaa4',
      })
      .setOrigin(0.5);

    this.launchSlipper(this.slipper);
    this.applyScreenshotMidGame();
  }

  private applyScreenshotMidGame(): void {
    const mid = this.registry.get(SS_REGISTRY.SLIPPER_MID) as { score?: number } | false;
    if (!mid) return;

    this.score = mid.score ?? 620;
    this.scoreText.setText(fmt(L().common.score, { score: Math.floor(this.score) }));
    this.player.setX(GAME_WIDTH / 2 + 120);
    this.spawnTimer = 2100;

    this.slipper.setPosition(GAME_WIDTH / 2 - 90, GAME_HEIGHT * 0.42);
    this.slipper.setVelocity(60, 180);
    this.slipper.setAngularVelocity(140);

    const extra = this.physics.add.sprite(GAME_WIDTH / 2 + 200, GAME_HEIGHT * 0.28, 'slipper');
    extra.setScale(0.5);
    extra.setData('dodged', false);
    extra.setVelocity(-40, 220);
    extra.setAngularVelocity(-160);
    this.slippers.push(extra);
    this.physics.add.overlap(this.player, extra, () => this.onHit(), undefined, this);
  }

  update(_time: number, delta: number): void {
    if (!this.alive) return;

    const speed = ARCADE_SLIPPER.playerSpeed;
    let vx = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) vx = -speed;
    if (this.cursors.right.isDown || this.wasd.D.isDown) vx = speed;

    const touch = this.touchControls?.mergeVelocity(vx, 0, speed, true);
    if (touch) vx = touch.vx;

    this.player.setVelocityX(vx);
    syncCockroachMovement(this.player, vx);

    this.score += delta / 100;
    this.scoreText.setText(fmt(L().common.score, { score: Math.floor(this.score) }));

    this.spawnTimer += delta;
    const spawnInterval = Math.max(1400, 2500 - this.score * 2);
    if (this.spawnTimer > spawnInterval) {
      this.spawnTimer = 0;
      this.spawnNewSlipper();
    }

    for (const s of this.slippers) {
      if (s.active && !s.getData('dodged') && s.y > this.player.y + 25) {
        s.setData('dodged', true);
        this.onDodge(s);
      }
      if (s.y > GAME_HEIGHT + 60) {
        s.destroy();
      }
    }
    this.slippers = this.slippers.filter((s) => s.active);
  }

  private spawnNewSlipper(): void {
    const s = this.physics.add.sprite(Phaser.Math.Between(100, GAME_WIDTH - 100), -50, 'slipper');
    const sizeRoll = Math.random();
    const scale = sizeRoll < 0.2 ? 0.7 + Math.random() * 0.15 : 0.38 + Math.random() * 0.22;
    s.setScale(scale);
    s.setData('dodged', false);
    this.slippers.push(s);
    this.physics.add.overlap(this.player, s, () => this.onHit(), undefined, this);
    this.launchSlipper(s);
  }

  private launchSlipper(s: Phaser.Physics.Arcade.Sprite): void {
    const difficulty = 1 + Math.min(this.score / 400, 1.5);
    const scale = s.scaleX;
    const sizeSpeed = scale > 0.6 ? 0.75 : scale < 0.45 ? 1.25 : 1;
    const baseY = Phaser.Math.Between(200, 380) * sizeSpeed * difficulty;
    s.setVelocity(Phaser.Math.Between(-110, 110), baseY);
    s.setAngularVelocity(Phaser.Math.Between(-260, 260));
  }

  private onDodge(s: Phaser.Physics.Arcade.Sprite): void {
    if (!this.alive) return;
    this.combo += 1;
    const bonus = 5 + this.combo * 3;
    this.score += bonus;
    this.comboText.setText(this.combo > 1 ? `x${this.combo}` : '');
    showScorePopup(this, s.x, s.y, `+${bonus}`, '#81d4fa');
    if (this.combo % 3 === 0) {
      spawnSparkBurst(this, s.x, s.y, 8, 0x81d4fa);
    }
  }

  private onHit(): void {
    if (!this.alive) return;
    this.alive = false;
    this.runCompleted = true;
    this.combo = 0;
    this.player.setTint(COLORS.danger);
    screenShake(this, 320, 0.028);
    spawnSparkBurst(this, this.player.x, this.player.y, 14, COLORS.danger);
    SoundManager.getInstance().playSFX('arcade_hit');

    const finalScore = Math.floor(this.score);
    const scoreMult = this.state.liveOps.getEventMultiplier('slipper_score');
    const rewardedScore = Math.floor(finalScore * scoreMult);
    const foodReward = Math.floor(rewardedScore / 10);
    const moneyReward = Math.floor(rewardedScore / 20);
    const isRecord = this.state.updateHighScore(SCENES.SLIPPER, rewardedScore);
    if (isRecord) {
      void leaderboardService.submitScore(LEADERBOARD_IDS.SLIPPER_HIGHSCORE, rewardedScore);
    }
    AnalyticsService.getInstance().trackArcadeComplete(SCENES.SLIPPER, rewardedScore, false);
    SoundManager.getInstance().playSFX('arcade_lose');
    this.state.economy.damage(20);
    if (foodReward > 0) this.state.addFood(foodReward);
    if (moneyReward > 0) this.state.addMoney(moneyReward);
    if (foodReward > 0 || moneyReward > 0) {
      if (scoreMult > 1) {
        this.state.trackEventReward('slipper_week', 'score');
      }
    }
    this.state.persist();

    const t = L();
    const scoreLine = fmt(t.common.score, { score: rewardedScore });
    const message = fmt(t.arcade.slipper.hit, {
      score: scoreLine,
      record: isRecord ? t.common.record : '',
    });

    this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'ui-panel')
      .setDisplaySize(520, isRecord ? 200 : 140)
      .setAlpha(0.92);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - (isRecord ? 20 : 0), message, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '26px',
        color: '#fff8e1',
        align: 'center',
      })
      .setOrigin(0.5);

    if (isRecord) {
      createTextButton(
        this,
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 + 60,
        t.leaderboard.viewLeaderboard,
        () => this.leaderboardPanel.show(this, () => this.exitArcade(), 0),
        260,
        40,
      );
      this.time.delayedCall(8000, () => this.exitArcade());
    } else {
      this.time.delayedCall(2500, () => this.exitArcade());
    }
  }

  private exitArcade(): void {
    void this.finishArcade();
  }

  private async finishArcade(): Promise<void> {
    if (this.runCompleted) {
      await monetizationService.onArcadeComplete(SCENES.SLIPPER);
    }
    this.state.persist();
    this.scene.start(SCENES.NEST);
  }
}
