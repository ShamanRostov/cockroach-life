import type { DailyQuest, DailyQuestType } from '../types';

const QUEST_TYPES: DailyQuestType[] = ['build', 'arcade', 'raid', 'earn_food', 'earn_money'];

const QUEST_TARGETS: Record<DailyQuestType, number[]> = {
  build: [1, 2, 3],
  arcade: [1, 2, 3],
  raid: [1, 2],
  earn_food: [40, 60, 80],
  earn_money: [30, 50, 75],
};

const QUEST_BASE_REWARDS: Record<DailyQuestType, { food?: number; money?: number }> = {
  build: { food: 40, money: 20 },
  arcade: { food: 35 },
  raid: { food: 50, money: 40 },
  earn_food: { money: 30 },
  earn_money: { food: 35 },
};

function localDateString(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}


function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function scaleReward(
  base: { food?: number; money?: number },
  streak: number,
): { food?: number; money?: number } {
  const mult = 1 + Math.min(Math.max(streak, 1), 7) * 0.15;
  const reward: { food?: number; money?: number } = {};
  if (base.food) reward.food = Math.floor(base.food * mult);
  if (base.money) reward.money = Math.floor(base.money * mult);
  return reward;
}

export class DailyQuestSystem {
  dailyQuests: DailyQuest[] = [];
  dailyQuestsDate = '';

  private streakProvider: () => number = () => 1;

  setStreakProvider(fn: () => number): void {
    this.streakProvider = fn;
  }

  load(data: { dailyQuests?: DailyQuest[]; dailyQuestsDate?: string }): void {
    this.dailyQuests = (data.dailyQuests ?? []).map((q) => ({ ...q }));
    this.dailyQuestsDate = data.dailyQuestsDate ?? '';
    this.checkAndReset();
  }

  checkAndReset(): void {
    const today = localDateString();
    if (this.dailyQuestsDate === today && this.dailyQuests.length === 3) return;

    this.dailyQuestsDate = today;
    this.dailyQuests = this.generateQuests();
  }

  private generateQuests(): DailyQuest[] {
    const types = shuffle(QUEST_TYPES).slice(0, 3);
    const streak = this.streakProvider();

    return types.map((type, i) => {
      const targets = QUEST_TARGETS[type];
      const target = targets[Math.floor(Math.random() * targets.length)];
      return {
        id: `${this.dailyQuestsDate}-${type}-${i}`,
        type,
        target,
        progress: 0,
        reward: scaleReward(QUEST_BASE_REWARDS[type], streak),
        claimed: false,
      };
    });
  }

  trackProgress(type: DailyQuestType, amount: number): void {
    if (amount <= 0) return;
    this.checkAndReset();

    for (const quest of this.dailyQuests) {
      if (quest.type === type && !quest.claimed && quest.progress < quest.target) {
        quest.progress = Math.min(quest.target, quest.progress + amount);
      }
    }
  }

  claimQuest(id: string): { food?: number; money?: number } | null {
    const quest = this.dailyQuests.find((q) => q.id === id);
    if (!quest || quest.claimed || quest.progress < quest.target) return null;

    quest.claimed = true;
    return { ...quest.reward };
  }

  getActiveQuests(): DailyQuest[] {
    this.checkAndReset();
    return this.dailyQuests.map((q) => ({ ...q }));
  }

  allClaimed(): boolean {
    return this.dailyQuests.length > 0 && this.dailyQuests.every((q) => q.claimed);
  }
}
