import type { BreedingTimer, CockroachRole, CockroachUnit, PlacedRoom } from '../types';
import { generateCockroachName } from '../../i18n';
import {
  BREED_DURATION_MS,
  BREED_FOOD_COST,
  BREED_MONEY_COST,
  COCKROACH_MAX_LEVEL,
  COCKROACH_XP_PASSIVE_PER_SEC,
  COCKROACH_XP_PER_LEVEL,
  COCKROACH_XP_RAID_WIN,
  ROLE_BONUS_PER_LEVEL,
} from './GameBalance';

export type BreedErrorKey =
  | 'noNursery'
  | 'maxCapacity'
  | 'pendingBreed'
  | 'notEnoughResources';

export class BreedingSystem {
  private cockroaches: CockroachUnit[] = [];
  private breedingTimers: BreedingTimer[] = [];
  private maxCockroaches = 0;

  load(cockroaches: CockroachUnit[], maxCockroaches: number, breedingTimers: BreedingTimer[]): void {
    this.cockroaches = (cockroaches ?? []).map((c) => ({
      ...c,
      xp: c.xp ?? 0,
      level: Math.min(COCKROACH_MAX_LEVEL, Math.max(1, c.level ?? 1)),
    }));
    this.maxCockroaches = maxCockroaches ?? 0;
    this.breedingTimers = (breedingTimers ?? []).map((t) => ({ ...t }));
  }

  getCockroaches(): CockroachUnit[] {
    return this.cockroaches.map((c) => ({ ...c }));
  }

  getBreedingTimers(): BreedingTimer[] {
    return this.breedingTimers.map((t) => ({ ...t }));
  }

  getMaxCockroaches(rooms: PlacedRoom[]): number {
    const nurseryLevel = this.getNurseryLevel(rooms);
    return nurseryLevel * 2;
  }

  hasNursery(rooms: PlacedRoom[]): boolean {
    return rooms.some((r) => r.type === 'nursery');
  }

  getNurseryLevel(rooms: PlacedRoom[]): number {
    return rooms
      .filter((r) => r.type === 'nursery')
      .reduce((max, r) => Math.max(max, r.level), 0);
  }

  /** Total fractional bonus from all cockroaches of a role (e.g. 0.3 = +30%). */
  getRoleBonus(role: CockroachRole): number {
    return this.cockroaches
      .filter((c) => c.role === role)
      .reduce((sum, c) => sum + c.level * ROLE_BONUS_PER_LEVEL[role], 0);
  }

  getBreedCost(): { food: number; money: number } {
    return { food: BREED_FOOD_COST, money: BREED_MONEY_COST };
  }

  getBreedDurationMs(): number {
    return BREED_DURATION_MS;
  }

  /** Passive XP while colony is active in the nest. Returns names of roaches that leveled up. */
  tickGrowth(dt: number): string[] {
    const leveled: string[] = [];
    for (const roach of this.cockroaches) {
      roach.xp = (roach.xp ?? 0) + COCKROACH_XP_PASSIVE_PER_SEC[roach.role] * dt;
      if (this.tryLevelUp(roach)) {
        leveled.push(roach.name);
      }
    }
    return leveled;
  }

  /** Grant raid XP to matching roles after a successful raid. */
  grantRaidXP(): string[] {
    const leveled: string[] = [];
    for (const roach of this.cockroaches) {
      roach.xp = (roach.xp ?? 0) + COCKROACH_XP_RAID_WIN[roach.role];
      if (this.tryLevelUp(roach)) {
        leveled.push(roach.name);
      }
    }
    return leveled;
  }

  private tryLevelUp(roach: CockroachUnit): boolean {
    if (roach.level >= COCKROACH_MAX_LEVEL) return false;
    const needed = roach.level * COCKROACH_XP_PER_LEVEL;
    if ((roach.xp ?? 0) < needed) return false;
    roach.level += 1;
    return true;
  }

  canBreed(role: CockroachRole, rooms: PlacedRoom[], food: number, money: number): BreedErrorKey | null {
    if (!this.hasNursery(rooms)) return 'noNursery';
    const cap = this.getMaxCockroaches(rooms);
    if (this.cockroaches.length + this.breedingTimers.length >= cap) return 'maxCapacity';
    if (this.breedingTimers.some((t) => t.role === role)) return 'pendingBreed';
    if (food < BREED_FOOD_COST || money < BREED_MONEY_COST) return 'notEnoughResources';
    return null;
  }

  breed(
    role: CockroachRole,
    rooms: PlacedRoom[],
    food: number,
    money: number,
    spend: (money: number, food: number) => boolean,
  ): boolean {
    const err = this.canBreed(role, rooms, food, money);
    if (err) return false;
    if (!spend(BREED_MONEY_COST, BREED_FOOD_COST)) return false;

    this.breedingTimers.push({
      id: `breed-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      role,
      finishAt: Date.now() + BREED_DURATION_MS,
    });
    return true;
  }

  /** Complete finished timers; returns newly hatched cockroaches. */
  updateTimers(now = Date.now()): CockroachUnit[] {
    const hatched: CockroachUnit[] = [];
    const remaining: BreedingTimer[] = [];

    for (const timer of this.breedingTimers) {
      if (timer.finishAt <= now) {
        const unit: CockroachUnit = {
          id: `roach-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: generateCockroachName(),
          level: 1,
          role: timer.role,
          xp: 0,
        };
        this.cockroaches.push(unit);
        hatched.push(unit);
      } else {
        remaining.push(timer);
      }
    }

    this.breedingTimers = remaining;
    return hatched;
  }

  syncMaxCapacity(rooms: PlacedRoom[]): void {
    this.maxCockroaches = this.getMaxCockroaches(rooms);
  }

  getStoredMaxCapacity(): number {
    return this.maxCockroaches;
  }
}
