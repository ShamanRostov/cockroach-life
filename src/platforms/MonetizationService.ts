import { platformManager } from './PlatformManager';
import { platformConfig } from './PlatformConfig';
import { iapService } from './IAPService';
import { GameState } from '../game/GameState';
import { AnalyticsService } from './AnalyticsService';
import {
  INTERSTITIAL_EVERY_N_ARCADES,
  MIN_INTERSTITIAL_INTERVAL_MS,
} from '../game/systems/GameBalance';

const INTERSTITIAL_EVERY = INTERSTITIAL_EVERY_N_ARCADES;
const MIN_INTERSTITIAL_MS = MIN_INTERSTITIAL_INTERVAL_MS;

export type RewardType = 'double_loot' | 'extra_energy' | 'speed_build';

class MonetizationServiceImpl {
  private arcadeCompletions = 0;
  private lastInterstitialAt = 0;

  /** Call when an arcade run finishes (win or lose). May show interstitial. */
  async onArcadeComplete(sceneKey: string): Promise<void> {
    if (!platformConfig.isFeatureEnabled('enableAds')) return;
    if (this.hasRemoveAds()) return;

    this.arcadeCompletions += 1;

    if (this.arcadeCompletions % INTERSTITIAL_EVERY !== 0) return;
    if (Date.now() - this.lastInterstitialAt < MIN_INTERSTITIAL_MS) return;

    const shown = await platformManager.showInterstitialAd();
    if (shown) {
      this.lastInterstitialAt = Date.now();
      AnalyticsService.getInstance().trackAdShown('interstitial');
      console.info(`[Monetization] Interstitial after ${sceneKey}`);
    }
  }

  /** Offer a rewarded ad; runs onSuccess if the user earns the reward. */
  async offerRewardedBonus(type: RewardType, onSuccess: () => void): Promise<void> {
    if (!platformConfig.isFeatureEnabled('enableAds')) return;

    const watched = await platformManager.showRewardedAd(type);
    if (watched) {
      AnalyticsService.getInstance().trackAdRewarded();
      AnalyticsService.getInstance().trackAdShown('rewarded');
      onSuccess();
    }
  }

  private hasRemoveAds(): boolean {
    return (
      iapService.isPurchased('remove_ads') ||
      GameState.getInstance().getPurchasedProducts().includes('remove_ads')
    );
  }
}

export const monetizationService = new MonetizationServiceImpl();
