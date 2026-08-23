import Phaser from 'phaser';
import { SCENES, COLORS, GAME_WIDTH, GAME_HEIGHT, isMobileDevice, isAutotestMode } from '../config';
import { GameState } from '../GameState';
import { ResourceHUD } from '../ui/ResourceHUD';
import { DailyPanel } from '../ui/DailyPanel';
import { BreedingPanel } from '../ui/BreedingPanel';
import { ShopPanel } from '../ui/ShopPanel';
import { SeasonPassPanel } from '../ui/SeasonPassPanel';
import { EventBanner } from '../ui/EventBanner';
import { createPanel, showToast, createAdaptiveButton } from '../ui/ButtonHelper';
import { isNestUIRegion, getRightPanelWidth, getBuildPanelX, getBuildPanelCenterX, NEST_LAYOUT, getRegionSwitcherX, getRegionSwitcherY, getNestGridOrigin } from '../ui/MobileUILayout';
import { ROOM_DEFINITIONS, getDemolishRefund, isUniqueRoom, type RoomDefinition, type RoomType } from '../systems/BuildingSystem';
import { NestWorldZoom } from '../ui/NestWorldZoom';
import { gridToScreen, screenToGrid, drawGridCell } from '../utils/grid';
import { createNestTopDownBackground } from '../graphics/NestTopDownFloor';
import { buildingTextureKey, buildingDisplayScale } from '../assets/AssetKeys';
import { spawnAmbientDust } from '../graphics/ApartmentEnvironment';
import { screenShake, addWarmGlow } from '../graphics/VisualEffects';
import { DEPTH } from '../graphics/SceneDepth';
import { spawnBuildSparkles } from '../graphics/ParticleEffects';
import { playBuildAnimation, playUpgradeAnimation } from '../graphics/BuildAnimation';
import { createCockroachSprite, syncCockroachMovement } from '../graphics/CockroachSprite';
import { i18n, L, fmt } from '../../i18n';
import { AnalyticsService } from '../../platforms/AnalyticsService';
import { SoundManager } from '../audio/SoundManager';
import { leaderboardService, LEADERBOARD_IDS } from '../../platforms/LeaderboardService';
import { platformManager } from '../../platforms/PlatformManager';
import {
  DEATH_HOSPITAL_HEALTH,
  BEDROOM_HEAL_PER_LEVEL,
  SHELTER_HEAL_PER_LEVEL,
  NICHE_HEAL_PER_LEVEL,
  COUNTER_RAID_INTERVAL_SEC,
  NEST_FOOD_DRAIN_TUTORIAL_MULT,
} from '../systems/GameBalance';
import { getHospitalNestHealPerSec } from '../systems/BuildingBonuses';
import { TutorialOverlay } from '../ui/TutorialOverlay';
import { TUTORIAL_STEP_COUNT, TUTORIAL_DISMISSABLE_STEPS } from '../systems/TutorialSystem';
import type { TutorialStepId } from '../systems/TutorialSystem';
import type { TutorialTarget } from '../ui/TutorialOverlay';
import { SS_REGISTRY } from '../../dev/screenshotRegistry';

export class NestScene extends Phaser.Scene {
  private state = GameState.getInstance();
  private hud!: ResourceHUD;
  private dailyPanel = new DailyPanel();
  private breedingPanel = new BreedingPanel();
  private eventBanner = new EventBanner();
  private shopPanel = new ShopPanel();
  private seasonPassPanel = new SeasonPassPanel();
  private originX = 0;
  private originY = 380;
  private worldRoot!: Phaser.GameObjects.Container;
  private worldZoom!: NestWorldZoom;
  private tilesLayer!: Phaser.GameObjects.Container;
  private tileSprites = new Map<string, Phaser.GameObjects.Graphics>();
  private hoverLabel: Phaser.GameObjects.Text | null = null;
  private buildingsLayer!: Phaser.GameObjects.Container;
  private selectedRoom: RoomType = 'kitchen';
  /** none = look around; build/upgrade/demolish only after choosing a tool */
  private editMode: 'none' | 'build' | 'upgrade' | 'demolish' = 'none';
  private infoText!: Phaser.GameObjects.Text;
  private cockroach!: Phaser.GameObjects.Sprite;
  private roachTarget = { x: 0, y: 0 };
  private readonly roachSpeed = 48;
  private lastTick = 0;
  private counterRaidTimer = 0;
  private storageCapHintShown = false;
  private hoverCell: { gx: number; gy: number } | null = null;
  private dustEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private tutorialOverlay = new TutorialOverlay();
  private foodArcadeBtn = { x: 320, y: GAME_HEIGHT - 70, width: 100, height: 40 };
  private slipperArcadeBtn = { x: 200, y: GAME_HEIGHT - 70, width: 100, height: 40 };
  private trapBtn = { x: 140, y: 180, width: 200, height: 40 };
  private worldMapBtn = { x: 156, y: 218, width: 200, height: 36 };

