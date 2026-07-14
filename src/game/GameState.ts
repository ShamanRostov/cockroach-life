import { DEFAULT_GAME_STATE, type DailyQuestType, type GameSaveData, type GameStateSnapshot } from './types';
import { SaveSystem } from './systems/SaveSystem';
import { EconomySystem } from './systems/EconomySystem';
import { BuildingSystem } from './systems/BuildingSystem';
import { RaidSystem } from './systems/RaidSystem';
import { DailyQuestSystem } from './systems/DailyQuestSystem';
import { DailyBonusSystem } from './systems/DailyBonusSystem';
import { BreedingSystem } from './systems/BreedingSystem';
import { LiveOpsSystem, type LiveOpsEventId } from './systems/LiveOpsSystem';
import { SeasonPassSystem, type SeasonPassReward } from './systems/SeasonPassSystem';
import { CockroachSkinSystem } from './systems/CockroachSkinSystem';
import {
  initWorldBots,
  isBalconyUnlocked,
  isStairwellUnlocked,
  findDistrict,
} from './systems/WorldMapData';
import { TutorialSystem, type TutorialStepId } from './systems/TutorialSystem';
import type { MapRegion } from './systems/WorldMapData';
import type { RoomType } from './systems/BuildingSystem';
import type { CockroachSkinId } from './systems/SeasonPassSystem';
import { AnalyticsService } from '../platforms/AnalyticsService';
import type { ProductId } from '../platforms/IAPService';
import type { RewardType } from '../platforms/MonetizationService';
import type { PlacedRoom } from './types';
import { iapService } from '../platforms/IAPService';
import { IAP_GRANTS, REWARDED_ENERGY_AMOUNT, localDateString, DEFENSE_REPEL_BASE_CHANCE, DEFENSE_REPEL_TRAP_BONUS, DEFENSE_REPEL_REWARD } from './systems/GameBalance';

/** Central game state singleton shared across scenes. */
export class GameState {
  private static instance: GameState | null = null;

  readonly economy: EconomySystem;
  readonly building: BuildingSystem;
  readonly raid: RaidSystem;
  readonly dailyQuests: DailyQuestSystem;
  readonly dailyBonus: DailyBonusSystem;
  readonly breeding: BreedingSystem;
  readonly liveOps: LiveOpsSystem;
  readonly seasonPass: SeasonPassSystem;
  readonly skins: CockroachSkinSystem;
  readonly save: SaveSystem;
  readonly tutorial: TutorialSystem;

  private nestRegion: MapRegion = 'apartment';
  private apartmentRooms: PlacedRoom[] = [];
  private apartmentUnlockedRooms: RoomType[] = ['kitchen', 'bedroom'];
  private balconyRooms: PlacedRoom[] = [];
  private balconyUnlockedRooms: RoomType[] = ['planter', 'shelter'];
  private stairwellRooms: PlacedRoom[] = [];
  private stairwellUnlockedRooms: RoomType[] = ['locker', 'niche'];

  private playTimeStart = 0;
  private purchasedProducts: string[] = [];
  private doubleLootNext = false;
  private instantBuildNext = false;
  private lastDefenseRepelDay = '';
  private pendingDefenseRepel: { food: number; money: number } | null = null;

  private constructor() {
    this.save = new SaveSystem();
    this.economy = new EconomySystem();
    this.building = new BuildingSystem();
    this.raid = new RaidSystem();
    this.dailyQuests = new DailyQuestSystem();
    this.dailyBonus = new DailyBonusSystem();
    this.breeding = new BreedingSystem();
    this.liveOps = new LiveOpsSystem();
    this.seasonPass = new SeasonPassSystem();
    this.skins = new CockroachSkinSystem();
    this.tutorial = new TutorialSystem();
    this.dailyQuests.setStreakProvider(() => this.dailyBonus.getStreak());
  }

  static getInstance(): GameState {
    if (!GameState.instance) {
      GameState.instance = new GameState();
    }
    return GameState.instance;
  }

  async init(): Promise<void> {
    const saved = await this.save.loadAsync();
    if (saved) {
      this.applySnapshot(saved);
    } else {
      this.reset();
    }
    initWorldBots();
    this.playTimeStart = Date.now();
    this.dailyBonus.processLogin();
    this.dailyQuests.checkAndReset();
    this.raid.refreshDailyRaids();
    this.liveOps.checkWeekReset();
    this.seasonPass.checkSeasonReset();
    this.syncSeasonPassPremium();
    AnalyticsService.getInstance().trackEventActive(this.liveOps.getCurrentEvent().id);
  }

