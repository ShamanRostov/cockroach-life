import type { GameSaveData } from '../game/types';
import { GameState } from '../game/GameState';
import { currentSeasonKey } from '../game/systems/SeasonPassSystem';

const SAVE_KEY = 'cockroach-life-save-v1';

function localDateString(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** True when `?screenshots=1` is present in the page URL. */
export function isScreenshotMode(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('screenshots') === '1';
}

/** Pre-populated save with an impressive mid-game colony for store screenshots. */
export function createScreenshotSaveData(): GameSaveData {
  const today = localDateString();

  return {
    food: 850,
    money: 1240,
    health: 100,
    maxHealth: 100,
    rooms: [
      { type: 'kitchen', gridX: 0, gridY: 0, level: 3 },
      { type: 'bedroom', gridX: 1, gridY: 0, level: 2 },
      { type: 'storage', gridX: 2, gridY: 0, level: 2 },
      { type: 'nursery', gridX: 0, gridY: 1, level: 2 },
      { type: 'hospital', gridX: 1, gridY: 1, level: 1 },
    ],
    totalPlayTime: 7200,
    arcadeHighScores: {
      SlipperDodgeScene: 842,
      SprayEscapeScene: 560,
      FoodHuntScene: 410,
    },
    unlockedRooms: ['kitchen', 'bedroom', 'storage', 'nursery', 'hospital'],
    raidEnergy: 3,
    raidsToday: 0,
    lastRaidDay: today,
    shieldUntil: 0,
    defenseTraps: ['slipper', 'spray', 'glue'],
    playerDistrict: 'plinth',
    raidRating: 1450,
    raidWins: 18,
    lastLoginDate: today,
    loginStreak: 4,
    dailyQuests: [
      {
        id: `${today}-build-0`,
        type: 'build',
        target: 2,
        progress: 2,
        reward: { food: 46, money: 23 },
        claimed: false,
      },
      {
        id: `${today}-arcade-1`,
        type: 'arcade',
        target: 1,
        progress: 1,
        reward: { food: 40 },
        claimed: true,
      },
      {
        id: `${today}-earn_food-2`,
        type: 'earn_food',
        target: 60,
        progress: 38,
        reward: { money: 34 },
        claimed: false,
      },
    ],
    dailyQuestsDate: today,
    claimedDailyBonus: true,
    cockroaches: [
      { id: 'ss-roach-1', name: 'Crumb King', level: 3, role: 'worker' },
      { id: 'ss-roach-2', name: 'Shadow Scout', level: 2, role: 'scout' },
      { id: 'ss-roach-3', name: 'Tank Shell', level: 2, role: 'fighter' },
      { id: 'ss-roach-4', name: 'Munchie', level: 1, role: 'worker' },
    ],
    maxCockroaches: 4,
    breedingTimers: [],
    purchasedProducts: [],
    doubleLootNext: false,
    instantBuildNext: false,
    liveOpsWeekKey: today.slice(0, 7),
    eventParticipation: {},
    tutorialComplete: true,
    tutorialStep: 'complete',
    nestRegion: 'apartment',
    balconyRooms: [
      { type: 'planter', gridX: 0, gridY: 0, level: 2 },
      { type: 'shelter', gridX: 1, gridY: 0, level: 2 },
      { type: 'planter', gridX: 2, gridY: 0, level: 1 },
    ],
    balconyUnlockedRooms: ['planter', 'shelter'],
    stairwellRooms: [],
    stairwellUnlockedRooms: ['locker', 'niche'],
    seasonPass: {
      seasonKey: currentSeasonKey(),
      xp: 280,
      claimedFree: [true, true, false, false, false, false, false, false, false, false, false, false, false, false, false],
      claimedPremium: [],
    },
    unlockedSkins: ['default', 'golden'],
    equippedSkin: 'default',
  };
}

/** Write screenshot save to localStorage before GameState.init(). */
export function applyScreenshotSaveToStorage(): void {
  const data = createScreenshotSaveData();
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

/** Apply screenshot save to the live GameState singleton. */
export function applyScreenshotState(state = GameState.getInstance()): void {
  state.applySnapshot(createScreenshotSaveData());
  state.persist();
}