  constructor() {
    super(SCENES.NEST);
  }

  create(): void {
    const region = this.state.getNestRegion();
    const isBalcony = region === 'balcony';
    const isStairwell = region === 'stairwell';
    this.cameras.main.setBackgroundColor(
      isStairwell ? 0x263238 : isBalcony ? 0x1a2e1a : COLORS.bgWarm,
    );
    this.originX = getNestGridOrigin().x;
    this.originY = getNestGridOrigin().y;
    this.lastTick = 0;
    this.counterRaidTimer = COUNTER_RAID_INTERVAL_SEC * 0.6;
    this.storageCapHintShown = false;
    this.selectedRoom = isStairwell ? 'locker' : isBalcony ? 'planter' : 'kitchen';

    const floor = createNestTopDownBackground(this, region);
    addWarmGlow(this, GAME_WIDTH / 2, 40, DEPTH.ambient, 0.6);

    this.dustEmitter = spawnAmbientDust(this);

    this.tilesLayer = this.add.container(0, 0);
    this.buildingsLayer = this.add.container(0, 0);
    this.worldRoot = this.add.container(0, 0).setDepth(DEPTH.floor);
    this.worldRoot.add([floor, this.tilesLayer, this.buildingsLayer]);
    this.worldZoom = new NestWorldZoom(this, this.worldRoot);

    this.hud = new ResourceHUD();
    this.hud.create(this);
    this.eventBanner.create(this);
    this.dailyPanel.createHudButton(this);
    this.breedingPanel.createHudButton(this);
    this.shopPanel.createHudButton(this);
    this.seasonPassPanel.createHudButton(this);

    this.state.dailyQuests.checkAndReset();
    const bonus = this.state.dailyBonus.checkDailyBonus();
    if (
      bonus.available &&
      !this.state.tutorial.isActive() &&
      !this.registry.get(SS_REGISTRY.SKIP_DAILY_POPUP) &&
      !isAutotestMode()
    ) {
      this.time.delayedCall(400, () => {
        this.dailyPanel.show(this);
        showToast(this, L().daily.welcomeBonus);
      });
    }

    this.createRegionSwitcher();

    this.createBuildPanel();
    this.createDefensePanel();
    this.createArcadePanel();
    this.createCockroach();

    this.infoText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 28, '', {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '17px',
        color: '#fff8e1',
        stroke: '#1a1208',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (isNestUIRegion(pointer.x, pointer.y)) {
        this.hoverCell = null;
        this.clearHoverTint();
        return;
      }
      const world = this.worldZoom.screenToWorld(pointer.x, pointer.y);
      const { gridX, gridY } = screenToGrid(world.x, world.y, this.originX, this.originY);
      if (
        this.hoverCell?.gx !== gridX ||
        this.hoverCell?.gy !== gridY
      ) {
        this.hoverCell = { gx: gridX, gy: gridY };
        this.drawHoverHighlight();
      }
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (isNestUIRegion(pointer.x, pointer.y)) return;
      // RMB — cancel current build/upgrade/demolish tool
      if (!pointer.wasTouch && pointer.rightButtonDown()) {
        this.cancelEditMode();
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (isNestUIRegion(pointer.x, pointer.y)) return;
      if (!pointer.wasTouch && pointer.button === 2) return; // ignore RMB release
      if (!pointer.wasTouch && pointer.button !== 0 && pointer.button !== undefined) return;
      if (this.input.manager.pointers.filter((p) => p.isDown && (p.wasTouch || p.leftButtonDown())).length > 0) {
        return;
      }
      if (!this.worldZoom.allowGridTap()) return;
      if (this.editMode === 'none') return;
      const world = this.worldZoom.screenToWorld(pointer.x, pointer.y);
      this.handleGridClick(world.x, world.y);
    });

    this.input.keyboard?.on('keydown-ESC', () => {
      this.state.persist();
      this.scene.start(SCENES.MENU);
    });

    this.refreshWorld();
    this.updateInfo();
    SoundManager.getInstance().playMusic('ambient_nest');
    platformManager.gameplayStart();
    this.time.delayedCall(300, () => this.refreshTutorial());
    this.time.delayedCall(500, () => this.applyScreenshotPanels());
  }

  private applyScreenshotPanels(): void {
    const panel = this.registry.get(SS_REGISTRY.NEST_PANEL) as string | null;
    if (!panel) return;

    if (panel === 'breeding') {
      this.breedingPanel.show(this);
    } else if (panel === 'shop-daily') {
      this.dailyPanel.show(this);
      this.shopPanel.show(this);
    }
  }