  reset(): void {
    this.playTimeStart = Date.now();
    this.applySnapshot({
      ...DEFAULT_GAME_STATE,
      rooms: [],
      arcadeHighScores: {},
      balconyRooms: [],
      stairwellRooms: [],
    });
  }

  applySnapshot(data: GameStateSnapshot): void {
    this.nestRegion = data.nestRegion ?? 'apartment';
    this.apartmentRooms = (data.rooms ?? []).map((r) => ({ ...r }));
    this.apartmentUnlockedRooms = [...(data.unlockedRooms ?? ['kitchen', 'bedroom'])];
    this.balconyRooms = (data.balconyRooms ?? []).map((r) => ({ ...r }));
    this.balconyUnlockedRooms = [...(data.balconyUnlockedRooms ?? ['planter', 'shelter'])];
    this.stairwellRooms = (data.stairwellRooms ?? []).map((r) => ({ ...r }));
    this.stairwellUnlockedRooms = [...(data.stairwellUnlockedRooms ?? ['locker', 'niche'])];

    const { rooms: activeRooms, unlocked: activeUnlocked } = this.getRegionStorage(this.nestRegion);

    this.economy.load(data.food, data.money, data.health, data.maxHealth);
    this.building.load(activeRooms, activeUnlocked, this.nestRegion);
    this.raid.load({
      raidEnergy: data.raidEnergy ?? 3,
      raidsToday: data.raidsToday ?? 0,
      lastRaidDay: data.lastRaidDay ?? '',
      shieldUntil: data.shieldUntil ?? 0,
      defenseTraps: data.defenseTraps ?? ['slipper'],
      playerDistrict: data.playerDistrict ?? 'plinth',
      raidRating: data.raidRating ?? 1000,
      raidWins: data.raidWins ?? 0,
    });
    this.dailyBonus.load({
      lastLoginDate: data.lastLoginDate ?? '',
      loginStreak: data.loginStreak ?? 0,
      claimedDailyBonus: data.claimedDailyBonus ?? false,
    });
    this.dailyQuests.load({
      dailyQuests: data.dailyQuests ?? [],
      dailyQuestsDate: data.dailyQuestsDate ?? '',
    });
    this.breeding.load(
      data.cockroaches ?? [],
      data.maxCockroaches ?? 0,
      data.breedingTimers ?? [],
    );
    this.breeding.syncMaxCapacity(this.apartmentRooms);
    this.liveOps.load({
      liveOpsWeekKey: data.liveOpsWeekKey ?? '',
      eventParticipation: data.eventParticipation ?? {},
    });
    this.save.setHighScores(data.arcadeHighScores);
    this.save.setTotalPlayTime(data.totalPlayTime);
    this.purchasedProducts = [...(data.purchasedProducts ?? [])];
    this.doubleLootNext = data.doubleLootNext ?? false;
    this.instantBuildNext = data.instantBuildNext ?? false;
    this.lastDefenseRepelDay = data.lastDefenseRepelDay ?? '';
    this.tutorial.load(data.tutorialComplete, this.apartmentRooms, data.tutorialStep);
    this.skins.load(data.unlockedSkins, data.equippedSkin);
    if (this.purchasedProducts.includes('skin_pack')) {
      this.skins.unlockAllPurchasable();
    }
    this.seasonPass.load(data.seasonPass, this.hasSeasonPassPremium());
  }

  private getRegionStorage(region: MapRegion): { rooms: PlacedRoom[]; unlocked: RoomType[] } {
    if (region === 'balcony') {
      return { rooms: this.balconyRooms, unlocked: this.balconyUnlockedRooms };
    }
    if (region === 'stairwell') {
      return { rooms: this.stairwellRooms, unlocked: this.stairwellUnlockedRooms };
    }
    return { rooms: this.apartmentRooms, unlocked: this.apartmentUnlockedRooms };
  }

  /** Persist active nest layout into the correct region slot before saving. */
  private syncNestRegionToStorage(): void {
    const rooms = this.building.getRooms();
    const unlocked = this.building.getUnlockedRooms();
    if (this.nestRegion === 'balcony') {
      this.balconyRooms = rooms.map((r) => ({ ...r }));
      this.balconyUnlockedRooms = [...unlocked];
    } else if (this.nestRegion === 'stairwell') {
      this.stairwellRooms = rooms.map((r) => ({ ...r }));
      this.stairwellUnlockedRooms = [...unlocked];
    } else {
      this.apartmentRooms = rooms.map((r) => ({ ...r }));
      this.apartmentUnlockedRooms = [...unlocked];
    }
  }

