import { platformManager } from './PlatformManager';

/** Yandex Games leaderboard technical names. */
export const LEADERBOARD_IDS = {
  SLIPPER_HIGHSCORE: 'slipper_highscore',
  RAID_RATING: 'raid_rating',
  COLONY_SIZE: 'colony_size',
} as const;

export type LeaderboardId = (typeof LEADERBOARD_IDS)[keyof typeof LEADERBOARD_IDS];

export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  isPlayer?: boolean;
}

export interface LeaderboardData {
  entries: LeaderboardEntry[];
  playerRank: number | null;
  playerScore: number | null;
}

interface YandexLeaderboardPlayer {
  publicName?: string;
}

interface YandexLeaderboardEntry {
  rank: number;
  score: number;
  player?: YandexLeaderboardPlayer;
}

interface YandexLeaderboardResponse {
  entries?: YandexLeaderboardEntry[];
  userRank?: number;
}

interface YandexLeaderboardsApi {
  setLeaderboardScore: (name: string, score: number, extra?: { extraData?: string }) => Promise<void>;
  getLeaderboardEntries: (
    name: string,
    options?: { quantityTop?: number; includeUser?: boolean; quantityAround?: number },
  ) => Promise<YandexLeaderboardResponse>;
}

const MOCK_STORAGE_PREFIX = 'cockroach-life-lb-';

const FAKE_NAMES = [
  'CrumbKing',
  'SlipperDodger',
  'NestMaster',
  'RaidBoss',
  'GlueTrap',
  'FridgeLord',
  'StoveRunner',
  'TrashHero',
  'CabinetCat',
  'SinkSquad',
];

class LeaderboardServiceImpl {
  private yandexLb: YandexLeaderboardsApi | null = null;
  private yandexReady = false;

  /** Bind Yandex leaderboards API after SDK init (no-op if unavailable). */
  async init(): Promise<void> {
    if (this.yandexReady) return;
    this.yandexReady = true;

    if (platformManager.getPlatform() !== 'yandex') return;
    if (typeof window === 'undefined' || !window.YaGames) return;

    try {
      const ysdk = await window.YaGames.init();
      if (ysdk.getLeaderboards) {
        this.yandexLb = (await ysdk.getLeaderboards()) as YandexLeaderboardsApi;
      }
    } catch (e) {
      console.warn('[LeaderboardService] Yandex init failed', e);
      this.yandexLb = null;
    }
  }

  async submitScore(boardId: LeaderboardId, score: number): Promise<void> {
    await this.init();
    const safeScore = Math.max(0, Math.floor(score));

    if (this.yandexLb) {
      try {
        await this.yandexLb.setLeaderboardScore(boardId, safeScore);
        return;
      } catch (e) {
        console.warn('[LeaderboardService] Yandex submit failed', e);
      }
    }

    this.saveMockPlayerScore(boardId, safeScore);
  }

  async getEntries(boardId: LeaderboardId, topN = 10): Promise<LeaderboardData> {
    await this.init();

    if (this.yandexLb) {
      try {
        const result = await this.yandexLb.getLeaderboardEntries(boardId, {
          quantityTop: topN,
          includeUser: true,
          quantityAround: 0,
        });
        return this.parseYandexEntries(result, topN);
      } catch (e) {
        console.warn('[LeaderboardService] Yandex fetch failed', e);
      }
    }

    return this.getMockEntries(boardId, topN);
  }

  async getPlayerRank(boardId: LeaderboardId): Promise<number | null> {
    const data = await this.getEntries(boardId, 10);
    return data.playerRank;
  }

  private parseYandexEntries(result: YandexLeaderboardResponse, topN: number): LeaderboardData {
    const entries: LeaderboardEntry[] = (result.entries ?? [])
      .slice(0, topN)
      .map((e) => ({
        rank: e.rank,
        name: e.player?.publicName || 'Player',
        score: e.score,
      }));

    const playerEntry = (result.entries ?? []).find((e) => e.rank === result.userRank);
    return {
      entries,
      playerRank: result.userRank ?? null,
      playerScore: playerEntry?.score ?? null,
    };
  }

  private mockKey(boardId: LeaderboardId): string {
    return `${MOCK_STORAGE_PREFIX}${boardId}`;
  }

  private saveMockPlayerScore(boardId: LeaderboardId, score: number): void {
    try {
      const raw = localStorage.getItem(this.mockKey(boardId));
      const prev = raw ? (JSON.parse(raw) as { playerScore?: number }).playerScore ?? 0 : 0;
      const best = Math.max(prev, score);
      localStorage.setItem(this.mockKey(boardId), JSON.stringify({ playerScore: best }));
    } catch {
      console.warn('[LeaderboardService] Mock save failed');
    }
  }

  private loadMockPlayerScore(boardId: LeaderboardId): number {
    try {
      const raw = localStorage.getItem(this.mockKey(boardId));
      if (!raw) return 0;
      return (JSON.parse(raw) as { playerScore?: number }).playerScore ?? 0;
    } catch {
      return 0;
    }
  }

  private scoreRange(boardId: LeaderboardId): { min: number; max: number } {
    switch (boardId) {
      case LEADERBOARD_IDS.SLIPPER_HIGHSCORE:
        return { min: 120, max: 2800 };
      case LEADERBOARD_IDS.RAID_RATING:
        return { min: 850, max: 1850 };
      case LEADERBOARD_IDS.COLONY_SIZE:
        return { min: 2, max: 18 };
      default:
        return { min: 100, max: 1000 };
    }
  }

  private getMockEntries(boardId: LeaderboardId, topN: number): LeaderboardData {
    const { min, max } = this.scoreRange(boardId);
    const playerScore = this.loadMockPlayerScore(boardId);
    const playerName = 'You';

    const fakeScores = FAKE_NAMES.slice(0, topN).map((name, i) => {
      const t = (topN - i) / topN;
      const score = Math.floor(min + (max - min) * (0.55 + t * 0.45) + (i % 3) * 17);
      return { name, score };
    });

    fakeScores.sort((a, b) => b.score - a.score);

    const all: { name: string; score: number; isPlayer?: boolean }[] = [...fakeScores];
    if (playerScore > 0) {
      all.push({ name: playerName, score: playerScore, isPlayer: true });
    }
    all.sort((a, b) => b.score - a.score);

    const entries: LeaderboardEntry[] = all.slice(0, topN).map((e, i) => ({
      rank: i + 1,
      name: e.name,
      score: e.score,
      isPlayer: e.isPlayer,
    }));

    const playerIdx = all.findIndex((e) => e.isPlayer);
    const playerRank = playerIdx >= 0 ? playerIdx + 1 : null;

    return {
      entries,
      playerRank,
      playerScore: playerScore > 0 ? playerScore : null,
    };
  }
}

export const leaderboardService = new LeaderboardServiceImpl();
