import type { GameSaveData } from '../types';
import { platformManager } from '../../platforms/PlatformManager';
import { platformConfig } from '../../platforms/PlatformConfig';

const SAVE_KEY = 'cockroach-life-save-v1';

export class SaveSystem {
  private arcadeHighScores: Record<string, number> = {};
  private totalPlayTime = 0;

  load(): GameSaveData | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return this.parseSave(raw);
    } catch {
      return null;
    }
  }

  async loadAsync(): Promise<GameSaveData | null> {
    if (platformConfig.isFeatureEnabled('enableCloudSave')) {
      try {
        const cloud = await platformManager.loadFromCloud();
        if (cloud) {
          const data = this.parseSave(cloud);
          if (data) {
            localStorage.setItem(SAVE_KEY, cloud);
            return data;
          }
        }
      } catch {
        console.warn('[SaveSystem] Cloud load failed, using local');
      }
    }
    return this.load();
  }

  save(data: GameSaveData): void {
    try {
      const json = JSON.stringify(data);
      localStorage.setItem(SAVE_KEY, json);
      this.arcadeHighScores = data.arcadeHighScores;
      this.totalPlayTime = data.totalPlayTime;
      if (platformConfig.isFeatureEnabled('enableCloudSave')) {
        void platformManager.saveToCloud(json);
      }
    } catch {
      console.warn('Save failed');
    }
  }

  getArcadeHighScores(): Record<string, number> {
    return { ...this.arcadeHighScores };
  }

  setHighScores(scores: Record<string, number>): void {
    this.arcadeHighScores = { ...scores };
  }

  getTotalPlayTime(): number {
    return this.totalPlayTime;
  }

  setTotalPlayTime(seconds: number): void {
    this.totalPlayTime = seconds;
  }

  clear(): void {
    localStorage.removeItem(SAVE_KEY);
    this.arcadeHighScores = {};
    this.totalPlayTime = 0;
  }

  private parseSave(raw: string): GameSaveData | null {
    try {
      const data = JSON.parse(raw) as GameSaveData;
      this.arcadeHighScores = data.arcadeHighScores ?? {};
      this.totalPlayTime = data.totalPlayTime ?? 0;
      return data;
    } catch {
      return null;
    }
  }
}
