import Phaser from 'phaser';
import { SCENES, COLORS, GAME_WIDTH, GAME_HEIGHT, isMobileDevice } from '../config';
import { GameState } from '../GameState';
import { createTextButton, addFullscreenBg, showToast } from '../ui/ButtonHelper';
import { createCockroachPhysics, syncCockroachMovement } from '../graphics/CockroachSprite';
import { spawnSparkBurst } from '../graphics/ParticleEffects';
import { screenShake } from '../graphics/VisualEffects';
import { TouchControls } from '../ui/TouchControls';
import { L } from '../../i18n';
import { monetizationService } from '../../platforms/MonetizationService';
import { AnalyticsService } from '../../platforms/AnalyticsService';
import { SoundManager } from '../audio/SoundManager';
import { ARCADE_SPRAY } from '../systems/GameBalance';

interface Hideout {
  sprite: Phaser.GameObjects.Sprite;
  x: number;
  y: number;
  radius: number;
}

const HIDEOUT_START_RADIUS = 58;
const HIDEOUT_MIN_RADIUS = 22;

export class SprayEscapeScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cloud!: Phaser.GameObjects.Sprite;
  private hideouts: Hideout[] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private timer = 30;
  private alive = true;
  private runCompleted = false;
  private inHideout = false;
  private timerText!: Phaser.GameObjects.Text;
  private state = GameState.getInstance();
  private cloudScale = 0.35;
  private touchControls: TouchControls | null = null;
  private wasInHideout = true;
  private dangerPulse = 0;

  constructor() {
    super(SCENES.SPRAY);
  }

  create(): void {
    const t = L();
    addFullscreenBg(this, 'arcade-spray-bg');
    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.add
      .image(GAME_WIDTH / 2, 40, 'ui-panel')
      .setDisplaySize(380, 52)
      .setAlpha(0.88);

    this.add
      .text(GAME_WIDTH / 2, 40, t.arcade.spray.title, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '26px',
        color: '#fff8e1',
      })
      .setOrigin(0.5);

    this.timerText = this.add.text(GAME_WIDTH / 2, 88, '30', {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '36px',
      color: '#81c784',
      stroke: '#1b5e20',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.cloud = this.add.sprite(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'spray-cloud').setAlpha(0.75);
    this.cloud.setScale(this.cloudScale);

    const positions = [
      { x: 120, y: 200 },
      { x: GAME_WIDTH - 120, y: 250 },
      { x: 200, y: GAME_HEIGHT - 150 },
      { x: GAME_WIDTH - 200, y: GAME_HEIGHT - 180 },
      { x: GAME_WIDTH / 2, y: GAME_HEIGHT - 100 },
    ];

    for (const pos of positions) {
      const crack = this.add.sprite(pos.x, pos.y, 'crack').setScale(0.45);
      this.hideouts.push({ sprite: crack, x: pos.x, y: pos.y, radius: HIDEOUT_START_RADIUS });
    }

    this.player = createCockroachPhysics(
      this,
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      1.5,
      GameState.getInstance().skins.getTint(),
    );
    this.player.setCollideWorldBounds(true);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey('W'),
      A: this.input.keyboard!.addKey('A'),
      S: this.input.keyboard!.addKey('S'),
      D: this.input.keyboard!.addKey('D'),
    };

    createTextButton(this, GAME_WIDTH - 100, 40, t.common.esc, () => this.exitArcade(), 80, 36);
    this.input.keyboard?.on('keydown-ESC', () => this.exitArcade());

    this.touchControls = new TouchControls({ scene: this, layout: 'joystick' });

    const controlsHint = isMobileDevice() ? L().mobile.useJoystick : t.arcade.spray.controls;
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 30, controlsHint, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '14px',
        color: '#bcaaa4',
      })
      .setOrigin(0.5);
  }

  update(_time: number, delta: number): void {
    if (!this.alive) return;

    const speed = 200;
    let vx = 0;
    let vy = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) vx = -speed;
    if (this.cursors.right.isDown || this.wasd.D.isDown) vx = speed;
    if (this.cursors.up.isDown || this.wasd.W.isDown) vy = -speed;
    if (this.cursors.down.isDown || this.wasd.S.isDown) vy = speed;

    const touch = this.touchControls?.mergeVelocity(vx, vy, speed);
    if (touch) {
      vx = touch.vx;
      vy = touch.vy;
    }

    this.player.setVelocity(vx, vy);
    syncCockroachMovement(this.player, vx, vy);

    this.cloudScale += delta * 0.0003;
    this.cloud.setScale(this.cloudScale);

    for (const h of this.hideouts) {
      h.radius = Math.max(HIDEOUT_MIN_RADIUS, h.radius - delta * 0.014);
      const scale = 0.28 + (h.radius / HIDEOUT_START_RADIUS) * 0.22;
      h.sprite.setScale(scale);
      h.sprite.setAlpha(0.55 + (h.radius / HIDEOUT_START_RADIUS) * 0.45);
    }

    this.inHideout = this.hideouts.some(
      (h) => Phaser.Math.Distance.Between(this.player.x, this.player.y, h.x, h.y) < h.radius,
    );

    if (!this.inHideout) {
      this.state.economy.damage(delta * 0.018);
      this.player.setTint(COLORS.danger);
      this.dangerPulse += delta;
      if (this.dangerPulse > 900) {
        this.dangerPulse = 0;
        screenShake(this, 140, 0.012);
      }
    } else {
      this.player.clearTint();
      this.dangerPulse = 0;
      if (!this.wasInHideout) {
        spawnSparkBurst(this, this.player.x, this.player.y, 6, 0x81c784);
      }
    }
    this.wasInHideout = this.inHideout;

    this.timer -= delta / 1000;
    const secs = Math.ceil(Math.max(0, this.timer));
    this.timerText.setText(secs.toString());
    if (this.timer <= 10) {
      this.timerText.setColor('#ef5350');
      if (secs !== parseInt(this.timerText.getData('lastFlash') ?? '-1', 10)) {
        this.timerText.setData('lastFlash', secs);
        this.timerText.setScale(1.15);
        this.tweens.add({ targets: this.timerText, scale: 1, duration: 200 });
      }
    }

    if (this.timer <= 0) {
      this.win();
    } else if (this.state.economy.health <= 0) {
      this.lose();
    }
  }

  private win(): void {
    this.alive = false;
    this.runCompleted = true;
    const score = Math.floor(300 - this.state.economy.health);
    this.state.updateHighScore(SCENES.SPRAY, score);
    AnalyticsService.getInstance().trackArcadeComplete(SCENES.SPRAY, score, true);
    SoundManager.getInstance().playSFX('arcade_win');
    const scoreMult = this.state.liveOps.getEventMultiplier('spray_reward');
    const foodReward = Math.floor(ARCADE_SPRAY.winFood * scoreMult);
    const moneyReward = Math.floor(ARCADE_SPRAY.winMoney * scoreMult);
    this.state.addFood(foodReward);
    this.state.addMoney(moneyReward);
    if (scoreMult > 1) {
      this.state.trackEventReward('spray_week', 'arcade');
    }
    this.state.trackDailyProgress('arcade', 1);
    this.state.persist();
    showToast(this, L().arcade.spray.win);
    this.time.delayedCall(2000, () => this.exitArcade());
  }

  private lose(): void {
    this.alive = false;
    this.runCompleted = true;
    screenShake(this, 300, 0.025);
    spawnSparkBurst(this, this.player.x, this.player.y, 12, COLORS.danger);
    const score = Math.floor(300 - this.state.economy.health);
    AnalyticsService.getInstance().trackArcadeComplete(SCENES.SPRAY, score, false);
    SoundManager.getInstance().playSFX('arcade_lose');
    this.state.economy.health = ARCADE_SPRAY.poisonedHealth;
    this.state.persist();
    this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'ui-panel')
      .setDisplaySize(480, 120)
      .setAlpha(0.92);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, L().arcade.spray.poisoned, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '28px',
        color: '#fff8e1',
        align: 'center',
      })
      .setOrigin(0.5);
    this.time.delayedCall(2000, () => void this.finishArcade(SCENES.HOSPITAL));
  }

  private exitArcade(): void {
    void this.finishArcade(SCENES.NEST);
  }

  private async finishArcade(nextScene: string): Promise<void> {
    if (this.runCompleted) {
      await monetizationService.onArcadeComplete(SCENES.SPRAY);
    }
    this.state.persist();
    this.scene.start(nextScene);
  }
}
