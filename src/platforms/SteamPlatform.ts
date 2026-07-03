import type { PlatformAdapter, ShareResult } from './types';

/** Stub for future Steam/Electron wrapper integration. */
export class SteamPlatform implements PlatformAdapter {
  async init(): Promise<void> {
    console.info('[Platform:Steam] Stub — wire Electron + Steamworks here');
  }

  gameReady(): void {
    console.info('[Platform:Steam] Game ready (stub)');
  }

  async showInterstitialAd(): Promise<boolean> {
    console.info('[Platform:Steam] Interstitial not applicable on Steam');
    return false;
  }

  async showRewardedAd(rewardType: string): Promise<boolean> {
    console.info(`[Platform:Steam] Rewarded ad stub: ${rewardType}`);
    return false;
  }

  async saveToCloud(data: string): Promise<void> {
    console.info('[Platform:Steam] Cloud save stub', data.length, 'bytes');
  }

  async loadFromCloud(): Promise<string | null> {
    console.info('[Platform:Steam] Cloud load stub');
    return null;
  }

  async getPlayerName(): Promise<string> {
    return 'Steam Player';
  }

  async shareGame(text: string): Promise<ShareResult> {
    console.info('[Platform:Steam] Share stub:', text);
    return 'none';
  }

  isMobile(): boolean {
    return false;
  }
}
