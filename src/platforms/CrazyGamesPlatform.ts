import type { PlatformAdapter, ShareResult } from './types';
import { SoundManager } from '../game/audio/SoundManager';

declare global {
  interface Window {
    CrazyGames?: {
      SDK: CrazyGamesSDK;
    };
  }
}

interface CrazyGamesSDK {
  init: () => Promise<void>;
  ad: {
    requestAd: (
      type: 'midgame' | 'rewarded',
      callbacks: {
        adStarted?: () => void;
        adFinished?: () => void;
        adError?: (error: unknown) => void;
      },
    ) => void;
  };
  game: {
    gameplayStart: () => void;
    gameplayStop: () => void;
    loadingStart?: () => void;
    loadingStop?: () => void;
    happytime?: () => void;
  };
  data?: {
    setItem: (key: string, value: string) => Promise<void>;
    getItem: (key: string) => Promise<string | null>;
    removeItem?: (key: string) => Promise<void>;
  };
  user?: {
    getUser: () => Promise<{ username?: string; profilePictureUrl?: string } | null>;
  };
}

const SAVE_KEY = 'cockroach-life-save';

/**
 * CrazyGames HTML5 SDK v3 adapter.
 * Docs: https://docs.crazygames.com/sdk/intro/
 */
export class CrazyGamesPlatform implements PlatformAdapter {
  private sdk: CrazyGamesSDK | null = null;
  private mutedByAd = false;

  async init(): Promise<void> {
    const sdk = window.CrazyGames?.SDK;
    if (!sdk) {
      console.info('[Platform:CrazyGames] SDK script missing — local fallback');
      return;
    }

    try {
      await sdk.init();
      this.sdk = sdk;
      this.sdk.game.loadingStart?.();
      console.info('[Platform:CrazyGames] SDK initialized');
    } catch (e) {
      console.warn('[Platform:CrazyGames] init failed', e);
      this.sdk = null;
    }
  }

  gameReady(): void {
    this.sdk?.game.loadingStop?.();
    console.info('[Platform:CrazyGames] loadingStop / game ready');
  }

  gameplayStart(): void {
    try {
      this.sdk?.game.gameplayStart();
    } catch (e) {
      console.warn('[Platform:CrazyGames] gameplayStart', e);
    }
  }

  gameplayStop(): void {
    try {
      this.sdk?.game.gameplayStop();
    } catch (e) {
      console.warn('[Platform:CrazyGames] gameplayStop', e);
    }
  }

  happyTime(): void {
    try {
      this.sdk?.game.happytime?.();
    } catch {
      // optional
    }
  }

  async showInterstitialAd(): Promise<boolean> {
    if (!this.sdk) return false;
    return this.requestAd('midgame');
  }

  async showRewardedAd(rewardType: string): Promise<boolean> {
    if (!this.sdk) {
      console.info(`[Platform:CrazyGames] Rewarded mock (no SDK): ${rewardType}`);
      return true;
    }
    return this.requestAd('rewarded');
  }

  private requestAd(type: 'midgame' | 'rewarded'): Promise<boolean> {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        this.unmuteAfterAd();
        resolve(ok);
      };

      try {
        this.sdk!.ad.requestAd(type, {
          adStarted: () => this.muteForAd(),
          adFinished: () => finish(true),
          adError: (err) => {
            console.warn(`[Platform:CrazyGames] ${type} ad error`, err);
            finish(false);
          },
        });
      } catch (e) {
        console.warn(`[Platform:CrazyGames] ${type} request failed`, e);
        finish(false);
      }
    });
  }

  private muteForAd(): void {
    const sm = SoundManager.getInstance();
    if (!sm.isMuted()) {
      sm.setMuted(true);
      this.mutedByAd = true;
    }
  }

  private unmuteAfterAd(): void {
    if (this.mutedByAd) {
      SoundManager.getInstance().setMuted(false);
      this.mutedByAd = false;
    }
  }

  async saveToCloud(data: string): Promise<void> {
    if (this.sdk?.data?.setItem) {
      try {
        await this.sdk.data.setItem(SAVE_KEY, data);
        return;
      } catch (e) {
        console.warn('[Platform:CrazyGames] data.setItem failed', e);
      }
    }
    try {
      localStorage.setItem(SAVE_KEY, data);
    } catch {
      // ignore
    }
  }

  async loadFromCloud(): Promise<string | null> {
    if (this.sdk?.data?.getItem) {
      try {
        return await this.sdk.data.getItem(SAVE_KEY);
      } catch (e) {
        console.warn('[Platform:CrazyGames] data.getItem failed', e);
      }
    }
    try {
      return localStorage.getItem(SAVE_KEY);
    } catch {
      return null;
    }
  }

  async getPlayerName(): Promise<string> {
    if (this.sdk?.user?.getUser) {
      try {
        const user = await this.sdk.user.getUser();
        if (user?.username) return user.username;
      } catch {
        // guest
      }
    }
    return 'Player';
  }

  async shareGame(text: string): Promise<ShareResult> {
    try {
      await navigator.clipboard.writeText(text);
      return 'clipboard';
    } catch {
      console.info('[Platform:CrazyGames] Share:', text);
      return 'none';
    }
  }

  isMobile(): boolean {
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  }
}
