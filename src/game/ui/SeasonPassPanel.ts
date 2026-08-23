import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { getNestHudButtonX, getNestHudButtonY } from './MobileUILayout';
import { GameState } from '../GameState';
import {
  createTextButton,
  createModalOverlay,
  createModalPanel,
  showToast,
} from './ButtonHelper';
import { L, fmt } from '../../i18n';
import { SoundManager } from '../audio/SoundManager';
import { iapService } from '../../platforms/IAPService';
import type { SeasonPassReward } from '../systems/SeasonPassSystem';
import { SEASON_PASS_TIERS } from '../systems/SeasonPassSystem';
import { DEPTH } from '../graphics/SceneDepth';
import { ModalLayer } from './ModalLayer';

export class SeasonPassPanel {
  private readonly state = GameState.getInstance();
  private modal = new ModalLayer();
  private overlay: Phaser.GameObjects.Rectangle | null = null;
  private container: Phaser.GameObjects.Container | null = null;
  private onClose: (() => void) | null = null;
  private buying = false;

  createHudButton(scene: Phaser.Scene): Phaser.GameObjects.Container {
    const tier = this.state.seasonPass.getTier();
    const btn = createTextButton(
      scene,
      getNestHudButtonX('seasonPass'),
      getNestHudButtonY('seasonPass'),
      fmt(L().seasonPass.hudButton, { tier }),
      () => this.show(scene),
      54,
      46,
    );
    btn.setDepth(DEPTH.hud + 12);
    return btn;
  }

