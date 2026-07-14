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
import { iapService, type IAPProduct, type ProductId } from '../../platforms/IAPService';
import { monetizationService, type RewardType } from '../../platforms/MonetizationService';
import { DEPTH } from '../graphics/SceneDepth';
import { ModalLayer } from './ModalLayer';
import { platformConfig } from '../../platforms/PlatformConfig';

export class ShopPanel {
  private readonly state = GameState.getInstance();
  private modal = new ModalLayer();
  private overlay: Phaser.GameObjects.Rectangle | null = null;
  private container: Phaser.GameObjects.Container | null = null;
  private onClose: (() => void) | null = null;
  private buying = false;

  static isAvailable(): boolean {
    const features = platformConfig.features;
    return features.enableIAP || features.enableAds;
  }

  /** HUD toggle button (shop icon). */
  createHudButton(scene: Phaser.Scene): Phaser.GameObjects.Container | null {
    if (!ShopPanel.isAvailable()) return null;
    const btn = createTextButton(
      scene,
      getNestHudButtonX('shop'),
      getNestHudButtonY('shop'),
      '💰',
      () => this.show(scene),
      48,
      38,
    );
    btn.setDepth(DEPTH.hud + 12);
    return btn;
  }

  show(scene: Phaser.Scene, onClose?: () => void): void {
    this.modal.destroyAll();
    this.overlay = null;
    this.container = null;
    this.onClose = onClose ?? null;

    const t = L().shop;
    if (!ShopPanel.isAvailable()) {
      showToast(scene, t.unavailable);
      return;
    }
    const dual = scene.registry.get('screenshot.dualPanels') === true;
    const depth = dual ? 902 : 900;

    if (!dual) {
      this.overlay = this.modal.track(createModalOverlay(scene, depth));
      this.overlay.on('pointerdown', () => this.hide());
    }

    const panelW = dual ? 460 : 540;
    const panelH = dual ? 480 : 580;
    const cx = dual ? 970 : GAME_WIDTH / 2;
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

    const titleY = dual ? cy - 210 : cy - 262;
    const title = scene.add
      .text(cx, titleY, t.title, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: dual ? '22px' : '26px',
        color: '#fff8e1',
        stroke: '#5d2e00',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    this.container.add(title);

    const products = iapService.getProducts();
    const visibleProducts = dual ? products.slice(0, 4) : products;
    const rowStart = dual ? cy - 170 : cy - 210;
    const rowStep = dual ? 46 : 52;
    visibleProducts.forEach((product, i) => {
      this.renderProductRow(scene, cx, rowStart + i * rowStep, product, t, depth);
    });

    if (!dual) {
      const adY = cy + 100;
      const adHeader = scene.add
        .text(cx, adY, t.watchAdFor, {
          fontFamily: 'Segoe UI, Arial, sans-serif',
          fontSize: '18px',
          color: '#ffca28',
        })
        .setOrigin(0.5);
      this.container.add(adHeader);

      const rewards: { type: RewardType; label: string }[] = [
        { type: 'double_loot', label: t.rewardDoubleLoot },
        { type: 'extra_energy', label: t.rewardExtraEnergy },
        { type: 'speed_build', label: t.rewardSpeedBuild },
      ];

      rewards.forEach((r, i) => {
        this.modal.track(
          createTextButton(
            scene,
            cx,
            adY + 44 + i * 48,
            `📺 ${r.label}`,
            () => this.watchAd(scene, r.type),
            400,
            38,
          ).setDepth(depth + 3),
        );
      });
    }

    this.modal.track(
      createTextButton(
        scene,
        cx,
        dual ? cy + 210 : cy + 258,
        t.close,
        () => this.hide(),
        160,
        40,
      ).setDepth(depth + 3),
    );
  }

  private renderProductRow(
    scene: Phaser.Scene,
    cx: number,
    y: number,
    product: IAPProduct,
    t: ReturnType<typeof L>['shop'],
    depth: number,
  ): void {
    const name = t.products[product.id];
    const owned = this.isProductOwned(product.id);

    const row = scene.add
      .text(cx - 230, y, `${product.icon} ${name}`, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '14px',
        color: '#fff8e1',
      })
      .setOrigin(0, 0.5);
    this.container?.add(row);

    const priceText = scene.add
      .text(cx + 60, y, product.priceLabel, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '13px',
        color: '#bcaaa4',
      })
      .setOrigin(0.5);
    this.container?.add(priceText);

    if (owned) {
      const ownedLabel = scene.add
        .text(cx + 170, y, t.owned, {
          fontFamily: 'Segoe UI, Arial, sans-serif',
          fontSize: '13px',
          color: '#66bb6a',
        })
        .setOrigin(0.5);
      this.container?.add(ownedLabel);
    } else {
      this.modal.track(
        createTextButton(
          scene,
          cx + 170,
          y,
          t.buy,
          () => this.buyProduct(scene, product.id),
          90,
          32,
        ).setDepth(depth + 3),
      );
    }
  }

  private async buyProduct(scene: Phaser.Scene, productId: ProductId): Promise<void> {
    if (this.buying) return;
    this.buying = true;
    const t = L().shop;

    const success = await iapService.purchase(productId);
    this.buying = false;

    if (success) {
      this.state.applyIAPPurchase(productId);
      SoundManager.getInstance().playSFX('daily_bonus');
      showToast(scene, fmt(t.purchaseSuccess, { product: t.products[productId] }));
      this.hide();
      this.show(scene, this.onClose ?? undefined);
    } else {
      showToast(scene, t.purchaseFail);
    }
  }

  private watchAd(scene: Phaser.Scene, type: RewardType): void {
    const t = L().shop;
    void monetizationService.offerRewardedBonus(type, () => {
      this.state.activateRewardBonus(type);
      SoundManager.getInstance().playSFX('daily_bonus');
      showToast(scene, t.adRewardGranted);
    });
  }

  private isProductOwned(productId: ProductId): boolean {
    const nonConsumables: ProductId[] = ['remove_ads', 'season_pass_premium', 'skin_pack'];
    if (!nonConsumables.includes(productId)) return false;
    return (
      iapService.isPurchased(productId) ||
      this.state.getPurchasedProducts().includes(productId)
    );
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
