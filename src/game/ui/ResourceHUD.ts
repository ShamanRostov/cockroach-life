import Phaser from 'phaser';
import { GameState } from '../GameState';
import { L, fmt } from '../../i18n';
import { getSafeAreaInsets } from './MobileUILayout';
import { spawnCoinBurst } from '../graphics/ParticleEffects';
import { DEPTH } from '../graphics/SceneDepth';

export class ResourceHUD {
  private scene!: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private foodText!: Phaser.GameObjects.Text;
  private moneyText!: Phaser.GameObjects.Text;
  private healthFill!: Phaser.GameObjects.Image;
  private healthText!: Phaser.GameObjects.Text;
  private readonly state = GameState.getInstance();
  private readonly barW = 96;
  private prevFood = -1;
  private prevMoney = -1;
  private prevHealth = -1;

  create(scene: Phaser.Scene, x?: number, y?: number): Phaser.GameObjects.Container {
    this.scene = scene;
    const safe = getSafeAreaInsets();
    const hudX = x ?? 16 + safe.left;
    const hudY = y ?? 16 + safe.top;
    this.container = scene.add.container(hudX, hudY).setDepth(DEPTH.hud);

    const panel = scene.add.image(0, 0, 'ui-hud-panel').setOrigin(0, 0).setDisplaySize(300, 96);

    this.foodText = scene.add.text(16, 14, '', {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '16px',
      color: '#ffca28',
    });

    this.moneyText = scene.add.text(16, 38, '', {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '16px',
      color: '#66bb6a',
    });

    this.healthText = scene.add.text(16, 62, '', {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '14px',
      color: '#ef5350',
    });

    this.healthFill = scene.add
      .image(178, 72, 'ui-button')
      .setOrigin(0, 0.5)
      .setDisplaySize(this.barW, 10);

    this.container.add([panel, this.healthFill, this.foodText, this.moneyText, this.healthText]);
    this.refresh();
    return this.container;
  }

  refresh(): void {
    const { economy } = this.state;
    const t = L();
    const food = Math.floor(economy.food);
    const money = Math.floor(economy.money);
    const health = Math.floor(economy.health);

    this.foodText.setText(fmt(t.hud.food, { value: food }));
    this.moneyText.setText(fmt(t.hud.money, { value: money }));
    this.healthText.setText(
      fmt(t.hud.health, { current: health, max: economy.maxHealth }),
    );

    const ratio = Phaser.Math.Clamp(economy.health / economy.maxHealth, 0, 1);
    this.healthFill.setDisplaySize(this.barW * ratio, 10);
    this.healthFill.setTint(ratio > 0.3 ? 0x43a047 : 0xe53935);

    if (this.prevFood >= 0) {
      if (food > this.prevFood) {
        this.pulseResource(this.foodText, '#fff176', true);
      }
      if (money > this.prevMoney) {
        this.pulseResource(this.moneyText, '#a5d6a7', true);
        const world = this.container.getWorldTransformMatrix();
        spawnCoinBurst(this.scene, world.tx + 48, world.ty + 46);
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
