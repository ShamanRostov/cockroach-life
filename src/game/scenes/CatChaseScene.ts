import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT, isMobileDevice } from '../config';
import { GameState } from '../GameState';
import { createTextButton, addFullscreenBg } from '../ui/ButtonHelper';
import { createCockroachPhysics, syncCockroachMovement } from '../graphics/CockroachSprite';
import { spawnFoodPickup } from '../graphics/ParticleEffects';
import { screenShake } from '../graphics/VisualEffects';
import { TouchControls } from '../ui/TouchControls';
import { L, fmt } from '../../i18n';
import { monetizationService } from '../../platforms/MonetizationService';
import { AnalyticsService } from '../../platforms/AnalyticsService';
import { SoundManager } from '../audio/SoundManager';

const SURVIVE_SECONDS = 45;
const CAT_SPEED = 165;
const PLAYER_SPEED = 220;
const CATCH_DISTANCE = 28;

export class CatChaseScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cat!: Phaser.Physics.Arcade.Sprite;
  private crumbs: Phaser.Physics.Arcade.Sprite[] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private touchControls: TouchControls | null = null;
  private timeLeft = SURVIVE_SECONDS;
  private score = 0;
  private alive = true;
  private runCompleted = false;
  private timerText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private state = GameState.getInstance();

  constructor() {
    super(SCENES.CAT_CHASE);
  }

  create(): void {
    const t = L();
    addFullscreenBg(this, 'arcade-catch-bg');
    this.physics.world.setBounds(60, 100, GAME_WIDTH - 120, GAME_HEIGHT - 160);

    this.add
      .image(GAME_WIDTH / 2, 40, 'ui-panel')
      .setDisplaySize(420, 52)
      .setAlpha(0.88);

    this.add
      .text(GAME_WIDTH / 2, 40, t.arcade.catChase.title, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '24px',
        color: '#fff8e1',
      })
      .setOrigin(0.5);

    this.timerText = this.add.text(16, 16, fmt(t.arcade.catChase.timeLeft, { seconds: SURVIVE_SECONDS }), {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '18px',
      color: '#ef5350',
    });

    this.scoreText = this.add.text(16, 44, fmt(t.arcade.catChase.score, { score: 0 }), {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '18px',
      color: '#66bb6a',
    });

    this.player = createCockroachPhysics(
      this,
      GAME_WIDTH / 2,
      GAME_HEIGHT - 140,
      1.5,
      GameState.getInstance().skins.getTint(),
    );
    this.player.setCollideWorldBounds(true);

    this.cat = this.physics.add.sprite(GAME_WIDTH / 2, 160, 'cat');
    this.cat.setScale(0.85);
    this.cat.setCollideWorldBounds(true);

    for (let i = 0; i < 10; i++) {
      this.spawnCrumb();
    }

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

    const controlsHint = isMobileDevice() ? L().mobile.useJoystick : t.arcade.catChase.controls;
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

    const dt = delta / 1000;
    this.timeLeft -= dt;
    this.timerText.setText(
      fmt(L().arcade.catChase.timeLeft, { seconds: Math.max(0, Math.ceil(this.timeLeft)) }),
    );

    if (this.timeLeft <= 0) {
      this.win();
      return;
    }

    let vx = 0;
    let vy = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) vx = -PLAYER_SPEED;
    if (this.cursors.right.isDown || this.wasd.D.isDown) vx = PLAYER_SPEED;
    if (this.cursors.up.isDown || this.wasd.W.isDown) vy = -PLAYER_SPEED;
    if (this.cursors.down.isDown || this.wasd.S.isDown) vy = PLAYER_SPEED;

    const touch = this.touchControls?.mergeVelocity(vx, vy, PLAYER_SPEED);
    if (touch) {
      vx = touch.vx;
      vy = touch.vy;
    }

    this.player.setVelocity(vx, vy);
    syncCockroachMovement(this.player, vx, vy);

    this.chasePlayer();

    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.cat.x, this.cat.y);
    if (dist < CATCH_DISTANCE) {
      this.lose();
    }
  }

  private chasePlayer(): void {
    const dx = this.player.x - this.cat.x;
    const dy = this.player.y - this.cat.y;
    const dist = Math.hypot(dx, dy) || 1;
    this.cat.setVelocity((dx / dist) * CAT_SPEED, (dy / dist) * CAT_SPEED);
    this.cat.setFlipX(dx < 0);
  }

  private spawnCrumb(): void {
    const x = Phaser.Math.Between(100, GAME_WIDTH - 100);
    const y = Phaser.Math.Between(140, GAME_HEIGHT - 100);
    const crumb = this.physics.add.sprite(x, y, 'food-crumb');
    crumb.setScale(0.3 + Math.random() * 0.12);
    this.physics.add.overlap(this.player, crumb, () => this.collectCrumb(crumb), undefined, this);
    this.crumbs.push(crumb);

    this.tweens.add({
      targets: crumb,
      y: crumb.y - 4,
      duration: 700 + Math.random() * 300,
      yoyo: true,
      repeat: -1,
    });
  }

  private collectCrumb(crumb: Phaser.Physics.Arcade.Sprite): void {
    if (!crumb.active) return;
    crumb.destroy();
    this.score += 10;
    this.scoreText.setText(fmt(L().arcade.catChase.score, { score: this.score }));

    spawnFoodPickup(this, crumb.x, crumb.y);

    if (this.crumbs.filter((c) => c.active).length < 5) {
      this.spawnCrumb();
    }
  }

  private win(): void {
    this.alive = false;
    this.runCompleted = true;
    const finalScore = this.score + Math.floor(this.timeLeft * 5);
    this.state.updateHighScore(SCENES.CAT_CHASE, finalScore);
    AnalyticsService.getInstance().trackArcadeComplete(SCENES.CAT_CHASE, finalScore, true);
    SoundManager.getInstance().playSFX('arcade_win');
    this.state.addFood(30);
    this.state.addMoney(20);
    this.state.trackDailyProgress('arcade', 1);
    this.state.persist();

    const t = L();
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'ui-panel').setDisplaySize(500, 130).setAlpha(0.92);
    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        fmt(t.arcade.catChase.win, { score: fmt(t.common.score, { score: finalScore }) }),
        {
          fontFamily: 'Segoe UI, Arial, sans-serif',
          fontSize: '22px',
          color: '#fff8e1',
          align: 'center',
        },
      )
      .setOrigin(0.5);

    this.time.delayedCall(2500, () => this.exitArcade());
  }

  private lose(): void {
    this.alive = false;
    this.runCompleted = true;
    screenShake(this, 350, 0.03);
    const finalScore = this.score;
    AnalyticsService.getInstance().trackArcadeComplete(SCENES.CAT_CHASE, finalScore, false);
    SoundManager.getInstance().playSFX('arcade_lose');
    this.state.economy.damage(10);
    this.state.persist();

    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'ui-panel').setDisplaySize(420, 100).setAlpha(0.92);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, L().arcade.catChase.fail, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '26px',
        color: '#fff8e1',
      })
      .setOrigin(0.5);
    this.time.delayedCall(2000, () => this.exitArcade());
  }

  private exitArcade(): void {
    void this.finishArcade();
  }

  private async finishArcade(): Promise<void> {
    if (this.runCompleted) {
      await monetizationService.onArcadeComplete(SCENES.CAT_CHASE);
    }
    this.state.persist();
    this.scene.start(SCENES.NEST);
  }
}
