export interface DailyBonusRewards {
  food: number;
  money: number;
}

export interface DailyBonusStatus {
  available: boolean;
  streak: number;
  rewards: DailyBonusRewards;
}

const BONUS_TABLE: DailyBonusRewards[] = [
  { food: 0, money: 0 },
  { food: 50, money: 0 },
  { food: 75, money: 25 },
  { food: 100, money: 50 },
  { food: 150, money: 75 },
  { food: 200, money: 100 },
  { food: 300, money: 150 },
  { food: 500, money: 200 },
];

function localDateString(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function yesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return localDateString(d);
}

export class DailyBonusSystem {
  lastLoginDate = '';
  loginStreak = 0;
  claimedDailyBonus = false;

  load(data: {
    lastLoginDate?: string;
    loginStreak?: number;
    claimedDailyBonus?: boolean;
  }): void {
    this.lastLoginDate = data.lastLoginDate ?? '';
    this.loginStreak = data.loginStreak ?? 0;
    this.claimedDailyBonus = data.claimedDailyBonus ?? false;
    this.processLogin();
  }

  /** Update streak on first visit of the day (local midnight reset). */
  processLogin(): void {
    const today = localDateString();
    if (this.lastLoginDate === today) return;

    const yesterday = yesterdayString();
    if (this.lastLoginDate === yesterday) {
      this.loginStreak = this.loginStreak >= 7 ? 1 : this.loginStreak + 1;
    } else if (this.lastLoginDate) {
      this.loginStreak = 1;
    } else {
      this.loginStreak = 1;
    }

    this.lastLoginDate = today;
    this.claimedDailyBonus = false;
  }

  getRewardsForStreak(streak: number): DailyBonusRewards {
    const day = Math.min(Math.max(streak, 1), 7);
    return { ...BONUS_TABLE[day] };
  }

  checkDailyBonus(): DailyBonusStatus {
    this.processLogin();
    const streak = Math.max(this.loginStreak, 1);
    return {
      available: !this.claimedDailyBonus,
      streak,
      rewards: this.getRewardsForStreak(streak),
    };
  }

  claimDailyBonus(): DailyBonusRewards | null {
    const status = this.checkDailyBonus();
    if (!status.available) return null;

    this.claimedDailyBonus = true;
    if (this.loginStreak >= 7) {
      this.loginStreak = 0;
    }
    return { ...status.rewards };
  }

  getStreak(): number {
    return Math.max(this.loginStreak, 1);
  }
}
