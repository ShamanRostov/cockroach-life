import { platformManager } from './PlatformManager';
import { platformConfig } from './PlatformConfig';
import { AnalyticsService } from './AnalyticsService';

export type ProductId =
  | 'food_pack_small'
  | 'food_pack_large'
  | 'money_pack'
  | 'shield_24h'
  | 'energy_refill'
  | 'remove_ads'
  | 'season_pass_premium'
  | 'skin_pack';

export interface IAPProduct {
  id: ProductId;
  icon: string;
  priceLabel: string;
  consumable: boolean;
}

interface YandexPayments {
  getCatalog: () => Promise<YandexCatalogItem[]>;
  purchase: (options: { id: string }) => Promise<YandexPurchase>;
  getPurchases: () => Promise<YandexPurchase[]>;
  consumePurchase: (purchaseToken: string) => Promise<void>;
}

interface YandexCatalogItem {
  id: string;
  title?: string;
  price?: string;
  priceValue?: string;
}

interface YandexPurchase {
  productID: string;
  purchaseToken: string;
}

interface YandexSDKWithPayments {
  getPayments: (options?: { signed?: boolean }) => Promise<YandexPayments>;
}

const DEFAULT_PRICES: Record<ProductId, string> = {
  food_pack_small: '$0.99',
  food_pack_large: '$2.99',
  money_pack: '$1.99',
  shield_24h: '$0.99',
  energy_refill: '$0.99',
  remove_ads: '$4.99',
  season_pass_premium: '$2.99',
  skin_pack: '$1.99',
};

const PRODUCT_ICONS: Record<ProductId, string> = {
  food_pack_small: '🍞',
  food_pack_large: '🍞🍞',
  money_pack: '💰',
  shield_24h: '🛡',
  energy_refill: '⚡',
  remove_ads: '🚫📺',
  season_pass_premium: '🎫',
  skin_pack: '🪳',
};

const NON_CONSUMABLES: ReadonlySet<ProductId> = new Set([
  'remove_ads',
  'season_pass_premium',
  'skin_pack',
]);

const CATALOG_IDS: ProductId[] = [
  'food_pack_small',
  'food_pack_large',
  'money_pack',
  'shield_24h',
  'energy_refill',
  'remove_ads',
  'season_pass_premium',
  'skin_pack',
];

class IAPServiceImpl {
  private payments: YandexPayments | null = null;
  private catalogPrices = new Map<ProductId, string>();
  private purchasedNonConsumables = new Set<ProductId>();
  private initialized = false;

  async init(savedPurchases: string[] = []): Promise<void> {
    for (const id of savedPurchases) {
      if (this.isProductId(id) && NON_CONSUMABLES.has(id)) {
        this.purchasedNonConsumables.add(id);
      }
    }

    if (platformManager.getPlatform() === 'yandex' && platformConfig.isFeatureEnabled('enableIAP')) {
      await this.initYandexPayments();
    }

    this.initialized = true;
  }

  private async initYandexPayments(): Promise<void> {
    try {
      const ysdk = await this.getYandexSDK();
      if (!ysdk?.getPayments) return;

      this.payments = await ysdk.getPayments({ signed: false });
      const catalog = await this.payments.getCatalog();
      for (const item of catalog) {
        if (this.isProductId(item.id) && item.price) {
          this.catalogPrices.set(item.id, item.price);
        }
      }
      console.info('[IAP] Yandex payments ready, catalog:', catalog.length);
    } catch (e) {
      console.warn('[IAP] Yandex payments unavailable', e);
      this.payments = null;
    }
  }

  private async getYandexSDK(): Promise<YandexSDKWithPayments | null> {
    if (typeof window === 'undefined' || !window.YaGames) return null;
    try {
      return (await window.YaGames.init()) as unknown as YandexSDKWithPayments;
    } catch {
      return null;
    }
  }

  private isProductId(id: string): id is ProductId {
    return (CATALOG_IDS as string[]).includes(id);
  }

  getProducts(): IAPProduct[] {
    return CATALOG_IDS.map((id) => ({
      id,
      icon: PRODUCT_ICONS[id],
      priceLabel: this.catalogPrices.get(id) ?? DEFAULT_PRICES[id],
      consumable: !NON_CONSUMABLES.has(id),
    }));
  }

  isPurchased(productId: ProductId): boolean {
    if (NON_CONSUMABLES.has(productId)) {
      return this.purchasedNonConsumables.has(productId);
    }
    return false;
  }

  async purchase(productId: ProductId): Promise<boolean> {
    if (!platformConfig.isFeatureEnabled('enableIAP')) {
      AnalyticsService.getInstance().trackPurchaseFailed(productId, 'iap_disabled');
      return false;
    }

    AnalyticsService.getInstance().trackPurchaseStarted(productId);

    if (NON_CONSUMABLES.has(productId) && this.isPurchased(productId)) {
      AnalyticsService.getInstance().trackPurchaseFailed(productId, 'already_owned');
      return false;
    }

    try {
      let success = false;

      if (this.payments) {
        success = await this.purchaseViaYandex(productId);
      } else {
        success = await this.purchaseMock(productId);
      }

      if (success) {
        if (NON_CONSUMABLES.has(productId)) {
          this.purchasedNonConsumables.add(productId);
        }
        AnalyticsService.getInstance().trackPurchaseComplete(productId);
      } else {
        AnalyticsService.getInstance().trackPurchaseFailed(productId, 'cancelled');
      }

      return success;
    } catch (e) {
      const reason = e instanceof Error ? e.message : 'error';
      AnalyticsService.getInstance().trackPurchaseFailed(productId, reason);
      console.warn('[IAP] Purchase failed', productId, e);
      return false;
    }
  }

  private async purchaseViaYandex(productId: ProductId): Promise<boolean> {
    if (!this.payments) return false;

    const purchase = await this.payments.purchase({ id: productId });

    if (!purchase?.purchaseToken) return false;

    if (!NON_CONSUMABLES.has(productId)) {
      try {
        await this.payments.consumePurchase(purchase.purchaseToken);
      } catch (e) {
        console.warn('[IAP] consumePurchase failed', e);
      }
    }

    return true;
  }

  private async purchaseMock(productId: ProductId): Promise<boolean> {
    console.info(`[IAP] Mock purchase: ${productId} (${DEFAULT_PRICES[productId]})`);
    await new Promise((r) => setTimeout(r, 150));
    return true;
  }

  async restorePurchases(): Promise<ProductId[]> {
    const restored: ProductId[] = [];

    if (this.payments) {
      try {
        const purchases = await this.payments.getPurchases();
        for (const p of purchases) {
          if (this.isProductId(p.productID) && NON_CONSUMABLES.has(p.productID)) {
            this.purchasedNonConsumables.add(p.productID);
            restored.push(p.productID);
          }
        }
      } catch (e) {
        console.warn('[IAP] restorePurchases failed', e);
      }
    }

    return restored;
  }

  getPurchasedNonConsumables(): ProductId[] {
    return [...this.purchasedNonConsumables];
  }

  isReady(): boolean {
    return this.initialized;
  }
}

export const iapService = new IAPServiceImpl();
