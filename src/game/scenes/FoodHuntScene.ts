import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT, isMobileDevice } from '../config';
import { GameState } from '../GameState';
import { createTextButton, addFullscreenBg } from '../ui/ButtonHelper';
import { createCockroachPhysics, syncCockroachMovement } from '../graphics/CockroachSprite';
import { spawnFoodPickup, spawnCrumbTrail, spawnSparkBurst } from '../graphics/ParticleEffects';
import { screenShake, showScorePopup } from '../graphics/VisualEffects';
import { TouchControls } from '../ui/TouchControls';
import { L, fmt } from '../../i18n';
import { monetizationService } from '../../platforms/MonetizationService';
import { AnalyticsService } from '../../platforms/AnalyticsService';
import { SoundManager } from '../audio/SoundManager';
import { ARCADE_FOOD_HUNT } from '../systems/GameBalance';

export class FoodHuntScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private foods: Phaser.Physics.Arcade.Sprite[] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private touchControls: TouchControls | null = null;
  private hunger = 100;
  private collected = 0;
  private target = ARCADE_FOOD_HUNT.targetCrumbs;
  private alive = true;
  private runCompleted = false;
  private hungerText!: Phaser.GameObjects.Text;
  private collectText!: Phaser.GameObjects.Text;
  private magnetRadius = 0;
  private trailTimer = 0;
  private state = GameState.getInstance();

  constructor() {
    super(SCENES.FOOD);
  }

  create(): void {
    const t = L();
    addFullscreenBg(this, 'arcade-food-bg');
    this.physics.world.setBounds(60, 100, GAME_WIDTH - 120, GAME_HEIGHT - 160);

    this.add
      .image(GAME_WIDTH / 2, 40, 'ui-panel')
      .setDisplaySize(360, 52)
      .setAlpha(0.88);

    this.add
      .text(GAME_WIDTH / 2, 40, t.arcade.food.title, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '26px',
        color: '#fff8e1',
      })
      .setOrigin(0.5);

    this.hungerText = this.add.text(16, 16, fmt(t.arcade.food.hunger, { value: 100 }), {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '18px',
      color: '#ffca28',
    });

    this.collectText = this.add.text(
      16,
      44,
      fmt(t.arcade.food.collected, { current: 0, target: this.target }),
      {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '18px',
        color: '#66bb6a',
      },
    );

    this.player = createCockroachPhysics(
      this,
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      1.5,
      GameState.getInstance().skins.getTint(),
    );
    this.player.setCollideWorldBounds(true);

    for (let i = 0; i < 12; i++) {
      this.spawnFood();
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

    const controlsHint = isMobileDevice() ? L().mobile.useJoystick : t.arcade.food.controls;
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

    const speed = 220;
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

    this.applyMagnet(delta);

    this.hunger -= delta * ARCADE_FOOD_HUNT.hungerDrain;
    this.hungerText.setText(
      fmt(L().arcade.food.hunger, { value: Math.max(0, Math.floor(this.hunger)) }),
    );

    if (this.hunger <= 0) {
      this.lose();
    }
  }

  private applyMagnet(delta: number): void {
    if (this.magnetRadius <= 0) return;

    this.trailTimer += delta;
    for (const food of this.foods) {
      if (!food.active) continue;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, food.x, food.y);
      if (dist > this.magnetRadius || dist < 8) continue;
      const pull = ((this.magnetRadius - dist) / this.magnetRadius) * 220;
      food.setVelocity(
        ((this.player.x - food.x) / dist) * pull,
        ((this.player.y - food.y) / dist) * pull,
      );
      if (this.trailTimer > 120) {
        spawnCrumbTrail(this, food.x, food.y);
      }
    }
    if (this.trailTimer > 120) this.trailTimer = 0;
  }

  private spawnFood(): void {
    const x = Phaser.Math.Between(100, GAME_WIDTH - 100);
    const y = Phaser.Math.Between(140, GAME_HEIGHT - 100);
    const food = this.physics.add.sprite(x, y, 'food-crumb');
    food.setScale(0.35 + Math.random() * 0.15);
    this.physics.add.overlap(this.player, food, () => this.collectFood(food), undefined, this);
    this.foods.push(food);

    this.tweens.add({
      targets: food,
      y: food.y - 5,
      duration: 800 + Math.random() * 400,
      yoyo: true,
      repeat: -1,
    });
  }

  private collectFood(food: Phaser.Physics.Arcade.Sprite): void {
    if (!food.active) return;
    const { x, y } = food;
    food.destroy();
    this.collected += 1;
    this.hunger = Math.min(100, this.hunger + ARCADE_FOOD_HUNT.hungerPerCrumb);
    this.magnetRadius = Math.min(95, this.magnetRadius + 14);
    const t = L();
    this.collectText.setText(
      fmt(t.arcade.food.collected, { current: this.collected, target: this.target }),
    );

    spawnFoodPickup(this, x, y);
    spawnSparkBurst(this, x, y, 6);
    screenShake(this, 120, 0.008);
    showScorePopup(this, x, y - 20, `+${ARCADE_FOOD_HUNT.hungerPerCrumb}`, '#66bb6a');

    if (this.collected >= this.target) {
      this.win();
    } else if (this.foods.filter((f) => f.active).length < 4) {
      this.spawnFood();
    }
  }

  private win(): void {
    this.alive = false;
    this.runCompleted = true;
    const score = Math.floor(this.hunger + this.collected * 10);
    this.state.updateHighScore(SCENES.FOOD, score);
    AnalyticsService.getInstance().trackArcadeComplete(SCENES.FOOD, score, true);
    SoundManager.getInstance().playSFX('arcade_win');
    this.state.addFood(ARCADE_FOOD_HUNT.winFood);
    this.state.addMoney(ARCADE_FOOD_HUNT.winMoney);
    this.state.trackDailyProgress('arcade', 1);
    this.state.persist();

    const t = L();
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'ui-panel').setDisplaySize(480, 120).setAlpha(0.92);
    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        fmt(t.arcade.food.win, { score: fmt(t.common.score, { score }) }),
        {
          fontFamily: 'Segoe UI, Arial, sans-serif',
          fontSize: '24px',
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
    const score = Math.floor(this.hunger + this.collected * 10);
    AnalyticsService.getInstance().trackArcadeComplete(SCENES.FOOD, score, false);
    SoundManager.getInstance().playSFX('arcade_lose');
    this.state.economy.damage(ARCADE_FOOD_HUNT.failDamage);
    this.state.persist();
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'ui-panel').setDisplaySize(420, 100).setAlpha(0.92);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, L().arcade.food.fail, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '28px',
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
      await monetizationService.onArcadeComplete(SCENES.FOOD);
    }
    this.state.persist();
    this.scene.start(SCENES.NEST);
  }
}
