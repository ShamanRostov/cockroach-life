import Phaser from 'phaser';
import { GameState } from '../GameState';
import { L, fmt } from '../../i18n';
import { getSafeAreaInsets, NEST_LAYOUT } from './MobileUILayout';
import { spawnCoinBurst } from '../graphics/ParticleEffects';
import { DEPTH } from '../graphics/SceneDepth';

export class ResourceHUD {
  private scene!: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private foodText!: Phaser.GameObjects.Text;
  private moneyText!: Phaser.GameObjects.Text;
  private healthFill!: Phaser.GameObjects.Rectangle;
  private healthTrack!: Phaser.GameObjects.Rectangle;
  private healthText!: Phaser.GameObjects.Text;
  private readonly state = GameState.getInstance();
  private readonly pad = 12;
  private readonly barH = 10;
  private barW = 228;
  private prevFood = -1;
  private prevMoney = -1;
  private prevHealth = -1;

  create(scene: Phaser.Scene, x?: number, y?: number): Phaser.GameObjects.Container {
    this.scene = scene;
    const safe = getSafeAreaInsets();
    const hudX = x ?? NEST_LAYOUT.sideMargin + safe.left;
    const hudY = y ?? 12 + safe.top;
    const panelW = NEST_LAYOUT.hudW;
    const panelH = NEST_LAYOUT.hudH;
    this.barW = panelW - this.pad * 2;

    this.container = scene.add.container(hudX, hudY).setDepth(DEPTH.hud);

    const panel = scene.add
      .rectangle(0, 0, panelW, panelH, 0x1e140c, 0.9)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0xffa726, 0.5);

    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '16px',
      color: '#ffca28',
    };

    this.foodText = scene.add.text(this.pad, 10, '', { ...textStyle, color: '#ffca28' });
    this.moneyText = scene.add.text(this.pad, 32, '', { ...textStyle, color: '#66bb6a' });
    this.healthText = scene.add.text(this.pad, 54, '', { ...textStyle, fontSize: '15px', color: '#ef5350' });

    const barY = panelH - this.pad - this.barH / 2;
    this.healthTrack = scene.add
      .rectangle(this.pad, barY, this.barW, this.barH, 0x3e2723, 0.9)
      .setOrigin(0, 0.5);
    this.healthFill = scene.add
      .rectangle(this.pad, barY, this.barW, this.barH, 0x43a047, 0.95)
      .setOrigin(0, 0.5);

    this.container.add([
      panel,
      this.healthTrack,
      this.healthFill,
      this.foodText,
      this.moneyText,
      this.healthText,
    ]);
    this.refresh();
    return this.container;
  }

  refresh(): void {
    const { economy } = this.state;
    const t = L();
    const food = Math.floor(economy.food);
    const money = Math.floor(economy.money);
    const health = Math.floor(economy.health);
    const foodCap = economy.maxFoodCap;
    const moneyCap = economy.maxMoneyCap;

    this.foodText.setText(fmt(t.hud.food, { value: food, max: foodCap }));
    this.moneyText.setText(fmt(t.hud.money, { value: money, max: moneyCap }));
    this.healthText.setText(
      fmt(t.hud.health, { current: health, max: economy.maxHealth }),
    );

    const ratio = Phaser.Math.Clamp(economy.health / economy.maxHealth, 0, 1);
    this.healthFill.setSize(Math.max(2, this.barW * ratio), this.barH);
    this.healthFill.setFillStyle(ratio > 0.3 ? 0x43a047 : 0xe53935, 0.95);

    if (this.prevFood >= 0) {
      if (food > this.prevFood) {
        this.pulseResource(this.foodText, '#fff176', true);
      }
      if (money > this.prevMoney) {
        this.pulseResource(this.moneyText, '#a5d6a7', true);
        const world = this.container.getWorldTransformMatrix();
        spawnCoinBurst(this.scene, world.tx + 48, world.ty + 38);
      }
      if (health !== this.prevHealth) {
        this.pulseResource(this.healthText, health > this.prevHealth ? '#ef9a9a' : '#ff8a80', false);
      }
    }

    this.prevFood = food;
    this.prevMoney = money;
    this.prevHealth = health;
  }

  private pulseResource(text: Phaser.GameObjects.Text, flashColor: string, bounce: boolean): void {
    const baseColor = text.style.color as string;
    this.scene.tweens.killTweensOf(text);
    text.setScale(1);

    this.scene.tweens.add({
      targets: text,
      scaleX: 1.14,
      scaleY: bounce ? 1.22 : 1.1,
      duration: 120,
      yoyo: true,
      ease: 'Back.easeOut',
    });

    text.setColor(flashColor);
    this.scene.time.delayedCall(180, () => {
      if (text.active) text.setColor(baseColor);
    });
  }
}
