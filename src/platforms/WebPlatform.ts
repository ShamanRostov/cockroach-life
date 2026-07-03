import type { PlatformAdapter, ShareResult } from './types';

const CLOUD_KEY = 'cockroach-life-cloud-v1';

export class WebPlatform implements PlatformAdapter {
  async init(): Promise<void> {
    console.info('[Platform:Web] Standalone web mode');
  }

  gameReady(): void {
    console.info('[Platform:Web] Game ready');
  }

  async showInterstitialAd(): Promise<boolean> {
    console.info('[Platform:Web] Interstitial ad (simulated)');
    await new Promise((r) => setTimeout(r, 100));
    return true;
  }

  async showRewardedAd(rewardType: string): Promise<boolean> {
    console.info(`[Platform:Web] Rewarded ad mock success: ${rewardType}`);
    return true;
  }

  async saveToCloud(data: string): Promise<void> {
    try {
      localStorage.setItem(CLOUD_KEY, data);
    } catch {
      console.warn('[Platform:Web] Cloud save failed');
    }
  }

  async loadFromCloud(): Promise<string | null> {
    try {
      return localStorage.getItem(CLOUD_KEY);
    } catch {
      return null;
    }
  }

  async getPlayerName(): Promise<string> {
    return 'Player';
  }

  async shareGame(text: string): Promise<ShareResult> {
    if (navigator.share) {
      try {
        await navigator.share({ text, title: 'Cockroach Life' });
        return 'native';
      } catch {
        // user cancelled or unsupported
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      return 'clipboard';
    } catch {
      console.info('[Platform:Web] Share:', text);
      return 'none';
    }
  }

  isMobile(): boolean {
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  }
}