  getNestRegion(): MapRegion {
    return this.nestRegion;
  }

  getTotalBuildingCount(): number {
    this.syncNestRegionToStorage();
    return this.apartmentRooms.length + this.balconyRooms.length + this.stairwellRooms.length;
  }

  getBalconyBuildingCount(): number {
    this.syncNestRegionToStorage();
    return this.balconyRooms.length;
  }

  isBalconyUnlocked(): boolean {
    return isBalconyUnlocked(this.getTotalBuildingCount(), this.raid.raidRating);
  }

  isStairwellUnlocked(): boolean {
    return isStairwellUnlocked(
      this.getTotalBuildingCount(),
      this.raid.raidRating,
      this.getBalconyBuildingCount(),
      this.isBalconyUnlocked(),
    );
  }

  hasSeasonPassPremium(): boolean {
    return (
      this.purchasedProducts.includes('season_pass_premium') ||
      iapService.isPurchased('season_pass_premium')
    );
  }

  private syncSeasonPassPremium(): void {
    this.seasonPass.setPremium(this.hasSeasonPassPremium());
  }

  switchNestRegion(region: MapRegion): boolean {
    if (region === this.nestRegion) return true;
    if (region === 'balcony' && !this.isBalconyUnlocked()) return false;
    if (region === 'stairwell' && !this.isStairwellUnlocked()) return false;

    this.syncNestRegionToStorage();
    this.nestRegion = region;

    const { rooms, unlocked } = this.getRegionStorage(region);
    this.building.load(rooms, unlocked, region);

    const district = findDistrict(this.raid.playerDistrict);
    if (district?.region !== region) {
      if (region === 'balcony') {
        this.raid.playerDistrict = 'flowerpot';
      } else if (region === 'stairwell') {
        this.raid.playerDistrict = 'mailbox';
      } else {
        this.raid.playerDistrict = 'plinth';
      }
    }

    this.persist();
    return true;
  }

  getNextNestRegion(): MapRegion {
    const order: MapRegion[] = ['apartment', 'balcony', 'stairwell'];
    const idx = order.indexOf(this.nestRegion);
    for (let i = 1; i <= order.length; i++) {
      const next = order[(idx + i) % order.length]!;
      if (next === 'balcony' && !this.isBalconyUnlocked()) continue;
      if (next === 'stairwell' && !this.isStairwellUnlocked()) continue;
      return next;
    }
    return 'apartment';
  }

  skipTutorial(): void {
    this.tutorial.skip();
    this.persist();
  }

  finishTutorial(): void {
    const reward = this.tutorial.completeWithReward();
    this.addFood(reward.food, false);
    this.addMoney(reward.money, false);
    this.persist();
  }

  setTutorialStep(step: TutorialStepId): void {
    if (this.tutorial.tutorialComplete) return;
    this.tutorial.currentStep = step;
    this.persist();
  }

  getSnapshot(): GameSaveData {
    this.syncNestRegionToStorage();
    this.seasonPass.checkSeasonReset();
    const elapsed = Math.floor((Date.now() - this.playTimeStart) / 1000);
    return {
      food: this.economy.food,
      money: this.economy.money,
      health: this.economy.health,
      maxHealth: this.economy.maxHealth,
      rooms: this.apartmentRooms.map((r) => ({ ...r })),
      totalPlayTime: this.save.getTotalPlayTime() + elapsed,
      arcadeHighScores: this.save.getArcadeHighScores(),
      unlockedRooms: [...this.apartmentUnlockedRooms],
      raidEnergy: this.raid.raidEnergy,
      raidsToday: this.raid.raidsToday,
      lastRaidDay: this.raid.lastRaidDay,
      shieldUntil: this.raid.shieldUntil,
      defenseTraps: this.raid.defenseTraps,
      playerDistrict: this.raid.playerDistrict,
      raidRating: this.raid.raidRating,
      raidWins: this.raid.raidWins,
      lastLoginDate: this.dailyBonus.lastLoginDate,
      loginStreak: this.dailyBonus.loginStreak,
      dailyQuests: this.dailyQuests.dailyQuests,
      dailyQuestsDate: this.dailyQuests.dailyQuestsDate,
      claimedDailyBonus: this.dailyBonus.claimedDailyBonus,
      cockroaches: this.breeding.getCockroaches(),
      maxCockroaches: this.breeding.getStoredMaxCapacity(),
      breedingTimers: this.breeding.getBreedingTimers(),
      purchasedProducts: [...this.purchasedProducts],
      doubleLootNext: this.doubleLootNext,
      instantBuildNext: this.instantBuildNext,
      liveOpsWeekKey: this.liveOps.liveOpsWeekKey,
      eventParticipation: { ...this.liveOps.eventParticipation },
      tutorialComplete: this.tutorial.tutorialComplete,
      tutorialStep: this.tutorial.currentStep,
      nestRegion: this.nestRegion,
      balconyRooms: this.balconyRooms.map((r) => ({ ...r })),
      balconyUnlockedRooms: [...this.balconyUnlockedRooms],
      stairwellRooms: this.stairwellRooms.map((r) => ({ ...r })),
      stairwellUnlockedRooms: [...this.stairwellUnlockedRooms],
      seasonPass: this.seasonPass.exportSave(),
      unlockedSkins: this.skins.exportUnlocked(),
      equippedSkin: this.skins.getEquipped(),
      lastDefenseRepelDay: this.lastDefenseRepelDay,
    };
  }

