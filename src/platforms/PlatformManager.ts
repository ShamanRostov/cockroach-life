import type { PlatformAdapter, PlatformId, ShareResult } from './types';
import { YandexPlatform } from './YandexSDK';
import { WebPlatform } from './WebPlatform';
import { SteamPlatform } from './SteamPlatform';
import { OperatorPlatform } from './OperatorPlatform';
import { CrazyGamesPlatform } from './CrazyGamesPlatform';
import { platformConfig } from './PlatformConfig';
import { fmt, L } from '../i18n';
import { GameState } from '../game/GameState';

function detectPlatform(): PlatformId {
  if (typeof window === 'undefined') return 'web';

  const params = new URLSearchParams(window.location.search);
  const forced = params.get('platform');
  if (
    forced === 'steam' ||
    forced === 'operator' ||
    forced === 'web' ||
    forced === 'yandex' ||
    forced === 'crazygames'
  ) {
    return forced;
  }

  if (window.CrazyGames?.SDK) return 'crazygames';
  if (window.YaGames) return 'yandex';
  if ((window as unknown as { electron?: unknown }).electron) {
    return 'steam';
  }
  if (params.get('portal') || params.get('operator')) return 'operator';

  return 'web';
}

function createAdapter(platform: PlatformId): PlatformAdapter {
  switch (platform) {
    case 'yandex':
      return new YandexPlatform();
    case 'steam':
      return new SteamPlatform();
    case 'operator':
      return new OperatorPlatform();
    case 'crazygames':
      return new CrazyGamesPlatform();
    default:
      return new WebPlatform();
  }
}

class PlatformManagerImpl implements PlatformAdapter {
  private readonly platformId: PlatformId;
  private readonly adapter: PlatformAdapter;

  constructor() {
    this.platformId = detectPlatform();
    this.adapter = createAdapter(this.platformId);
    platformConfig.configure(this.platformId);
    console.info(`[PlatformManager] Detected: ${this.platformId}`);
  }

  init(): Promise<void> {
    return this.adapter.init();
  }

  gameReady(): void {
    this.adapter.gameReady();
  }

  gameplayStart(): void {
    this.adapter.gameplayStart?.();
  }

  gameplayStop(): void {
    this.adapter.gameplayStop?.();
  }

  happyTime(): void {
    this.adapter.happyTime?.();
  }

  showInterstitialAd(): Promise<boolean> {
    return this.adapter.showInterstitialAd();
  }

  showRewardedAd(rewardType: string): Promise<boolean> {
    return this.adapter.showRewardedAd(rewardType);
  }

  saveToCloud(data: string): Promise<void> {
    return this.adapter.saveToCloud(data);
  }

  loadFromCloud(): Promise<string | null> {
    return this.adapter.loadFromCloud();
  }

  getPlayerName(): Promise<string> {
    return this.adapter.getPlayerName();
  }

  shareGame(text: string): Promise<ShareResult> {
    return this.adapter.shareGame(text);
  }

  async shareRaidSuccess(foodStolen: number, rating?: number): Promise<ShareResult> {
    const state = GameState.getInstance();
    const raidRating = rating ?? state.raid.raidRating;
    const text = fmt(L().share.raidText, { food: foodStolen, rating: raidRating });
    return this.shareGame(text);
  }

  isMobile(): boolean {
    return this.adapter.isMobile();
  }

  getPlatform(): PlatformId {
    return this.platformId;
  }
}

export const platformManager = new PlatformManagerImpl();
