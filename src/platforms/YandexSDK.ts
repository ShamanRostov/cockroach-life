import type { PlatformAdapter, ShareResult } from './types';

declare global {
  interface Window {
    YaGames?: {
      init: (options?: { signed?: boolean }) => Promise<YandexSDKInstance>;
    };
  }
}

interface YandexSDKInstance {
  features: {
    LoadingAPI?: { ready: () => void };
  };
  adv: {
    showFullscreenAdv: (options?: {
      callbacks?: {
        onOpen?: () => void;
        onClose?: (wasShown: boolean) => void;
        onError?: (error: unknown) => void;
      };
    }) => void;
    showRewardedVideo: (options?: {
      callbacks?: {
        onOpen?: () => void;
        onRewarded?: () => void;
        onClose?: () => void;
        onError?: (error: unknown) => void;
      };
    }) => void;
  };
  getPlayer: (options?: { signed?: boolean }) => Promise<YandexPlayer>;
  getLeaderboards?: () => Promise<YandexLeaderboards>;
  share?: (data: { text?: string }) => Promise<void>;
}

interface YandexPlayer {
  getName: () => string;
  getMode: () => string;
  getUniqueID: () => string;
  setData: (data: Record<string, unknown>, flush?: boolean) => Promise<void>;
  getData: (keys?: string[]) => Promise<Record<string, unknown>>;
}

interface YandexLeaderboards {
  setLeaderboardScore: (name: string, score: number) => Promise<void>;
  getLeaderboardEntries: (name: string) => Promise<unknown>;
}

const SAVE_DATA_KEY = 'gameSave';

export class YandexPlatform implements PlatformAdapter {
  private ysdk: YandexSDKInstance | null = null;
  private player: YandexPlayer | null = null;
  private leaderboards: YandexLeaderboards | null = null;

  async init(): Promise<void> {
    if (typeof window === 'undefined' || !window.YaGames) {
      console.info('[Platform:Yandex] YaGames SDK not found — using fallback behavior');
      return;
    }

    try {
      this.ysdk = await window.YaGames.init();
      console.info('[Platform:Yandex] SDK initialized');

      try {
        this.player = await this.ysdk.getPlayer({ signed: false });
      } catch (e) {
        console.warn('[Platform:Yandex] Player unavailable', e);
      }

      if (this.ysdk.getLeaderboards) {
        try {
          this.leaderboards = await this.ysdk.getLeaderboards();
          console.info('[Platform:Yandex] Leaderboards ready (stub hook)');
        } catch (e) {
          console.warn('[Platform:Yandex] Leaderboards unavailable', e);
        }
      }
    } catch (e) {
      console.warn('[Platform:Yandex] SDK init failed', e);
      this.ysdk = null;
    }
  }

  gameReady(): void {
    this.ysdk?.features.LoadingAPI?.ready();
    console.info('[Platform:Yandex] LoadingAPI.ready()');
  }

  async showInterstitialAd(): Promise<boolean> {
    if (!this.ysdk) return false;

    return new Promise((resolve) => {
      let settled = false;
      const finish = (shown: boolean) => {
        if (settled) return;
        settled = true;
        resolve(shown);
      };

      try {
        this.ysdk!.adv.showFullscreenAdv({
          callbacks: {
            onClose: (wasShown) => finish(wasShown),
            onError: () => finish(false),
          },
        });
      } catch {
        finish(false);
      }
    });
  }

  async showRewardedAd(_rewardType: string): Promise<boolean> {
    if (!this.ysdk) return false;

    return new Promise((resolve) => {
      let rewarded = false;
      let settled = false;
      const finish = (success: boolean) => {
        if (settled) return;
        settled = true;
        resolve(success);
      };

      try {
        this.ysdk!.adv.showRewardedVideo({
          callbacks: {
            onRewarded: () => {
              rewarded = true;
            },
            onClose: () => finish(rewarded),
            onError: () => finish(false),
          },
        });
      } catch {
        finish(false);
      }
    });
  }

  async saveToCloud(data: string): Promise<void> {
    if (!this.player) return;

    try {
      await this.player.setData({ [SAVE_DATA_KEY]: data }, true);
    } catch (e) {
      console.warn('[Platform:Yandex] Cloud save failed', e);
    }
  }

  async loadFromCloud(): Promise<string | null> {
    if (!this.player) return null;

    try {
      const data = await this.player.getData([SAVE_DATA_KEY]);
      const save = data[SAVE_DATA_KEY];
      return typeof save === 'string' ? save : null;
    } catch (e) {
      console.warn('[Platform:Yandex] Cloud load failed', e);
      return null;
    }
  }

  async getPlayerName(): Promise<string> {
    if (!this.player) return 'Player';
    try {
      const name = this.player.getName();
      return name || 'Player';
    } catch {
      return 'Player';
    }
  }

  async shareGame(text: string): Promise<ShareResult> {
    if (this.ysdk?.share) {
      try {
        await this.ysdk.share({ text });
        return 'native';
      } catch (e) {
        console.warn('[Platform:Yandex] Share failed', e);
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      return 'clipboard';
    } catch {
      console.info('[Platform:Yandex] Share fallback:', text);
      return 'none';
    }
  }

  isMobile(): boolean {
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  }

  /** Submit score to a named leaderboard (future use). */
  async submitLeaderboardScore(boardName: string, score: number): Promise<void> {
    if (!this.leaderboards) return;
    try {
      await this.leaderboards.setLeaderboardScore(boardName, score);
    } catch (e) {
      console.warn('[Platform:Yandex] Leaderboard submit failed', e);
    }
  }
}