  /** Try a daily defense event when traps are active and shield is down. Returns reward if repelled. */
  processDefenseRepel(): { food: number; money: number } | null {
    const today = localDateString();
    if (this.lastDefenseRepelDay === today) return null;
    if (this.raid.shieldUntil > Date.now()) return null;
    if (this.raid.defenseTraps.length === 0) return null;

    const chance =
      DEFENSE_REPEL_BASE_CHANCE + this.raid.defenseTraps.length * DEFENSE_REPEL_TRAP_BONUS;
    if (Math.random() > chance) return null;

    this.lastDefenseRepelDay = today;
    this.addFood(DEFENSE_REPEL_REWARD.food, false);
    this.addMoney(DEFENSE_REPEL_REWARD.money, false);
    this.pendingDefenseRepel = { ...DEFENSE_REPEL_REWARD };
    AnalyticsService.getInstance().trackEvent('defense_repel', {
      traps: this.raid.defenseTraps.length,
    });
    this.persist();
    return { ...DEFENSE_REPEL_REWARD };
  }

  consumeDefenseRepelNotice(): { food: number; money: number } | null {
    const notice = this.pendingDefenseRepel;
    this.pendingDefenseRepel = null;
    return notice;
  }

  /** Passive colony growth while in nest. Returns roach names that leveled up. */
  tickColonyGrowth(dt: number): string[] {
    return this.breeding.tickGrowth(dt);
  }

  /** Grant raid XP to colony after successful raid. */
  grantRaidColonyXP(): string[] {
    return this.breeding.grantRaidXP();
  }

  getPlayerRaidPower(): number {
    const rooms = [
      ...this.apartmentRooms,
      ...this.balconyRooms,
      ...this.stairwellRooms,
    ];
    return this.raid.calcPower(rooms, this.breeding.getRoleBonus('fighter'));
  }

  trackEventReward(eventId: LiveOpsEventId, rewardType: string): void {
    this.liveOps.markParticipation(eventId);
    AnalyticsService.getInstance().trackEventRewardClaimed(eventId, rewardType);
  }

  persist(): void {
    const snapshot = this.getSnapshot();
    this.save.save(snapshot);
    AnalyticsService.getInstance().trackPersistHeartbeat(snapshot.totalPlayTime);
  }

  addFood(amount: number, trackDaily = true): void {
    this.economy.addFood(amount);
    if (trackDaily && amount > 0) {
      this.dailyQuests.trackProgress('earn_food', amount);
      if (amount >= 15) {
        this.seasonPass.addXP('economy');
      }
    }
  }

  addMoney(amount: number, trackDaily = true): void {
    this.economy.addMoney(amount);
    if (trackDaily && amount > 0) {
      this.dailyQuests.trackProgress('earn_money', amount);
      if (amount >= 10) {
        this.seasonPass.addXP('economy');
      }
    }
  }

  trackDailyProgress(type: DailyQuestType, amount = 1): void {
    this.dailyQuests.trackProgress(type, amount);
    const xpSource =
      type === 'build'
        ? 'building'
        : type === 'raid'
          ? 'raid'
          : type === 'arcade'
            ? 'arcade'
            : type === 'earn_food' || type === 'earn_money'
              ? 'economy'
              : null;
    if (xpSource) {
      this.seasonPass.addXP(xpSource);
    }
  }