  show(scene: Phaser.Scene, onClose?: () => void): void {
    this.modal.destroyAll();
    this.overlay = null;
    this.container = null;
    this.onClose = onClose ?? null;
    this.state.seasonPass.checkSeasonReset();

    const t = L().seasonPass;
    const depth = 900;

    this.overlay = this.modal.track(createModalOverlay(scene, depth));
    this.overlay.on('pointerdown', () => this.hide());

    const panelW = 700;
    const panelH = 560;
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.modal.track(createModalPanel(scene, cx, cy, panelW, panelH, depth + 1));

    const panelBlocker = this.modal.track(
      scene.add
        .rectangle(cx, cy, panelW, panelH, 0x000000, 0)
        .setInteractive()
        .setDepth(depth + 1),
    );
    panelBlocker.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
      ev.stopPropagation();
    });

    this.container = this.modal.track(scene.add.container(0, 0).setDepth(depth + 2));

    const title = scene.add
      .text(cx, cy - 252, t.title, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '24px',
        color: '#fff8e1',
        stroke: '#5d2e00',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    this.container.add(title);

    const daysLeft = this.state.seasonPass.getDaysRemaining();
    const sub = scene.add
      .text(cx, cy - 222, fmt(t.daysLeft, { days: daysLeft }), {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '14px',
        color: '#ffca28',
      })
      .setOrigin(0.5);
    this.container.add(sub);

    this.renderProgressBar(scene, cx, cy - 190, depth);

    const freeHeader = scene.add
      .text(cx - 130, cy - 158, t.freeTrack, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '15px',
        color: '#bcaaa4',
      })
      .setOrigin(0.5);
    const premHeader = scene.add
      .text(cx + 130, cy - 158, t.premiumTrack, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '15px',
        color: this.state.seasonPass.isPremium() ? '#ffca28' : '#8d6e63',
      })
      .setOrigin(0.5);
    this.container.add([freeHeader, premHeader]);

    const startY = cy - 128;
    SEASON_PASS_TIERS.forEach((tierDef, i) => {
      const y = startY + i * 28;
      this.renderTierRow(scene, cx, y, tierDef.tier, depth, t);
    });

    if (!this.state.seasonPass.isPremium()) {
      const price = iapService.getProducts().find((p) => p.id === 'season_pass_premium')?.priceLabel ?? '$2.99';
      this.modal.track(
        createTextButton(
          scene,
          cx,
          cy + 248,
          fmt(t.buyPremium, { price }),
          () => void this.purchasePremium(scene),
          280,
          40,
        ).setDepth(depth + 3),
      );
    } else {
      const owned = scene.add
        .text(cx, cy + 248, t.premiumActive, {
          fontFamily: 'Segoe UI, Arial, sans-serif',
          fontSize: '15px',
          color: '#66bb6a',
        })
        .setOrigin(0.5);
      this.container.add(owned);
    }

    this.modal.track(
      createTextButton(scene, cx, cy + 248, t.close, () => this.hide(), 100, 36).setDepth(depth + 4),
    );
  }

  private renderProgressBar(scene: Phaser.Scene, cx: number, y: number, depth: number): void {
    const t = L().seasonPass;
    const progress = this.state.seasonPass.getTierProgress();
    const tier = this.state.seasonPass.getTier();
    const barW = 520;

    const bg = scene.add
      .image(cx, y, 'ui-button')
      .setDisplaySize(barW, 18)
      .setTint(0x3e2723)
      .setDepth(depth + 2);
    const fill = scene.add
      .image(cx - barW / 2, y, 'ui-button')
      .setOrigin(0, 0.5)
      .setDisplaySize(barW * progress.ratio, 18)
      .setTint(0xffa726)
      .setDepth(depth + 2);

    const glow = scene.add
      .image(cx, y, 'ui-button')
      .setDisplaySize(barW + 8, 24)
      .setTint(0xff6f00)
      .setAlpha(0.15)
      .setDepth(depth + 1);

    const label = scene.add
      .text(
        cx,
        y,
        fmt(t.progress, {
          tier,
          current: progress.current,
          needed: progress.needed,
          xp: this.state.seasonPass.getXP(),
        }),
        {
          fontFamily: 'Segoe UI, Arial, sans-serif',
          fontSize: '13px',
          color: '#fff8e1',
        },
      )
      .setOrigin(0.5)
      .setDepth(depth + 3);

    this.container?.add([glow, bg, fill, label]);
  }

  private renderTierRow(
    scene: Phaser.Scene,
    cx: number,
    y: number,
    tier: number,
    depth: number,
    t: ReturnType<typeof L>['seasonPass'],
  ): void {
    const unlocked = this.state.seasonPass.getTier() >= tier;
    const tierLabel = scene.add
      .text(cx - 310, y, `${tier}`, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '13px',
        color: unlocked ? '#fff8e1' : '#6d4c41',
      })
      .setOrigin(0.5);
    this.container?.add(tierLabel);

    this.renderRewardCell(scene, cx - 130, y, tier, 'free', depth, t);
    this.renderRewardCell(scene, cx + 130, y, tier, 'premium', depth, t);
  }

  private renderRewardCell(
    scene: Phaser.Scene,
    x: number,
    y: number,
    tier: number,
    track: 'free' | 'premium',
    depth: number,
    t: ReturnType<typeof L>['seasonPass'],
  ): void {
    const def = SEASON_PASS_TIERS.find((d) => d.tier === tier);
    if (!def) return;
    const reward = track === 'free' ? def.free : def.premium;
    const label = this.rewardLabel(reward, t);
    const claimed = this.state.seasonPass.isClaimed(tier, track);
    const canClaim = this.state.seasonPass.canClaim(tier, track);

    const bgColor = claimed ? 0x2e7d32 : canClaim ? 0xff6f00 : 0x4e342e;
    const cell = scene.add
      .rectangle(x, y, 200, 24, bgColor, claimed ? 0.5 : 0.85)
      .setStrokeStyle(1, track === 'premium' ? 0xffca28 : 0x8d6e63, 0.6)
      .setDepth(depth + 2);
    this.container?.add(cell);

    const text = scene.add
      .text(x, y, label, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '11px',
        color: claimed ? '#a5d6a7' : '#fff8e1',
      })
      .setOrigin(0.5)
      .setDepth(depth + 3);
    this.container?.add(text);

    if (canClaim) {
      cell.setInteractive({ useHandCursor: true });
      cell.on('pointerdown', () => {
        if (this.state.claimSeasonPassReward(tier, track)) {
          SoundManager.getInstance().playSFX('daily_bonus');
          showToast(scene, t.rewardClaimed);
          this.hide();
          this.show(scene, this.onClose ?? undefined);
        }
      });
    }
  }

  private rewardLabel(reward: SeasonPassReward, t: ReturnType<typeof L>['seasonPass']): string {
    switch (reward.type) {
      case 'food':
        return fmt(t.rewards.food, { amount: reward.amount ?? 0 });
      case 'money':
        return fmt(t.rewards.money, { amount: reward.amount ?? 0 });
      case 'energy':
        return fmt(t.rewards.energy, { amount: reward.amount ?? 0 });
      case 'shield':
        return fmt(t.rewards.shield, { hours: reward.amount ?? 0 });
      case 'skin':
        return fmt(t.rewards.skin, { skin: t.skins[reward.skinId ?? 'default'] });
      default:
        return '?';
    }
  }

  private async purchasePremium(scene: Phaser.Scene): Promise<void> {
    if (this.buying) return;
    this.buying = true;
    const t = L().shop;
    const ok = await iapService.purchase('season_pass_premium');
    this.buying = false;
    if (ok) {
      this.state.applyIAPPurchase('season_pass_premium');
      SoundManager.getInstance().playSFX('ui_confirm');
      showToast(scene, fmt(t.purchaseSuccess, { product: L().shop.products.season_pass_premium }));
      this.hide();
      this.show(scene, this.onClose ?? undefined);
    } else {
      showToast(scene, t.purchaseFail);
    }
  }

  hide(): void {
    this.modal.destroyAll();
    this.overlay = null;
    this.container = null;
    const cb = this.onClose;
    this.onClose = null;
    cb?.();
  }

  isVisible(): boolean {
    return this.overlay !== null;
  }
}
