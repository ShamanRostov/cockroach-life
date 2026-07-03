export type SeasonPassXPSource = 'daily_quest' | 'raid' | 'arcade' | 'building';

export type SeasonPassRewardType =
  | 'food'
  | 'money'
  | 'energy'
  | 'shield'
  | 'skin';

export interface SeasonPassReward {
  type: SeasonPassRewardType;
  amount?: number;
  skinId?: CockroachSkinId;
}

export type CockroachSkinId = 'default' | 'golden' | 'neon' | 'zombie' | 'chef';

export interface SeasonPassTierDef {
  tier: number;
  free: SeasonPassReward;
  premium: SeasonPassReward;
}

export interface SeasonPassSaveData {
  seasonKey: string;
  xp: number;
  claimedFree: boolean[];
  claimedPremium: boolean[];
}

const TIER_COUNT = 15;
const XP_PER_TIER = 100;

const XP_AMOUNTS: Record<SeasonPassXPSource, number> = {
  daily_quest: 50,
  raid: 30,
  arcade: 20,
  building: 10,
};

export const SEASON_PASS_TIERS: SeasonPassTierDef[] = [
  { tier: 1, free: { type: 'food', amount: 50 }, premium: { type: 'food', amount: 200 } },
  { tier: 2, free: { type: 'money', amount: 30 }, premium: { type: 'money', amount: 150 } },
  { tier: 3, free: { type: 'energy', amount: 1 }, premium: { type: 'skin', skinId: 'neon' } },
  { tier: 4, free: { type: 'food', amount: 100 }, premium: { type: 'food', amount: 500 } },
  { tier: 5, free: { type: 'money', amount: 50 }, premium: { type: 'money', amount: 300 } },
  { tier: 6, free: { type: 'food', amount: 75 }, premium: { type: 'shield', amount: 12 } },
  { tier: 7, free: { type: 'money', amount: 75 }, premium: { type: 'food', amount: 750 } },
  { tier: 8, free: { type: 'energy', amount: 1 }, premium: { type: 'money', amount: 500 } },
  { tier: 9, free: { type: 'food', amount: 150 }, premium: { type: 'skin', skinId: 'golden' } },
  { tier: 10, free: { type: 'money', amount: 100 }, premium: { type: 'energy', amount: 3 } },
  { tier: 11, free: { type: 'food', amount: 200 }, premium: { type: 'food', amount: 1000 } },
  { tier: 12, free: { type: 'money', amount: 150 }, premium: { type: 'money', amount: 750 } },
  { tier: 13, free: { type: 'energy', amount: 2 }, premium: { type: 'skin', skinId: 'zombie' } },
  { tier: 14, free: { type: 'food', amount: 300 }, premium: { type: 'shield', amount: 24 } },
  {
    tier: 15,
    free: { type: 'money', amount: 250 },
    premium: { type: 'skin', skinId: 'chef' },
  },
];

export const COCKROACH_SKIN_TINTS: Record<CockroachSkinId, number | null> = {
  default: null,
  golden: 0xffd54f,
  neon: 0x00e5ff,
  zombie: 0x8bc34a,
  chef: 0xffffff,
};

export function currentSeasonKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function daysRemainingInSeason(date = new Date()): number {
  const year = date.getFullYear();
  const month = date.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  return lastDay - date.getDate() + 1;
}

function emptyClaims(): boolean[] {
  return Array.from({ length: TIER_COUNT }, () => false);
}

export class SeasonPassSystem {
  private seasonKey = currentSeasonKey();
  private xp = 0;
  private claimedFree = emptyClaims();
  private claimedPremium = emptyClaims();
  private isPremiumFlag = false;

  load(data: SeasonPassSaveData | undefined, premiumPurchased: boolean): void {
    this.checkSeasonReset();
    if (!data) return;

    if (data.seasonKey === this.seasonKey) {
      this.xp = data.xp ?? 0;
      this.claimedFree = this.normalizeClaims(data.claimedFree);
      this.claimedPremium = this.normalizeClaims(data.claimedPremium);
    }
    this.isPremiumFlag = premiumPurchased;
  }

  exportSave(): SeasonPassSaveData {
    return {
      seasonKey: this.seasonKey,
      xp: this.xp,
      claimedFree: [...this.claimedFree],
      claimedPremium: [...this.claimedPremium],
    };
  }

  checkSeasonReset(): void {
    const key = currentSeasonKey();
    if (key !== this.seasonKey) {
      this.seasonKey = key;
      this.xp = 0;
      this.claimedFree = emptyClaims();
      this.claimedPremium = emptyClaims();
    }
  }

  setPremium(active: boolean): void {
    this.isPremiumFlag = active;
  }

  isPremium(): boolean {
    return this.isPremiumFlag;
  }

  getXP(): number {
    return this.xp;
  }

  getSeasonKey(): string {
    return this.seasonKey;
  }

  getDaysRemaining(): number {
    return daysRemainingInSeason();
  }

  getTier(): number {
    return Math.min(TIER_COUNT, Math.floor(this.xp / XP_PER_TIER) + 1);
  }

  getTierProgress(): { current: number; needed: number; ratio: number } {
    const tier = this.getTier();
    if (tier >= TIER_COUNT) {
      return { current: XP_PER_TIER, needed: XP_PER_TIER, ratio: 1 };
    }
    const xpIntoTier = this.xp % XP_PER_TIER;
    return { current: xpIntoTier, needed: XP_PER_TIER, ratio: xpIntoTier / XP_PER_TIER };
  }

  addXP(source: SeasonPassXPSource): number {
    this.checkSeasonReset();
    const amount = XP_AMOUNTS[source];
    this.xp += amount;
    return amount;
  }

  getTierDef(tier: number): SeasonPassTierDef | undefined {
    return SEASON_PASS_TIERS.find((t) => t.tier === tier);
  }

  canClaim(tier: number, track: 'free' | 'premium'): boolean {
    if (tier < 1 || tier > TIER_COUNT) return false;
    if (this.getTier() < tier) return false;
    if (track === 'premium' && !this.isPremium()) return false;
    const claims = track === 'free' ? this.claimedFree : this.claimedPremium;
    return !claims[tier - 1];
  }

  claimReward(tier: number, track: 'free' | 'premium'): SeasonPassReward | null {
    if (!this.canClaim(tier, track)) return null;
    const def = this.getTierDef(tier);
    if (!def) return null;
    const reward = track === 'free' ? def.free : def.premium;
    if (track === 'free') {
      this.claimedFree[tier - 1] = true;
    } else {
      this.claimedPremium[tier - 1] = true;
    }
    return { ...reward };
  }

  isClaimed(tier: number, track: 'free' | 'premium'): boolean {
    const claims = track === 'free' ? this.claimedFree : this.claimedPremium;
    return claims[tier - 1] ?? false;
  }

  private normalizeClaims(claims: boolean[] | undefined): boolean[] {
    const out = emptyClaims();
    if (!claims) return out;
    for (let i = 0; i < TIER_COUNT; i++) {
      out[i] = claims[i] ?? false;
    }
    return out;
  }
}