  private createRegionSwitcher(): void {
    const t = L();
    const region = this.state.getNestRegion();
    const label =
      region === 'stairwell'
        ? t.nest.switchApartment
        : region === 'balcony'
          ? t.nest.switchStairwell
          : t.nest.switchBalcony;

    createAdaptiveButton(this, getRegionSwitcherX(), getRegionSwitcherY(), label, () => {
      const target = this.state.getNextNestRegion();
      if (target === 'balcony' && !this.state.isBalconyUnlocked()) {
        showToast(this, t.nest.balconyLocked);
        return;
      }
      if (target === 'stairwell' && !this.state.isStairwellUnlocked()) {
        showToast(this, t.nest.stairwellLocked);
        return;
      }
      this.state.switchNestRegion(target);
      this.scene.restart();
    }, 168, 32, 'ui_click', DEPTH.hud + 8);
  }

  shutdown(): void {
    this.clearHoverLabel();
    this.eventBanner.destroy();
    this.dustEmitter?.destroy();
    this.tutorialOverlay.destroy();
    platformManager.gameplayStop();
    SoundManager.getInstance().stopMusic();
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;
    this.counterRaidTimer += dt;
    if (this.counterRaidTimer >= COUNTER_RAID_INTERVAL_SEC) {
      this.counterRaidTimer = 0;
      this.tryCounterRaid();
    }

    this.lastTick += dt;
    if (this.lastTick >= 1) {
      const rooms = this.state.building.getRooms();
      const hatched = this.state.breeding.updateTimers();
      if (hatched.length > 0) {
        this.state.breeding.syncMaxCapacity(rooms);
        this.breedingPanel.refreshHudButton(this);
        this.state.persist();
      }
      this.state.economy.tickNest(
        this.lastTick,
        this.state.tutorial.isActive() ? NEST_FOOD_DRAIN_TUTORIAL_MULT : 1,
      );
      const workerBonus = 1 + this.state.breeding.getRoleBonus('worker');
      const foodMult = this.state.liveOps.getEventMultiplier('passive_food') * workerBonus;
      this.state.economy.applyPassiveIncome(rooms, this.lastTick, {
        food: foodMult,
        money: workerBonus,
      });
      this.maybeShowStorageCapHint(rooms);
      const bedroom = rooms.find((r) => r.type === 'bedroom');
      if (bedroom) {
        this.state.economy.heal(BEDROOM_HEAL_PER_LEVEL * bedroom.level * this.lastTick);
      }
      const shelter = rooms.find((r) => r.type === 'shelter');
      if (shelter) {
        this.state.economy.heal(SHELTER_HEAL_PER_LEVEL * shelter.level * this.lastTick);
      }
      const niche = rooms.find((r) => r.type === 'niche');
      if (niche) {
        this.state.economy.heal(NICHE_HEAL_PER_LEVEL * niche.level * this.lastTick);
      }
      const hospitalHeal = getHospitalNestHealPerSec(this.state.getAllNestRooms());
      if (hospitalHeal > 0) {
        this.state.economy.heal(hospitalHeal * this.lastTick);
      }
      this.lastTick = 0;
      this.hud.refresh();
      if (this.state.economy.health <= 0) {
        showToast(this, L().nest.died);
        this.state.economy.health = DEATH_HOSPITAL_HEALTH;
        this.state.persist();
        this.scene.start(SCENES.HOSPITAL);
      }
    }

    this.updateRoach(delta);
  }

  private tryCounterRaid(): void {
    const result = this.state.runCounterRaid();
    if (!result) return;

    const t = L().nest;
    if (result.blocked) {
      this.showCounterRaidBanner(
        fmt(t.counterRaidBlocked, { defense: result.defense }),
        0x43a047,
      );
      SoundManager.getInstance().playSFX('ui_click');
    } else {
      this.showCounterRaidBanner(
        fmt(t.counterRaidHit, { food: result.foodLost, money: result.moneyLost }),
        0xe53935,
      );
      screenShake(this, 180, 0.01);
      SoundManager.getInstance().playSFX('arcade_hit');
    }

    this.hud.refresh();
    this.state.persist();
  }

