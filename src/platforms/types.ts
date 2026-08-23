export type PlatformId = 'yandex' | 'web' | 'steam' | 'operator' | 'crazygames';

/** How share was delivered to the user. */
export type ShareResult = 'native' | 'clipboard' | 'none';

export interface PlatformAdapter {
  init(): Promise<void>;
  gameReady(): void;
  showInterstitialAd(): Promise<boolean>;
  showRewardedAd(rewardType: string): Promise<boolean>;
  saveToCloud(data: string): Promise<void>;
  loadFromCloud(): Promise<string | null>;
  getPlayerName(): Promise<string>;
  shareGame(text: string): Promise<ShareResult>;
  isMobile(): boolean;
  /** Optional CrazyGames / portal gameplay telemetry. */
  gameplayStart?(): void;
  gameplayStop?(): void;
  happyTime?(): void;
}
