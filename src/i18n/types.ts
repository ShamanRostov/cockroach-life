export type Locale = 'ru' | 'en';

export interface LocalePack {
  meta: { lang: Locale; name: string };
  game: { title: string; subtitle: string; loading: string };
  menu: {
    play: string;
    arcade: string;
    leaderboards: string;
    newGame: string;
    controls: string;
    touchControls: string;
    arcadeTitle: string;
    back: string;
    language: string;
    soundOn: string;
    soundOff: string;
  };
  mobile: {
    tapToPlay: string;
    swipeToMove: string;
    touchLeftRight: string;
    useJoystick: string;
    tapToPulse: string;
    tapToBuild: string;
  };
  common: {
    esc: string;
    record: string;
    score: string;
    health: string;
  };
  ads: {
    rewardedOffer: string;
    adLoading: string;
    adFailed: string;
    watchAd: string;
    skip: string;
  };
  hud: {
    food: string;
    money: string;
    health: string;
  };
  nest: {
    building: string;
    dangers: string;
    upgrade: string;
    info: string;
    selected: string;
    clickUpgrade: string;
    died: string;
    notEnoughResources: string;
    built: string;
    noBuilding: string;
    maxLevel: string;
    notEnoughMoney: string;
    upgraded: string;
    roomLabel: string;
    slipper: string;
    spray: string;
    food: string;
    catChase: string;
    worldMap: string;
    defense: string;
    trapSlipper: string;
    trapSpray: string;
    trapGlue: string;
    trapsSaved: string;
    switchApartment: string;
    switchBalcony: string;
    switchStairwell: string;
    balconyLocked: string;
    stairwellLocked: string;
    balconyTitle: string;
    stairwellTitle: string;
  };
  rooms: Record<
    | 'kitchen'
    | 'bedroom'
    | 'storage'
    | 'nursery'
    | 'hospital'
    | 'planter'
    | 'shelter'
    | 'locker'
    | 'niche',
    { name: string; desc: string }
  >;
  building: {
    errors: {
      outOfBounds: string;
      locked: string;
      occupied: string;
    };
  };
  arcade: {
    slipper: { title: string; controls: string; hit: string };
    spray: { title: string; controls: string; win: string; poisoned: string };
    food: { title: string; controls: string; hunger: string; collected: string; win: string; fail: string };
    hospital: { title: string; controls: string; progress: string; healed: string; now: string };
    catChase: {
      title: string;
      controls: string;
      timeLeft: string;
      score: string;
      win: string;
      fail: string;
      boost: string;
    };
  };
  world: {
    title: string;
    you: string;
    energy: string;
    rating: string;
    raid: string;
    marching: string;
    yourNest: string;
    playerInfo: string;
    districts: {
      fridge: string;
      stove: string;
      sink: string;
      trash: string;
      table: string;
      cabinet: string;
      plinth: string;
      flowerpot: string;
      grill: string;
      birdfeeder: string;
      watering: string;
      railing: string;
      mailbox: string;
      mopcloset: string;
      elevator: string;
      stairs: string;
    };
    regions: {
      apartment: string;
      balcony: string;
      stairwell: string;
      balconyTitle: string;
      stairwellTitle: string;
      balconyLocked: string;
      stairwellLocked: string;
    };
    errors: {
      noEnergy: string;
      dailyLimit: string;
      shielded: string;
      self: string;
    };
    bots: {
      fridge: string;
      stove: string;
      sink: string;
      trash: string;
      table: string;
      cabinet: string;
      flowerpot: string;
      grill: string;
      birdfeeder: string;
      watering: string;
      railing: string;
      mailbox: string;
      mopcloset: string;
      elevator: string;
      stairs: string;
    };
  };
  seasonPass: {
    title: string;
    daysLeft: string;
    freeTrack: string;
    premiumTrack: string;
    progress: string;
    buyPremium: string;
    premiumActive: string;
    close: string;
    rewardClaimed: string;
    rewards: {
      food: string;
      money: string;
      energy: string;
      shield: string;
      skin: string;
    };
    skins: {
      default: string;
      golden: string;
      neon: string;
      zombie: string;
      chef: string;
    };
  };
  skins: {
    title: string;
    equipped: string;
    locked: string;
  };
  tutorial: {
    welcome: string;
    buildKitchen: string;
    foodArcade: string;
    worldMap: string;
    complete: string;
    next: string;
    skip: string;
    reward: string;
  };
  raid: {
    intro: string;
    trapsWarning: string;
    phase1: string;
    phase1Hint: string;
    phase2: string;
    phase2Hint: string;
    phase3: string;
    phase3Hint: string;
    infiltrateHud: string;
    lootHud: string;
    escapeHud: string;
    enemyNest: string;
    victory: string;
    defeat: string;
    lootResult: string;
    failResult: string;
    phaseScores: string;
  };
  events: {
    timeRemaining: string;
    close: string;
    items: {
      slipper_week: { name: string; description: string };
      spray_week: { name: string; description: string };
      raid_week: { name: string; description: string };
      build_week: { name: string; description: string };
      food_frenzy: { name: string; description: string };
    };
  };
  daily: {
    title: string;
    streak: string;
    rewardFood: string;
    rewardMoney: string;
    jackpot: string;
    claimBonus: string;
    bonusClaimed: string;
    bonusClaimedToday: string;
    questsTitle: string;
    progress: string;
    claimQuest: string;
    questClaimed: string;
    questDone: string;
    close: string;
    welcomeBonus: string;
    questNames: {
      build: string;
      arcade: string;
      raid: string;
      earn_food: string;
      earn_money: string;
    };
  };
  leaderboard: {
    title: string;
    tabs: { slipper: string; raid: string; colony: string };
    rank: string;
    score: string;
    yourRank: string;
    noRank: string;
    loading: string;
    close: string;
    viewLeaderboard: string;
  };
  share: {
    raidText: string;
    copyLink: string;
    share: string;
  };
  breeding: {
    title: string;
    hudButton: string;
    capacity: string;
    activeBonuses: string;
    noRoaches: string;
    roachLine: string;
    timerLine: string;
    selectRole: string;
    breedButton: string;
    breedStarted: string;
    roles: { worker: string; scout: string; fighter: string };
    errors: {
      noNursery: string;
      maxCapacity: string;
      pendingBreed: string;
      notEnoughResources: string;
    };
    names: string[];
  };
  shop: {
    title: string;
    buy: string;
    owned: string;
    close: string;
    watchAdFor: string;
    purchaseSuccess: string;
    purchaseFail: string;
    adRewardGranted: string;
    rewardDoubleLoot: string;
    rewardExtraEnergy: string;
    rewardSpeedBuild: string;
    products: {
      food_pack_small: string;
      food_pack_large: string;
      money_pack: string;
      shield_24h: string;
      energy_refill: string;
      remove_ads: string;
      season_pass_premium: string;
      skin_pack: string;
    };
  };
}

export type I18nParams = Record<string, string | number>;

export type LocaleChangeListener = (locale: Locale) => void;
