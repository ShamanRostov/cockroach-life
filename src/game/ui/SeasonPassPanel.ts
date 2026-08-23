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

const PANEL_W = 720;
const PANEL_H = 600;
const ROW_H = 24;
const VISIBLE_ROWS = 12;

/**
 * Season Pass modal — clear header, scrollable tiers, footer buttons that never overlap.
 */
export class SeasonPassPanel {
  private readonly state = GameState.getInstance();
  private modal = new ModalLayer();
  private overlay: Phaser.GameObjects.Rectangle | null = null;
  private container: Phaser.GameObjects.Container | null = null;
  private listContainer: Phaser.GameObjects.Container | null = null;
  private onClose: (() => void) | null = null;
  private buying = false;
  private scrollOffset = 0;
  private sceneRef: Phaser.Scene | null = null;
  private depth = 900;
  private cx = 0;
  private cy = 0;

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
    this.listContainer = null;
    this.onClose = onClose ?? null;
    this.buying = false;
    this.sceneRef = scene;
    this.state.seasonPass.checkSeasonReset();

    const t = L().seasonPass;
    this.depth = 900;
    this.cx = GAME_WIDTH / 2;
    this.cy = GAME_HEIGHT / 2;
    const { cx, cy, depth } = this;

    // Start scroll near the player's current tier.
    const tier = this.state.seasonPass.getTier();
    this.scrollOffset = Phaser.Math.Clamp(tier - 1, 0, Math.max(0, SEASON_PASS_TIERS.length - VISIBLE_ROWS));

    this.overlay = this.modal.track(createModalOverlay(scene, depth));
    this.overlay.on('pointerdown', () => this.hide());

    this.modal.track(createModalPanel(scene, cx, cy, PANEL_W, PANEL_H, depth + 1));