  /** Temporary top banner so counter-raids are obvious without reading a tiny toast. */
  private showCounterRaidBanner(message: string, accent: number): void {
    const y = 72;
    const bg = this.add
      .rectangle(GAME_WIDTH / 2, y, 560, 48, 0x1a1208, 0.92)
      .setStrokeStyle(2, accent, 0.9)
      .setDepth(DEPTH.hud + 40);
    const text = this.add
      .text(GAME_WIDTH / 2, y, message, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '18px',
        color: '#fff8e1',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud + 41);

    this.tweens.add({
      targets: [bg, text],
      alpha: { from: 0, to: 1 },
      y: { from: y - 16, to: y },
      duration: 280,
      ease: 'Back.easeOut',
    });
    this.tweens.add({
      targets: [bg, text],
      alpha: 0,
      delay: 2800,
      duration: 400,
      onComplete: () => {
        bg.destroy();
        text.destroy();
      },
    });
  }

  private maybeShowStorageCapHint(rooms: { type: string; level: number }[]): void {
    if (this.storageCapHintShown) return;
    const { food, money } = this.state.economy.getPassiveIncome(rooms);
    if (food <= 0 && money <= 0) return;

    const atFoodCap = food > 0 && this.state.economy.food >= this.state.economy.maxFoodCap - 1;
    const atMoneyCap = money > 0 && this.state.economy.money >= this.state.economy.maxMoneyCap - 1;
    if (!atFoodCap && !atMoneyCap) return;

    this.storageCapHintShown = true;
    showToast(this, L().nest.storageCapFull);
  }

  private updateRoach(delta: number): void {
    const dx = this.roachTarget.x - this.cockroach.x;
    const dy = this.roachTarget.y - this.cockroach.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 4) {
      this.roachTarget = this.pickRoachWaypoint();
      return;
    }

