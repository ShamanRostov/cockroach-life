import type { DailyQuestType } from '../types';
import type { CockroachRole } from '../types';
import type { RoomType } from './BuildingSystem';
import type { LiveOpsMultiplierType } from './LiveOpsSystem';
import type { ProductId } from '../../platforms/IAPService';

/** Local calendar date (YYYY-MM-DD) for daily resets at midnight. */
export function localDateString(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ── Starting economy ──────────────────────────────────────────────────────────

export const STARTING_FOOD = 50;
export const STARTING_MONEY = 100;
export const STARTING_HEALTH = 100;
export const STARTING_MAX_HEALTH = 100;

// ── Nest economy ──────────────────────────────────────────────────────────────

export const NEST_FOOD_DRAIN_RATE = 0.045;
export const STARVATION_DAMAGE_RATE = 0.018;
export const BEDROOM_HEAL_PER_LEVEL = 0.5;
export const SHELTER_HEAL_PER_LEVEL = 0.65;
export const NICHE_HEAL_PER_LEVEL = 0.6;
export const HOSPITAL_HEAL_PER_LEVEL = 0.4;
export const HOSPITAL_ARCADE_HIT_REDUCTION_PER_LEVEL = 1;
export const HOSPITAL_ARCADE_MIN_HITS = 3;
export const HOSPITAL_ARCADE_HEAL_PER_LEVEL = 3;
export const HOSPITAL_ARCADE_COMPLETION_PER_LEVEL = 5;
export const HOSPITAL_MAX_HEALTH_PER_LEVEL = 8;
export const DEATH_HOSPITAL_HEALTH = 30;

/** Base resource caps before storage buildings. */
export const BASE_FOOD_CAP = 150;
export const BASE_MONEY_CAP = 200;
export const STORAGE_FOOD_CAP_PER_LEVEL = 80;
export const STORAGE_MONEY_CAP_PER_LEVEL = 60;

/** Nest defense — rival bots occasionally steal resources; traps block them. */
export const MAX_COUNTER_RAIDS_PER_DAY = 4;
export const COUNTER_RAID_INTERVAL_SEC = 75;
export const COUNTER_RAID_MIN_BUILDINGS = 2;
export const COUNTER_RAID_ATTACK_BASE = 28;
export const COUNTER_RAID_ATTACK_PER_BUILDING = 4;
export const COUNTER_RAID_ATTACK_VARIANCE = 12;
export const COUNTER_RAID_FOOD_LOSS_BASE = 20;
export const COUNTER_RAID_MONEY_LOSS_BASE = 14;
export const FIGHTER_COUNTER_DEFENSE_BONUS = 18;
export const TRAP_DEFENSE_POWER: Record<'slipper' | 'spray' | 'glue', number> = {
  slipper: 30,
  spray: 24,
  glue: 18,
};

export const PASSIVE_INCOME: Record<RoomType, { food: number; money: number }> = {
  kitchen: { food: 0.35, money: 0 },
  storage: { food: 0.18, money: 0.12 },
  bedroom: { food: 0, money: 0.06 },
  nursery: { food: 0, money: 0.22 },
  hospital: { food: 0, money: 0 },
  planter: { food: 0.38, money: 0 },
  shelter: { food: 0, money: 0.05 },
  locker: { food: 0, money: 0.14 },
  niche: { food: 0.22, money: 0.04 },
};

// ── Building costs (mirrors ROOM_DEFINITIONS) ─────────────────────────────────

export interface RoomCostDef {
  moneyCost: number;
  foodCost: number;
  maxLevel: number;
  upgradeMoneyCost: number;
}

export const ROOM_COSTS: Record<RoomType, RoomCostDef> = {
  kitchen: { moneyCost: 30, foodCost: 10, maxLevel: 5, upgradeMoneyCost: 20 },
  bedroom: { moneyCost: 25, foodCost: 5, maxLevel: 5, upgradeMoneyCost: 15 },
  storage: { moneyCost: 40, foodCost: 0, maxLevel: 5, upgradeMoneyCost: 25 },
  nursery: { moneyCost: 60, foodCost: 20, maxLevel: 3, upgradeMoneyCost: 40 },
  hospital: { moneyCost: 50, foodCost: 10, maxLevel: 3, upgradeMoneyCost: 30 },
  planter: { moneyCost: 28, foodCost: 8, maxLevel: 5, upgradeMoneyCost: 18 },
  shelter: { moneyCost: 22, foodCost: 5, maxLevel: 5, upgradeMoneyCost: 16 },
  locker: { moneyCost: 38, foodCost: 0, maxLevel: 5, upgradeMoneyCost: 24 },
  niche: { moneyCost: 24, foodCost: 5, maxLevel: 5, upgradeMoneyCost: 15 },
};

export const APARTMENT_STARTING_UNLOCKS: RoomType[] = ['kitchen', 'bedroom'];
export const BALCONY_STARTING_UNLOCKS: RoomType[] = ['planter', 'shelter'];
export const STAIRWELL_STARTING_UNLOCKS: RoomType[] = ['locker', 'niche'];

/** Room-count thresholds to unlock apartment rooms (apartment region only). */
export const APARTMENT_UNLOCK_THRESHOLDS: { count: number; room: RoomType }[] = [
  { count: 2, room: 'storage' },
  { count: 4, room: 'nursery' },
  { count: 3, room: 'hospital' },
];

// ── Region unlock ─────────────────────────────────────────────────────────────

export const BALCONY_UNLOCK_BUILDING_COUNT = 5;
export const BALCONY_UNLOCK_RATING = 1200;
export const STAIRWELL_UNLOCK_BUILDING_COUNT = 10;
export const STAIRWELL_UNLOCK_RATING = 1500;
export const STAIRWELL_BALCONY_BUILDING_COUNT = 3;

// ── Raids ─────────────────────────────────────────────────────────────────────

export const MAX_RAIDS_PER_DAY = 5;
export const MAX_RAID_ENERGY = 3;
export const RAID_SHIELD_HOURS = 3;
export const LOOT_FOOD_CAP = 0.15;
export const LOOT_MONEY_CAP = 0.1;
export const STARTING_RAID_RATING = 1000;
export const RAID_POWER_BASE = 10;
export const RAID_POWER_PER_LEVEL = 12;
export const RAID_POWER_FLAT = 8;
export const RAID_SUCCESS_THRESHOLD = 35;
export const RAID_WIN_RATING_BASE = 15;
export const RAID_WIN_RATING_SCALE = 0.2;
export const RAID_LOSS_RATING_BASE = 10;
export const RAID_LOSS_RATING_SCALE = 0.1;

// ── Daily bonus ───────────────────────────────────────────────────────────────

export const DAILY_BONUS_TABLE: { food: number; money: number }[] = [
  { food: 0, money: 0 },
  { food: 50, money: 0 },
  { food: 75, money: 25 },
  { food: 100, money: 50 },
  { food: 150, money: 75 },
  { food: 200, money: 100 },
  { food: 300, money: 150 },
  { food: 500, money: 200 },
];

export const DAILY_BONUS_MAX_STREAK_DAY = 7;
export const DAILY_QUEST_STREAK_MULT = 0.15;
export const DAILY_QUEST_COUNT = 3;

export const DAILY_QUEST_TARGETS: Record<DailyQuestType, number[]> = {
  build: [1, 2, 3],
  arcade: [1, 2, 3],
  raid: [1, 2],
  earn_food: [40, 60, 80],
  earn_money: [30, 50, 75],
};

export const DAILY_QUEST_BASE_REWARDS: Record<DailyQuestType, { food?: number; money?: number }> = {
  build: { food: 40, money: 20 },
  arcade: { food: 35 },
  raid: { food: 50, money: 40 },
  earn_food: { money: 30 },
  earn_money: { food: 35 },
};

// ── Breeding ──────────────────────────────────────────────────────────────────

export const BREED_FOOD_COST = 15;
export const BREED_MONEY_COST = 25;
export const BREED_DURATION_MS = 30_000;
export const NURSERY_CAPACITY_PER_LEVEL = 2;

export const ROLE_BONUS_PER_LEVEL: Record<CockroachRole, number> = {
  worker: 0.1,
  scout: 0.15,
  fighter: 0.2,
};

// ── Tutorial ──────────────────────────────────────────────────────────────────

export const TUTORIAL_COMPLETE_REWARD = { food: 50, money: 30 };

// ── IAP product grants ────────────────────────────────────────────────────────

export const IAP_GRANTS: Record<
  ProductId,
  { food?: number; money?: number; shieldHours?: number; energy?: number }
> = {
  food_pack_small: { food: 200 },
  food_pack_large: { food: 1000 },
  money_pack: { money: 500 },
  shield_24h: { shieldHours: 24 },
  energy_refill: { energy: 3 },
  remove_ads: {},
  season_pass_premium: {},
  skin_pack: {},
};

// ── Rewarded ad bonuses ───────────────────────────────────────────────────────

export const REWARDED_ENERGY_AMOUNT = 1;

// ── Monetization ──────────────────────────────────────────────────────────────

export const INTERSTITIAL_EVERY_N_ARCADES = 3;
export const MIN_INTERSTITIAL_INTERVAL_MS = 60_000;

// ── Live ops multipliers ──────────────────────────────────────────────────────

export const LIVE_OPS_MULTIPLIERS: Record<LiveOpsMultiplierType, number> = {
  slipper_score: 2,
  spray_reward: 2,
  raid_loot: 1.5,
  build_cost: 0.7,
  passive_food: 2,
};

// ── Arcade rewards & tuning ───────────────────────────────────────────────────

export const ARCADE_FOOD_HUNT = {
  targetCrumbs: 7,
  winFood: 45,
  winMoney: 12,
  failDamage: 12,
  hungerDrain: 0.011,
  hungerPerCrumb: 14,
  /** × COCKROACH_DISPLAY_SCALE */
  roachScale: 4.5,
  crumbScaleMin: 0.7,
  crumbScaleMax: 1.0,
};

export const ARCADE_SPRAY = {
  winFood: 25,
  winMoney: 15,
  poisonedHealth: 20,
  roachScale: 4.5,
};

export const ARCADE_CAT_CHASE = {
  surviveSeconds: 42,
  catSpeed: 160,
  playerSpeed: 225,
  catchDistance: 28,
  crumbScore: 12,
  timeBonusMult: 5,
  winFood: 35,
  winMoney: 22,
  failDamage: 8,
  roachScale: 3.0,
  crumbScaleMin: 0.6,
  crumbScaleMax: 0.84,
};

export const ARCADE_HOSPITAL = {
  requiredHits: 5,
  healPerHit: 15,
  completionHeal: 30,
  scorePerHit: 20,
  pulseMin: 1.0,
  pulseMax: 1.5,
};

export const ARCADE_SLIPPER = {
  playerSpeed: 280,
  /** Arcade roach scale mult (× COCKROACH_DISPLAY_SCALE). Was 1.5 → 2× = 3.0 */
  roachScale: 3.0,
  /** Slipper display scale — ~4× previous 0.55 baseline */
  slipperScaleBase: 2.2,
  slipperScaleMin: 1.52,
  slipperScaleMax: 2.2,
  slipperScaleLarge: 2.8,
  waveMin: 2,
  waveMax: 4,
};
