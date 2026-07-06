import type { RoomType } from './systems/BuildingSystem';
import type { MapRegion } from './systems/WorldMapData';
import type { TutorialStepId } from './systems/TutorialSystem';
import type { SeasonPassSaveData } from './systems/SeasonPassSystem';
import type { CockroachSkinId } from './systems/SeasonPassSystem';

export type TrapType = 'slipper' | 'spray' | 'glue';

export type CockroachRole = 'worker' | 'scout' | 'fighter';

export interface CockroachUnit {
  id: string;
  name: string;
  level: number;
  role: CockroachRole;
  xp?: number;
}

export interface PlacedRoom {
  type: RoomType;
  gridX: number;
  gridY: number;
  level: number;
}

export type DailyQuestType = 'build' | 'arcade' | 'raid' | 'earn_food' | 'earn_money';

export interface DailyQuest {
  id: string;
  type: DailyQuestType;
  target: number;
  progress: number;
  reward: { food?: number; money?: number };
  claimed: boolean;
}

export interface GameSaveData {
  food: number;
  money: number;
  health: number;
  maxHealth: number;
  rooms: PlacedRoom[];
  totalPlayTime: number;
  arcadeHighScores: Record<string, number>;
  unlockedRooms: RoomType[];
  raidEnergy: number;
  raidsToday: number;
  lastRaidDay: string;
  shieldUntil: number;
  defenseTraps: TrapType[];
  playerDistrict: string;
  raidRating: number;
  raidWins: number;
  lastLoginDate: string;
  loginStreak: number;
  dailyQuests: DailyQuest[];
  dailyQuestsDate: string;
  claimedDailyBonus: boolean;
  cockroaches: CockroachUnit[];
  maxCockroaches: number;
  breedingTimers: BreedingTimer[];
  purchasedProducts: string[];
  doubleLootNext: boolean;
  instantBuildNext: boolean;
  liveOpsWeekKey: string;
  eventParticipation: Record<string, boolean>;
  tutorialComplete?: boolean;
  tutorialStep?: TutorialStepId;
  nestRegion?: MapRegion;
  balconyRooms?: PlacedRoom[];
  balconyUnlockedRooms?: RoomType[];
  stairwellRooms?: PlacedRoom[];
  stairwellUnlockedRooms?: RoomType[];
  seasonPass?: SeasonPassSaveData;
  unlockedSkins?: CockroachSkinId[];
  equippedSkin?: CockroachSkinId;
  lastDefenseRepelDay?: string;
}

export interface BreedingTimer {
  id: string;
  role: CockroachRole;
  finishAt: number;
}

export interface GameStateSnapshot {
  food: number;
  money: number;
  health: number;
  maxHealth: number;
  rooms: PlacedRoom[];
  totalPlayTime: number;
  arcadeHighScores: Record<string, number>;
  unlockedRooms: RoomType[];
  raidEnergy: number;
  raidsToday: number;
  lastRaidDay: string;
  shieldUntil: number;
  defenseTraps: TrapType[];
  playerDistrict: string;
  raidRating: number;
  raidWins: number;
  lastLoginDate: string;
  loginStreak: number;
  dailyQuests: DailyQuest[];
  dailyQuestsDate: string;
  claimedDailyBonus: boolean;
  cockroaches: CockroachUnit[];
  maxCockroaches: number;
  breedingTimers: BreedingTimer[];
  purchasedProducts: string[];
  doubleLootNext: boolean;
  instantBuildNext: boolean;
  liveOpsWeekKey: string;
  eventParticipation: Record<string, boolean>;
  tutorialComplete?: boolean;
  tutorialStep?: TutorialStepId;
  nestRegion?: MapRegion;
  balconyRooms?: PlacedRoom[];
  balconyUnlockedRooms?: RoomType[];
  stairwellRooms?: PlacedRoom[];
  stairwellUnlockedRooms?: RoomType[];
  seasonPass?: SeasonPassSaveData;
  unlockedSkins?: CockroachSkinId[];
  equippedSkin?: CockroachSkinId;
  lastDefenseRepelDay?: string;
}

export const DEFAULT_GAME_STATE: GameStateSnapshot = {
  food: 50,
  money: 100,
  health: 100,
  maxHealth: 100,
  rooms: [],
  totalPlayTime: 0,
  arcadeHighScores: {},
  unlockedRooms: ['kitchen', 'bedroom'],
  raidEnergy: 3,
  raidsToday: 0,
  lastRaidDay: '',
  shieldUntil: 0,
  defenseTraps: ['slipper'],
  playerDistrict: 'plinth',
  raidRating: 1000,
  raidWins: 0,
  lastLoginDate: '',
  loginStreak: 0,
  dailyQuests: [],
  dailyQuestsDate: '',
  claimedDailyBonus: false,
  cockroaches: [],
  maxCockroaches: 0,
  breedingTimers: [],
  purchasedProducts: [],
  doubleLootNext: false,
  instantBuildNext: false,
  liveOpsWeekKey: '',
  eventParticipation: {},
  tutorialComplete: false,
  tutorialStep: 'welcome',
  nestRegion: 'apartment',
  balconyRooms: [],
  balconyUnlockedRooms: ['planter', 'shelter'],
  stairwellRooms: [],
  stairwellUnlockedRooms: ['locker', 'niche'],
  unlockedSkins: ['default'],
  equippedSkin: 'default',
};

export interface MapPlayer {
  id: string;
  name: string;
  isBot: boolean;
  districtId: string;
  mapX: number;
  mapY: number;
  food: number;
  money: number;
  rooms: PlacedRoom[];
  traps: TrapType[];
  shieldUntil: number;
  accentColor: number;
}

export type RaidPhase = 'march' | 'infiltrate' | 'loot' | 'escape' | 'result';

export interface RaidResult {
  success: boolean;
  foodStolen: number;
  moneyStolen: number;
  ratingChange: number;
  phaseScores: { infiltrate: number; loot: number; escape: number };
}