  claimDailyBonus(): boolean {
    const rewards = this.dailyBonus.claimDailyBonus();
    if (!rewards) return false;
    if (rewards.food) this.addFood(rewards.food, false);
    if (rewards.money) this.addMoney(rewards.money, false);
    AnalyticsService.getInstance().trackDailyBonusClaimed(this.dailyBonus.getStreak());
    this.persist();
    return true;
  }

  claimDailyQuest(id: string): boolean {
    const quest = this.dailyQuests.dailyQuests.find((q) => q.id === id);
    const reward = this.dailyQuests.claimQuest(id);
    if (!reward) return false;
    if (reward.food) this.addFood(reward.food, false);
    if (reward.money) this.addMoney(reward.money, false);
    this.seasonPass.addXP('daily_quest');
    if (quest) {
      AnalyticsService.getInstance().trackQuestClaimed(quest.type);
    }
    this.persist();
    return true;
  }

  claimSeasonPassReward(tier: number, track: 'free' | 'premium'): boolean {
    const reward = this.seasonPass.claimReward(tier, track);
    if (!reward) return false;
    this.applySeasonPassReward(reward);
    this.persist();
    return true;
  }

  private applySeasonPassReward(reward: SeasonPassReward): void {
    switch (reward.type) {
      case 'food':
        if (reward.amount) this.addFood(reward.amount, false);
        break;
      case 'money':
        if (reward.amount) this.addMoney(reward.amount, false);
        break;
      case 'energy':
        if (reward.amount) this.raid.addEnergy(reward.amount);
        break;
      case 'shield':
        if (reward.amount) this.raid.activateShield(reward.amount);
        break;
      case 'skin':
        if (reward.skinId) {
          this.skins.unlock(reward.skinId);
          this.skins.equip(reward.skinId);
        }
        break;
    }
  }

  equipSkin(skinId: CockroachSkinId): boolean {
    if (!this.skins.equip(skinId)) return false;
    this.persist();
    return true;
  }

  updateHighScore(sceneKey: string, score: number): boolean {
    const scores = this.save.getArcadeHighScores();
    const prev = scores[sceneKey] ?? 0;
    if (score > prev) {
      scores[sceneKey] = score;
      this.save.setHighScores(scores);
      this.persist();
      return true;
    }
    return false;
  }

  getPurchasedProducts(): string[] {
    return [...this.purchasedProducts];
  }

  applyIAPPurchase(productId: ProductId): void {
    switch (productId) {
      case 'remove_ads':
        if (!this.purchasedProducts.includes('remove_ads')) {
          this.purchasedProducts.push('remove_ads');
        }
        break;
      case 'season_pass_premium':
        if (!this.purchasedProducts.includes('season_pass_premium')) {
          this.purchasedProducts.push('season_pass_premium');
        }
        this.syncSeasonPassPremium();
        break;
      case 'skin_pack':
        if (!this.purchasedProducts.includes('skin_pack')) {
          this.purchasedProducts.push('skin_pack');
        }
        this.skins.unlockAllPurchasable();
        break;
      default: {
        const grant = IAP_GRANTS[productId];
        if (grant.food) this.addFood(grant.food, false);
        if (grant.money) this.addMoney(grant.money, false);
        if (grant.shieldHours) this.raid.activateShield(grant.shieldHours);
        if (grant.energy) this.raid.addEnergy(grant.energy);
        break;
      }
    }
    this.persist();
  }

  activateRewardBonus(type: RewardType): void {
    switch (type) {
      case 'double_loot':
        this.doubleLootNext = true;
        break;
      case 'extra_energy':
        this.raid.addEnergy(REWARDED_ENERGY_AMOUNT);
        break;
      case 'speed_build':
        this.instantBuildNext = true;
        break;
    }
    this.persist();
  }

  consumeDoubleLoot(): boolean {
    if (!this.doubleLootNext) return false;
    this.doubleLootNext = false;
    this.persist();
    return true;
  }

  consumeInstantBuild(): boolean {
    if (!this.instantBuildNext) return false;
    this.instantBuildNext = false;
    this.persist();
    return true;
  }

  async syncIAPPurchases(): Promise<void> {
    const restored = await iapService.restorePurchases();
    let changed = false;
    for (const id of restored) {
      if (!this.purchasedProducts.includes(id)) {
        this.purchasedProducts.push(id);
        changed = true;
      }
    }
    if (changed) {
      this.syncSeasonPassPremium();
      if (this.purchasedProducts.includes('skin_pack')) {
        this.skins.unlockAllPurchasable();
      }
      this.persist();
    }
  }
}