    this.cockroach.anims.resume();
    const step = this.roachSpeed * (delta / 1000);
    const moveX = (dx / dist) * step;
    const moveY = (dy / dist) * step;
    this.cockroach.x += moveX;
    this.cockroach.y += moveY;
    syncCockroachMovement(this.cockroach, dx, dy);
  }

  private pickRoachWaypoint(): { x: number; y: number } {
    const { gridWidth, gridHeight } = this.state.building;
    const gx = Phaser.Math.Between(0, gridWidth - 1);
    const gy = Phaser.Math.Between(0, gridHeight - 1);
    const { x, y } = gridToScreen(gx, gy, this.originX, this.originY);
    return { x, y };
  }

  private createCockroach(): void {
    const start = this.pickRoachWaypoint();
    this.cockroach = createCockroachSprite(
      this,
      start.x,
      start.y,
      1.8,
      50,
      this.state.skins.getTint(),
    );
    this.worldRoot.add(this.cockroach);
    this.roachTarget = this.pickRoachWaypoint();
  }

  private createBuildPanel(): void {
    const t = L();
    const panelW = getRightPanelWidth();
    const panelX = getBuildPanelX();
    const panelTop = NEST_LAYOUT.buildPanelTop;
    const uiDepth = DEPTH.hud + 4;
    createPanel(this, panelX, panelTop, panelW, NEST_LAYOUT.buildPanelH, 0.92, DEPTH.ui);
    this.add
      .text(panelX + 12, panelTop + 10, t.nest.building, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '18px',
        color: '#fff8e1',
        stroke: '#3e2723',
        strokeThickness: 2,
      })
      .setDepth(uiDepth);

    const unlocked = this.state.building.getUnlockedRooms();
    const btnW = panelW - 20;
    unlocked.forEach((type, i) => {
      const def = ROOM_DEFINITIONS[type];
      const costs = this.getDiscountedCosts(def);
      const uniqueMark = isUniqueRoom(type) ? ' ·1' : '';
      createAdaptiveButton(
        this,
        getBuildPanelCenterX(),
        panelTop + 52 + i * 50,
        `${i18n.roomName(type)}${uniqueMark}\n${costs.money}💰  ${i18n.roomBenefit(type)}`,
        () => {
          if (isUniqueRoom(type) && this.state.building.countOfType(type) >= 1) {
            showToast(this, fmt(t.nest.uniqueOnly, { room: i18n.roomName(type) }));
            return;
          }
          this.selectedRoom = type;
          this.editMode = 'build';
          showToast(this, fmt(t.nest.selected, { room: i18n.roomName(type) }));
          showToast(this, i18n.roomDesc(type));
          this.updateInfo();
        },
        btnW,
        44,
        'ui_click',
        uiDepth,
      );
    });

    createAdaptiveButton(
      this,
      getBuildPanelCenterX(),
      panelTop + 52 + unlocked.length * 50 + 6,
      t.nest.upgrade,
      () => {
        this.editMode = 'upgrade';
        showToast(this, t.nest.clickUpgrade);
        this.updateInfo();
      },
      btnW,
      40,
      'ui_click',
      uiDepth,
    );

    createAdaptiveButton(
      this,
      getBuildPanelCenterX(),
      panelTop + 52 + unlocked.length * 50 + 52,
      t.nest.demolish,
      () => {
        this.editMode = 'demolish';
        showToast(this, t.nest.clickDemolish);
        this.updateInfo();
      },
      btnW,
      40,
      'ui_click',
      uiDepth,
    );
  }

  private createDefensePanel(): void {
    const t = L();
    const uiDepth = DEPTH.hud + 4;
    const panelTop = NEST_LAYOUT.defensePanelTop;
    const panelW = NEST_LAYOUT.defensePanelW;
    const panelH = NEST_LAYOUT.defensePanelH;
    const headerH = 36;
    const btnH = 40;
    const btnGap = 8;
    const firstBtnY = panelTop + headerH + btnH / 2;
    const rowStep = btnH + btnGap;

    createPanel(this, NEST_LAYOUT.sideMargin, panelTop, panelW, panelH, 0.92, DEPTH.ui);
    this.add
      .text(NEST_LAYOUT.sideMargin + 12, panelTop + 10, t.nest.defense, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '16px',
        color: '#fff8e1',
        stroke: '#3e2723',
        strokeThickness: 2,
      })
      .setDepth(uiDepth);

    const traps: { key: 'slipper' | 'spray' | 'glue'; label: string }[] = [
      { key: 'slipper', label: t.nest.trapSlipper },
      { key: 'spray', label: t.nest.trapSpray },
      { key: 'glue', label: t.nest.trapGlue },
    ];

    const trapBtnW = panelW - 20;
    const centerX = NEST_LAYOUT.sideMargin + panelW / 2;
    traps.forEach((tr, i) => {
      const active = this.state.raid.defenseTraps.includes(tr.key);
      createAdaptiveButton(
        this,
        centerX,
        firstBtnY + i * rowStep,
        active ? `${tr.label} ✓` : tr.label,
        () => {
          this.state.raid.toggleTrap(tr.key);
          this.state.tutorial.onTrapToggled();
          this.state.persist();
          showToast(this, t.nest.trapsSaved);
          this.refreshTutorial();
          this.scene.restart();
        },
        trapBtnW,
        btnH,
        'ui_click',
        uiDepth,
      );
    });
    this.trapBtn = {
      x: centerX,
      y: firstBtnY,
      width: trapBtnW,
      height: btnH,
    };

    const mapY = firstBtnY + traps.length * rowStep + 4;
    createAdaptiveButton(
      this,
      centerX,
      mapY,
      t.nest.worldMap,
      () => {
        this.state.persist();
        this.scene.start(SCENES.WORLD_MAP);
      },
      trapBtnW,
      btnH,
      'ui_click',
      uiDepth,
    );
    this.worldMapBtn = { x: centerX, y: mapY, width: trapBtnW, height: btnH };
  }

  private createArcadePanel(): void {
    const t = L();
    const panelH = NEST_LAYOUT.arcadePanelH;
    const panelBottom = NEST_LAYOUT.arcadePanelBottom;
    const panelY = GAME_HEIGHT - panelH - panelBottom;
    const panelW = NEST_LAYOUT.defensePanelW;
    const btnW = 112;
    const btnH = 40;
    const colGap = 12;
    const rowGap = 10;
    const headerH = 34;
    const gridStartX = NEST_LAYOUT.sideMargin + btnW / 2 + 8;
    const uiDepth = DEPTH.hud + 4;

    createPanel(this, NEST_LAYOUT.sideMargin, panelY, panelW, panelH, 0.92, DEPTH.ui);
    this.add
      .text(NEST_LAYOUT.sideMargin + 12, panelY + 8, t.nest.dangers, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '15px',
        color: '#fff8e1',
        stroke: '#3e2723',
        strokeThickness: 2,
        wordWrap: { width: panelW - 24 },
      })
      .setDepth(uiDepth);

    const missions = [
      { label: t.nest.slipper, scene: SCENES.SLIPPER },
      { label: t.nest.spray, scene: SCENES.SPRAY },
      { label: t.nest.food, scene: SCENES.FOOD },
      { label: t.nest.catChase, scene: SCENES.CAT_CHASE },
    ];

    missions.forEach((m, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      createAdaptiveButton(
        this,
        gridStartX + col * (btnW + colGap),
        panelY + headerH + 16 + row * (btnH + rowGap),
        m.label,
        () => {
          if (m.scene === SCENES.FOOD) {
            this.state.tutorial.onFoodArcadeStarted();
          }
          if (m.scene === SCENES.SLIPPER) {
            this.state.tutorial.onSlipperStarted();
          }
          this.state.persist();
          this.scene.start(m.scene);
        },
        btnW,
        btnH,
        'ui_click',
        uiDepth,
      );
    });
    this.foodArcadeBtn = {
      x: gridStartX,
      y: panelY + headerH + 16 + btnH + rowGap,
      width: btnW,
      height: btnH,
    };
    this.slipperArcadeBtn = {
      x: gridStartX,
      y: panelY + headerH + 16,
      width: btnW,
      height: btnH,
    };
  }

  private clearHoverTint(): void {
    this.tileSprites.forEach((_tile, key) => {
      const [gx, gy] = key.split(',').map(Number);
      this.repaintGridCell(gx, gy);
    });
    this.clearHoverLabel();
  }

  private repaintGridCell(
    gx: number,
    gy: number,
    highlight?: 'ok' | 'bad',
  ): void {
    const tile = this.tileSprites.get(`${gx},${gy}`);
    if (!tile) return;
    const { x, y } = gridToScreen(gx, gy, this.originX, this.originY);
    const hasRoom = !!this.state.building.getRoomAt(gx, gy);
    let fill = hasRoom ? 0x66bb6a : 0xfff8e1;
    let alpha = hasRoom ? 0.1 : 0;
    let strokeAlpha = hasRoom ? 0.22 : 0.14;
    if (highlight === 'ok') {
      fill = 0x66bb6a;
      alpha = 0.32;
      strokeAlpha = 0.45;
    } else if (highlight === 'bad') {
      fill = 0xef5350;
      alpha = 0.32;
      strokeAlpha = 0.45;
    }
    tile.clear();
    drawGridCell(tile, x, y, fill, 0xfff8e1, alpha, strokeAlpha);
  }

  private clearHoverLabel(): void {
    this.hoverLabel?.destroy();
    this.hoverLabel = null;
  }

  private updateHoverLabel(): void {
    this.clearHoverLabel();
    if (!this.hoverCell) return;
    const room = this.state.building.getRoomAt(this.hoverCell.gx, this.hoverCell.gy);
    if (!room) return;
    const { x, y } = gridToScreen(this.hoverCell.gx, this.hoverCell.gy, this.originX, this.originY);
    const t = L();
    this.hoverLabel = this.add
      .text(
        x,
        y - 36,
        fmt(t.nest.roomLabel, { room: i18n.roomName(room.type), level: room.level }),
        {
          fontFamily: 'Segoe UI, Arial, sans-serif',
          fontSize: '16px',
          color: '#fff8e1',
          backgroundColor: '#1a1208ee',
          padding: { x: 10, y: 5 },
          stroke: '#000000',
          strokeThickness: 2,
        },
      )
      .setOrigin(0.5)
      .setDepth(DEPTH.hud + 2);
  }

  private drawHoverHighlight(): void {
    this.clearHoverTint();
    if (!this.hoverCell) return;
    const { gx, gy } = this.hoverCell;
    const { gridWidth, gridHeight } = this.state.building;
    if (gx < 0 || gy < 0 || gx >= gridWidth || gy >= gridHeight) return;

    if (this.editMode === 'none') {
      const occupied = !!this.state.building.getRoomAt(gx, gy);
      this.repaintGridCell(gx, gy, occupied ? 'ok' : undefined);
      this.updateHoverLabel();
      return;
    }

    const err =
      this.editMode === 'build' ? this.state.building.canBuild(this.selectedRoom, gx, gy) : null;
    const occupied = !!this.state.building.getRoomAt(gx, gy);
    let canPlace = false;
    if (this.editMode === 'build') canPlace = err === null;
    else if (this.editMode === 'upgrade' || this.editMode === 'demolish') canPlace = occupied;
    this.repaintGridCell(gx, gy, canPlace ? 'ok' : 'bad');
    this.updateHoverLabel();
  }

  private cancelEditMode(): void {
    if (this.editMode === 'none') return;
    this.editMode = 'none';
    showToast(this, L().nest.actionCancelled);
    this.updateInfo();
    this.drawHoverHighlight();
  }

  private handleGridClick(screenX: number, screenY: number): void {
    const t = L();
    const { gridX, gridY } = screenToGrid(screenX, screenY, this.originX, this.originY);
    const building = this.state.building;

    if (this.editMode === 'none') {
      return;
    }

    if (this.editMode === 'build') {
      const def = ROOM_DEFINITIONS[this.selectedRoom];
      const costs = this.getDiscountedCosts(def);
      const err = building.canBuild(this.selectedRoom, gridX, gridY);
      if (err) {
        showToast(this, i18n.buildError(err));
        return;
      }
      if (!this.state.economy.canAfford(costs.money, costs.food)) {
        showToast(this, t.nest.notEnoughResources);
        return;
      }
      this.state.economy.spend(costs.money, costs.food);
      const room = building.build(this.selectedRoom, gridX, gridY);
      if (room) {
        const { x, y } = gridToScreen(gridX, gridY, this.originX, this.originY);
        const instant = this.state.consumeInstantBuild();
        if (instant) {
          this.refreshWorld();
          spawnBuildSparkles(this, x, y);
          showToast(this, fmt(t.nest.built, { room: i18n.roomName(this.selectedRoom) }));
        } else {
          playBuildAnimation({
            scene: this,
            x,
            y,
            type: this.selectedRoom,
            level: 1,
            onComplete: () => this.refreshWorld(),
          });
          showToast(this, fmt(t.nest.built, { room: i18n.roomName(this.selectedRoom) }));
        }
        AnalyticsService.getInstance().trackBuildingPlaced(this.selectedRoom);
        SoundManager.getInstance().playSFX('build_place');
        this.state.trackDailyProgress('build', 1);
        if (this.selectedRoom === 'kitchen') {
          this.state.tutorial.onKitchenBuilt();
        }
        if (this.selectedRoom === 'bedroom') {
          this.state.tutorial.onBedroomBuilt();
        }
        this.refreshTutorial();
        void leaderboardService.submitScore(
          LEADERBOARD_IDS.COLONY_SIZE,
          this.state.getTotalBuildingCount(),
        );
        if (this.state.liveOps.isEventActive('build_cost')) {
          this.state.trackEventReward('build_week', 'build');
        }
        this.state.persist();
        this.state.breeding.syncMaxCapacity(building.getRooms());
        this.breedingPanel.refreshHudButton(this);
      }
    } else if (this.editMode === 'demolish') {
      const room = building.getRoomAt(gridX, gridY);
      if (!room) {
        showToast(this, t.nest.noBuilding);
        return;
      }
      const refund = getDemolishRefund(room);
      const removed = building.remove(gridX, gridY);
      if (!removed) return;
      this.state.economy.addMoney(refund.money);
      this.state.economy.addFood(refund.food);
      showToast(
        this,
        fmt(t.nest.demolished, {
          room: i18n.roomName(removed.type),
          money: refund.money,
          food: refund.food,
        }),
      );
      SoundManager.getInstance().playSFX('ui_click');
      this.refreshWorld();
      this.state.persist();
      this.state.breeding.syncMaxCapacity(building.getRooms());
      this.breedingPanel.refreshHudButton(this);
    } else {
      const room = building.getRoomAt(gridX, gridY);
      if (!room) {
        showToast(this, t.nest.noBuilding);
        return;
      }
      const def = ROOM_DEFINITIONS[room.type];
      if (room.level >= def.maxLevel) {
        showToast(this, t.nest.maxLevel);
        return;
      }
      const upgradeCost = this.getDiscountedUpgradeCost(def);
      if (!this.state.economy.canAfford(upgradeCost)) {
        showToast(this, t.nest.notEnoughMoney);
        return;
      }
      this.state.economy.spend(upgradeCost);
      building.upgrade(gridX, gridY);
      this.state.tutorial.onBuildingUpgraded();
      this.refreshTutorial();
      showToast(
        this,
        fmt(t.nest.upgraded, { room: i18n.roomName(room.type), level: room.level }),
      );
      AnalyticsService.getInstance().trackBuildingUpgraded(room.type, room.level);
      SoundManager.getInstance().playSFX('build_upgrade');
      if (this.state.liveOps.isEventActive('build_cost')) {
        this.state.trackEventReward('build_week', 'upgrade');
      }
      this.refreshWorld();
      const { x, y } = gridToScreen(gridX, gridY, this.originX, this.originY);
      for (let i = 0; i < this.buildingsLayer.length; i++) {
        const child = this.buildingsLayer.getAt(i);
        if (
          child instanceof Phaser.GameObjects.Image &&
          Phaser.Math.Distance.Between(child.x, child.y, x, y) < 12
        ) {
          playUpgradeAnimation(this, child, room.level);
          break;
        }
      }
      this.state.persist();
      this.state.breeding.syncMaxCapacity(building.getRooms());
      this.breedingPanel.refreshHudButton(this);
    }

    this.hud.refresh();
    this.updateInfo();
  }

  private refreshWorld(): void {
    this.state.refreshNestBonuses();
    this.refreshGridTiles();
    this.refreshBuildingSprites();
    this.drawHoverHighlight();
  }

  private refreshGridTiles(): void {
    this.tilesLayer.removeAll(true);
    this.tileSprites.clear();
    const { gridWidth, gridHeight } = this.state.building;

    for (let gy = 0; gy < gridHeight; gy++) {
      for (let gx = 0; gx < gridWidth; gx++) {
        const tile = this.add.graphics();
        this.tilesLayer.add(tile);
        this.tileSprites.set(`${gx},${gy}`, tile);
        this.repaintGridCell(gx, gy);
      }
    }
  }

  private refreshBuildingSprites(): void {
    this.buildingsLayer.removeAll(true);

    const rooms = [...this.state.building.getRooms()].sort(
      (a, b) => a.gridX + a.gridY - (b.gridX + b.gridY),
    );

    for (const room of rooms) {
      const { x, y } = gridToScreen(room.gridX, room.gridY, this.originX, this.originY);
      const key = buildingTextureKey(room.type, room.level);

      const scale = buildingDisplayScale(room.level);
      const sprite = this.add.image(x, y, key);
      sprite.setOrigin(0.5, 0.55);
      sprite.setScale(scale);

      this.buildingsLayer.add(sprite);
    }
  }

  private getDiscountedCosts(def: RoomDefinition): { money: number; food: number } {
    const mult = this.state.liveOps.getEventMultiplier('build_cost');
    return {
      money: Math.max(1, Math.ceil(def.moneyCost * mult)),
      food: Math.ceil(def.foodCost * mult),
    };
  }

  private getDiscountedUpgradeCost(def: RoomDefinition): number {
    const mult = this.state.liveOps.getEventMultiplier('build_cost');
    return Math.max(1, Math.ceil(def.upgradeMoneyCost * mult));
  }

  private updateInfo(): void {
    const count = this.state.building.getRooms().length;
    const t = L();
    const region = this.state.getNestRegion();
    const regionHint =
      region === 'balcony'
        ? `  •  ${t.nest.balconyTitle}`
        : region === 'stairwell'
          ? `  •  ${t.nest.stairwellTitle}`
          : '';

    let modeHint = t.nest.modeIdle;
    if (this.editMode === 'build') {
      modeHint = fmt(t.nest.modeBuild, { room: i18n.roomName(this.selectedRoom) });
    } else if (this.editMode === 'upgrade') {
      modeHint = t.nest.modeUpgrade;
    } else if (this.editMode === 'demolish') {
      modeHint = t.nest.modeDemolish;
    }

    const cancelHint = isMobileDevice() ? '' : `  •  ${t.nest.rmbCancel}`;
    this.infoText.setText(
      `${fmt(t.nest.info, { count })}${regionHint}  •  ${modeHint}${cancelHint}`,
    );
  }

  private refreshTutorial(): void {
    if (isAutotestMode()) {
      this.tutorialOverlay.destroy();
      return;
    }
    if (!this.state.tutorial.isActive()) {
      this.tutorialOverlay.destroy();
      return;
    }

    const t = L().tutorial;
    const step = this.state.tutorial.currentStep;
    const stepIndex = this.state.tutorial.getStepIndex();
    const dismissable = TUTORIAL_DISMISSABLE_STEPS.includes(step);

    const onSkip = (): void => {
      this.state.skipTutorial();
      this.tutorialOverlay.destroy();
      showToast(this, t.skipped);
    };

    const onNext = (): void => {
      if (!dismissable) return;
      this.state.tutorial.advance();
      this.state.persist();
      this.refreshTutorial();
    };

    let message = t.welcome;
    let target: TutorialTarget | undefined;

    switch (step as TutorialStepId) {
      case 'welcome':
        message = t.welcome;
        break;
      case 'buildKitchen':
        message = t.buildKitchen;
        target = { x: this.originX + 200, y: this.originY + 120, width: 420, height: 280 };
        break;
      case 'passiveTip':
        message = t.passiveTip;
        break;
      case 'buildBedroom':
        message = t.buildBedroom;
        target = { x: this.originX + 200, y: this.originY + 120, width: 420, height: 280 };
        break;
      case 'foodArcade':
        message = t.foodArcade;
        target = this.foodArcadeBtn;
        break;
      case 'setTrap':
        message = t.setTrap;
        target = this.trapBtn;
        break;
      case 'trySlipper':
        message = t.trySlipper;
        target = this.slipperArcadeBtn;
        break;
      case 'upgradeTip':
        message = t.upgradeTip;
        break;
      case 'worldMap':
        message = t.worldMap;
        target = this.worldMapBtn;
        break;
      default:
        this.tutorialOverlay.destroy();
        return;
    }

    this.tutorialOverlay.show(this, message, stepIndex, TUTORIAL_STEP_COUNT, {
      target,
      nextLabel: dismissable ? t.gotIt : t.hint,
      skipLabel: t.skip,
      onNext: dismissable ? onNext : () => undefined,
      onSkip,
      hideNext: !dismissable,
    });
  }
}
