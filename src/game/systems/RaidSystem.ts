import type { MapPlayer, RaidResult, TrapType } from '../types';
import type { PlacedRoom } from '../types';
import {
  localDateString,
  MAX_RAIDS_PER_DAY,
  MAX_RAID_ENERGY,
  RAID_SHIELD_HOURS,
  LOOT_FOOD_CAP,
  LOOT_MONEY_CAP,
  RAID_POWER_BASE,
  RAID_POWER_PER_LEVEL,
  RAID_POWER_FLAT,
  RAID_SUCCESS_THRESHOLD,
  RAID_WIN_RATING_BASE,
  RAID_WIN_RATING_SCALE,
  RAID_LOSS_RATING_BASE,
  RAID_LOSS_RATING_SCALE,
} from './GameBalance';

const MAX_ENERGY = MAX_RAID_ENERGY;
const SHIELD_HOURS = RAID_SHIELD_HOURS;

export class RaidSystem {
  raidEnergy = 3;
  raidsToday = 0;
  lastRaidDay = '';
  shieldUntil = 0;
  defenseTraps: TrapType[] = ['slipper'];
  playerDistrict = 'plinth';
  raidRating = 1000;
  raidWins = 0;

  currentTarget: MapPlayer | null = null;

  load(data: {
    raidEnergy: number;
    raidsToday: number;
    lastRaidDay: string;
    shieldUntil: number;
    defenseTraps: TrapType[];
    playerDistrict: string;
    raidRating: number;
    raidWins: number;
  }): void {
    this.raidEnergy = data.raidEnergy;
    this.raidsToday = data.raidsToday;
    this.lastRaidDay = data.lastRaidDay;
    this.shieldUntil = data.shieldUntil;
    this.defenseTraps = [...data.defenseTraps];
    this.playerDistrict = data.playerDistrict;
    this.raidRating = data.raidRating;
    this.raidWins = data.raidWins;
    this.refreshDailyRaids();
  }

  refreshDailyRaids(): void {
    const today = localDateString();
    if (this.lastRaidDay !== today) {
      this.raidsToday = 0;
      this.raidEnergy = MAX_ENERGY;
      this.lastRaidDay = today;
    }
  }

  calcPower(rooms: PlacedRoom[]): number {
    if (rooms.length === 0) return RAID_POWER_BASE;
    return rooms.reduce((s, r) => s + r.level * RAID_POWER_PER_LEVEL + RAID_POWER_FLAT, 0);
  }

  canRaid(target: MapPlayer): string | null {
    this.refreshDailyRaids();
    if (this.raidEnergy <= 0) return 'noEnergy';
    if (this.raidsToday >= MAX_RAIDS_PER_DAY) return 'dailyLimit';
    if (target.shieldUntil > Date.now()) return 'shielded';
    if (target.id === 'player') return 'self';
    return null;
  }

  startRaid(target: MapPlayer): boolean {
    if (this.canRaid(target)) return false;
    this.raidEnergy -= 1;
    this.raidsToday += 1;
    this.currentTarget = {
      ...target,
      rooms: target.rooms.map((r) => ({ ...r })),
      traps: [...target.traps],
    };
    return true;
  }

  applyRaidResult(result: RaidResult, target: MapPlayer): MapPlayer {
    const updated = {
      ...target,
      rooms: target.rooms.map((r) => ({ ...r })),
      food: target.food,
      money: target.money,
    };
    if (result.success) {
      updated.food = Math.max(0, updated.food - result.foodStolen);
      updated.money = Math.max(0, updated.money - result.moneyStolen);
      updated.shieldUntil = Date.now() + SHIELD_HOURS * 3600 * 1000;
      this.raidWins += 1;
      this.raidRating += result.ratingChange;
    } else {
      this.raidRating = Math.max(0, this.raidRating + result.ratingChange);
    }
    this.currentTarget = null;
    return updated;
  }

  computeLoot(
    target: MapPlayer,
    scores: { infiltrate: number; loot: number; escape: number },
    bonuses?: { lootMultiplier?: number; successBonus?: number },
  ): RaidResult {
    const lootMult = bonuses?.lootMultiplier ?? 0;
    const successBonus = bonuses?.successBonus ?? 0;
    const rawAvg = (scores.infiltrate + scores.loot + scores.escape) / 3;
    const avg = rawAvg * (1 + successBonus);
    const success = avg >= RAID_SUCCESS_THRESHOLD;
    const multiplier = avg / 100;

    const lootScale = 1 + lootMult;

    return {
      success,
      foodStolen: success ? Math.floor(target.food * LOOT_FOOD_CAP * multiplier * lootScale) : 0,
      moneyStolen: success ? Math.floor(target.money * LOOT_MONEY_CAP * multiplier * lootScale) : 0,
      ratingChange: success
        ? Math.floor(RAID_WIN_RATING_BASE + avg * RAID_WIN_RATING_SCALE)
        : -Math.floor(RAID_LOSS_RATING_BASE + (100 - avg) * RAID_LOSS_RATING_SCALE),
      phaseScores: scores,
    };
  }

  addEnergy(amount: number): void {
    this.raidEnergy += amount;
  }

  activateShield(hours: number): void {
    const ms = hours * 3600 * 1000;
    this.shieldUntil = Math.max(this.shieldUntil, Date.now()) + ms;
  }

  toggleTrap(trap: TrapType): void {
    const idx = this.defenseTraps.indexOf(trap);
    if (idx >= 0) {
      this.defenseTraps.splice(idx, 1);
    } else if (this.defenseTraps.length < 3) {
      this.defenseTraps.push(trap);
    }
  }
}

export { MAX_RAIDS_PER_DAY, MAX_ENERGY };
