import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT, isMobileDevice } from '../config';
import { GameState } from '../GameState';
import { createTextButton, createPanel } from '../ui/ButtonHelper';
import { addLocaleSafeArcadeBg } from '../graphics/ArcadeBackground';
import { createCockroachPhysics, syncCockroachMovement } from '../graphics/CockroachSprite';
import { spawnFoodPickup, spawnSparkBurst } from '../graphics/ParticleEffects';
import { screenShake, showScorePopup } from '../graphics/VisualEffects';
import { TouchControls } from '../ui/TouchControls';
import { showArcadeHint } from '../ui/ArcadeHint';
import { L, fmt } from '../../i18n';
import { monetizationService } from '../../platforms/MonetizationService';
import { AnalyticsService } from '../../platforms/AnalyticsService';
import { SoundManager } from '../audio/SoundManager';
import { ARCADE_CAT_CHASE } from '../systems/GameBalance';

const SURVIVE_SECONDS = ARCADE_CAT_CHASE.surviveSeconds;
const CAT_SPEED = ARCADE_CAT_CHASE.catSpeed;
const PLAYER_SPEED = ARCADE_CAT_CHASE.playerSpeed;
const CATCH_DISTANCE = ARCADE_CAT_CHASE.catchDistance;
const BOOST_SPEED = Math.round(PLAYER_SPEED * 1.38);
const NEAR_MISS_MAX = 58;
const BOOST_DURATION_MS = 4500;

export class CatChaseScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cat!: Phaser.Physics.Arcade.Sprite;
  private crumbs: Phaser.Physics.Arcade.Sprite[] = [];
  private boosts: Phaser.Physics.Arcade.Sprite[] = [];
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
  private boostTimer = 0;
  private nearMissActive = false;
  private boostSpawnTimer = 0;
  private state = GameState.getInstance();

  constructor() {
    super(SCENES.CAT_CHASE);
  }

  create(): void {
    const t = L();
    addLocaleSafeArcadeBg(this, 'arcade-catch-bg');
    this.physics.world.setBounds(60, 100, GAME_WIDTH - 120, GAME_HEIGHT - 160);

    createPanel(this, GAME_WIDTH / 2 - 210, 14, 420, 52, 0.88);

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
      ARCADE_CAT_CHASE.roachScale,
      GameState.getInstance().skins.getTint(),
    );
    this.player.setCollideWorldBounds(true);

    this.cat = this.physics.add.sprite(GAME_WIDTH / 2, 160, 'cat');
    this.cat.setScale(0.85);
    this.cat.setCollideWorldBounds(true);

    for (let i = 0; i < 10; i++) {
      this.spawnCrumb();
    }
    this.spawnBoost();

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

    showArcadeHint(this, t.arcade.catChase.howTo, controlsHint);
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

    if (this.boostTimer > 0) {
      this.boostTimer -= delta;
      if (this.boostTimer <= 0) this.player.clearTint();
    }

    this.boostSpawnTimer += delta;
    if (this.boostSpawnTimer > 12000 && this.boosts.filter((b) => b.active).length < 1) {
      this.boostSpawnTimer = 0;
      this.spawnBoost();
    }

    const speed = this.boostTimer > 0 ? BOOST_SPEED : PLAYER_SPEED;
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

    this.chasePlayer();

    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.cat.x, this.cat.y);
    if (dist >= CATCH_DISTANCE && dist < NEAR_MISS_MAX) {
      this.nearMissActive = true;
    } else if (this.nearMissActive && dist >= NEAR_MISS_MAX) {
      this.nearMissActive = false;
      this.awardNearMiss();
    }

    if (dist < CATCH_DISTANCE) {
      this.lose();
    }
  }

  private awardNearMiss(): void {
    const bonus = 15;
    this.score += bonus;
    this.scoreText.setText(fmt(L().arcade.catChase.score, { score: this.score }));
    showScorePopup(this, this.player.x, this.player.y - 30, `+${bonus}`, '#ffd54f');
    spawnSparkBurst(this, this.player.x, this.player.y, 6, 0xffd54f);
  }

  private spawnBoost(): void {
    const x = Phaser.Math.Between(100, GAME_WIDTH - 100);
    const y = Phaser.Math.Between(140, GAME_HEIGHT - 100);
    const boost = this.physics.add.sprite(x, y, 'spark');
    boost.setScale(0.55);
    boost.setTint(0x4fc3f7);
    this.physics.add.overlap(this.player, boost, () => this.collectBoost(boost), undefined, this);
    this.boosts.push(boost);

    this.tweens.add({
      targets: boost,
      scale: 0.7,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });
  }

  private collectBoost(boost: Phaser.Physics.Arcade.Sprite): void {
    if (!boost.active) return;
    boost.destroy();
    this.boostTimer = BOOST_DURATION_MS;
    this.player.setTint(0x4fc3f7);
    spawnSparkBurst(this, this.player.x, this.player.y, 10, 0x4fc3f7);
    showScorePopup(this, this.player.x, this.player.y - 24, L().arcade.catChase.boost, '#4fc3f7');
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
    crumb.setScale(
      ARCADE_CAT_CHASE.crumbScaleMin +
        Math.random() * (ARCADE_CAT_CHASE.crumbScaleMax - ARCADE_CAT_CHASE.crumbScaleMin),
    );
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
    this.score += ARCADE_CAT_CHASE.crumbScore;
    this.scoreText.setText(fmt(L().arcade.catChase.score, { score: this.score }));

    spawnFoodPickup(this, crumb.x, crumb.y);
    showScorePopup(this, crumb.x, crumb.y - 16, `+${ARCADE_CAT_CHASE.crumbScore}`, '#66bb6a');
    screenShake(this, 100, 0.006);

    if (this.crumbs.filter((c) => c.active).length < 5) {
      this.spawnCrumb();
    }
  }

  private win(): void {
    this.alive = false;
    this.runCompleted = true;
    const finalScore = this.score + Math.floor(this.timeLeft * ARCADE_CAT_CHASE.timeBonusMult);
    this.state.updateHighScore(SCENES.CAT_CHASE, finalScore);
    AnalyticsService.getInstance().trackArcadeComplete(SCENES.CAT_CHASE, finalScore, true);
    SoundManager.getInstance().playSFX('arcade_win');
    this.state.addFood(ARCADE_CAT_CHASE.winFood);
    this.state.addMoney(ARCADE_CAT_CHASE.winMoney);
    this.state.trackDailyProgress('arcade', 1);
    this.state.persist();

    const t = L();
    createPanel(this, GAME_WIDTH / 2 - 250, GAME_HEIGHT / 2 - 65, 500, 130, 0.92);
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
    spawnSparkBurst(this, this.player.x, this.player.y, 12, 0xef5350);
    const finalScore = this.score;
    AnalyticsService.getInstance().trackArcadeComplete(SCENES.CAT_CHASE, finalScore, false);
    SoundManager.getInstance().playSFX('arcade_lose');
    this.state.economy.damage(ARCADE_CAT_CHASE.failDamage);
    this.state.persist();

    createPanel(this, GAME_WIDTH / 2 - 210, GAME_HEIGHT / 2 - 50, 420, 100, 0.92);
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