    const panelBlocker = this.modal.track(
      scene.add
        .rectangle(cx, cy, PANEL_W, PANEL_H, 0x000000, 0)
        .setInteractive()
        .setDepth(depth + 1),
    );
    panelBlocker.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
      ev.stopPropagation();
    });

    this.container = this.modal.track(scene.add.container(0, 0).setDepth(depth + 2));

    // Header
    const title = scene.add
      .text(cx, cy - PANEL_H / 2 + 28, t.title, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '26px',
        fontStyle: 'bold',
        color: '#fff8e1',
        stroke: '#5d2e00',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    const daysLeft = this.state.seasonPass.getDaysRemaining();
    const sub = scene.add
      .text(cx, cy - PANEL_H / 2 + 54, fmt(t.daysLeft, { days: daysLeft }), {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '14px',
        color: '#ffca28',
      })
      .setOrigin(0.5);
    this.container.add([title, sub]);

    this.renderProgressBar(scene, cx, cy - PANEL_H / 2 + 88);

    const freeHeader = scene.add
      .text(cx - 140, cy - PANEL_H / 2 + 118, t.freeTrack, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#bcaaa4',
      })
      .setOrigin(0.5);
    const premHeader = scene.add
      .text(cx + 140, cy - PANEL_H / 2 + 118, t.premiumTrack, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: this.state.seasonPass.isPremium() ? '#ffca28' : '#8d6e63',
      })
      .setOrigin(0.5);
    this.container.add([freeHeader, premHeader]);

    // Tier list area
    const listTop = cy - PANEL_H / 2 + 136;
    const listH = VISIBLE_ROWS * ROW_H;
    const listBg = scene.add
      .rectangle(cx, listTop + listH / 2, PANEL_W - 56, listH + 8, 0x000000, 0.28)
      .setStrokeStyle(1, 0xffa726, 0.35);
    this.container.add(listBg);

    this.listContainer = scene.add.container(0, 0);
    this.container.add(this.listContainer);
    this.renderTierPage();

    // Scroll controls when more tiers than fit
    if (SEASON_PASS_TIERS.length > VISIBLE_ROWS) {
      this.modal.track(
        createTextButton(scene, cx - 300, listTop + listH / 2 - 28, '▲', () => {
          this.scrollOffset = Math.max(0, this.scrollOffset - 3);
          this.renderTierPage();
        }, 44, 36).setDepth(depth + 4),
      );
      this.modal.track(
        createTextButton(scene, cx - 300, listTop + listH / 2 + 28, '▼', () => {
          this.scrollOffset = Math.min(
            Math.max(0, SEASON_PASS_TIERS.length - VISIBLE_ROWS),
            this.scrollOffset + 3,
          );
          this.renderTierPage();
        }, 44, 36).setDepth(depth + 4),
      );
    }

    // Footer — buy and close never share the same spot
    const footerY = cy + PANEL_H / 2 - 36;
    if (!this.state.seasonPass.isPremium()) {
      const price =
        iapService.getProducts().find((p) => p.id === 'season_pass_premium')?.priceLabel ?? '$2.99';
      this.modal.track(
        createTextButton(
          scene,
          cx - 110,
          footerY,
          fmt(t.buyPremium, { price }),
          () => void this.purchasePremium(scene),
          300,
          44,
        ).setDepth(depth + 4),
      );
      this.modal.track(
        createTextButton(scene, cx + 220, footerY, t.close, () => this.hide(), 120, 44).setDepth(
          depth + 4,
        ),
      );
    } else {
      const owned = scene.add
        .text(cx - 80, footerY, t.premiumActive, {
          fontFamily: 'Segoe UI, Arial, sans-serif',
          fontSize: '16px',
          color: '#66bb6a',
        })
        .setOrigin(0.5);
      this.container.add(owned);
      this.modal.track(
        createTextButton(scene, cx + 200, footerY, t.close, () => this.hide(), 140, 44).setDepth(
          depth + 4,
        ),
      );
    }
  }

  private renderProgressBar(scene: Phaser.Scene, cx: number, y: number): void {
    const t = L().seasonPass;
    const progress = this.state.seasonPass.getTierProgress();
    const tier = this.state.seasonPass.getTier();
    const barW = 560;

    const bg = scene.add
      .rectangle(cx, y, barW, 22, 0x3e2723, 1)
      .setStrokeStyle(1, 0x5d4037, 0.8);
    const fillW = Math.max(4, barW * progress.ratio);
    const fill = scene.add
      .rectangle(cx - barW / 2 + fillW / 2, y, fillW, 18, 0xffa726, 1);

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
      .setOrigin(0.5);

    this.container?.add([bg, fill, label]);
  }

  private renderTierPage(): void {
    if (!this.listContainer || !this.sceneRef) return;
    this.listContainer.removeAll(true);

    const t = L().seasonPass;
    const listTop = this.cy - PANEL_H / 2 + 136;
    const slice = SEASON_PASS_TIERS.slice(this.scrollOffset, this.scrollOffset + VISIBLE_ROWS);

    slice.forEach((tierDef, i) => {
      const y = listTop + ROW_H / 2 + i * ROW_H;
      this.renderTierRow(this.sceneRef!, this.cx, y, tierDef.tier, t);
    });
  }

  private renderTierRow(
    scene: Phaser.Scene,
    cx: number,
    y: number,
    tier: number,
    t: ReturnType<typeof L>['seasonPass'],
  ): void {
    const unlocked = this.state.seasonPass.getTier() >= tier;
    const tierLabel = scene.add
      .text(cx - 300, y, `${tier}`, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: unlocked ? '#fff8e1' : '#6d4c41',
      })
      .setOrigin(0.5);
    this.listContainer?.add(tierLabel);

    this.renderRewardCell(scene, cx - 140, y, tier, 'free', t);
    this.renderRewardCell(scene, cx + 140, y, tier, 'premium', t);
  }

  private renderRewardCell(
    scene: Phaser.Scene,
    x: number,
    y: number,
    tier: number,
    track: 'free' | 'premium',
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
      .rectangle(x, y, 220, ROW_H - 4, bgColor, claimed ? 0.55 : 0.9)
      .setStrokeStyle(1, track === 'premium' ? 0xffca28 : 0x8d6e63, 0.55);
    this.listContainer?.add(cell);

    const text = scene.add
      .text(x, y, label, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '13px',
        color: claimed ? '#a5d6a7' : '#fff8e1',
      })
      .setOrigin(0.5);
    this.listContainer?.add(text);

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
    this.listContainer = null;
    this.sceneRef = null;
    const cb = this.onClose;
    this.onClose = null;
    cb?.();
  }

  isVisible(): boolean {
    return this.overlay !== null;
  }
}
