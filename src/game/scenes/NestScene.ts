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
import { ROOM_DEFINITIONS, type RoomDefinition, type RoomType } from '../systems/BuildingSystem';
import { gridToScreen, screenToGrid, drawGridCell } from '../utils/grid';
import { createNestTopDownBackground } from '../graphics/NestTopDownFloor';
import { buildingTextureKey, buildingDisplayScale } from '../assets/AssetKeys';
import { spawnAmbientDust } from '../graphics/ApartmentEnvironment';
import { addWarmGlow } from '../graphics/VisualEffects';
import { DEPTH } from '../graphics/SceneDepth';
import { spawnBuildSparkles } from '../graphics/ParticleEffects';
import { playBuildAnimation, playUpgradeAnimation } from '../graphics/BuildAnimation';
import { createCockroachSprite, syncCockroachMovement } from '../graphics/CockroachSprite';
import { i18n, L, fmt } from '../../i18n';
import { AnalyticsService } from '../../platforms/AnalyticsService';
import { SoundManager } from '../audio/SoundManager';
import { leaderboardService, LEADERBOARD_IDS } from '../../platforms/LeaderboardService';
import {
  DEATH_HOSPITAL_HEALTH,
  BEDROOM_HEAL_PER_LEVEL,
  SHELTER_HEAL_PER_LEVEL,
} from '../systems/GameBalance';
import { TutorialOverlay } from '../ui/TutorialOverlay';
import { TUTORIAL_STEP_COUNT } from '../systems/TutorialSystem';
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
  private tilesLayer!: Phaser.GameObjects.Container;
  private tileSprites = new Map<string, Phaser.GameObjects.Graphics>();
  private hoverLabel: Phaser.GameObjects.Text | null = null;
  private buildingsLayer!: Phaser.GameObjects.Container;
  private selectedRoom: RoomType = 'kitchen';
  private buildMode = true;
  private infoText!: Phaser.GameObjects.Text;
  private cockroach!: Phaser.GameObjects.Sprite;
  private roachTarget = { x: 0, y: 0 };
  private readonly roachSpeed = 48;
  private lastTick = 0;
  private hoverCell: { gx: number; gy: number } | null = null;
  private dustEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private tutorialOverlay = new TutorialOverlay();
  private foodArcadeBtn = { x: 320, y: GAME_HEIGHT - 70, width: 100, height: 40 };
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
    this.selectedRoom = isStairwell ? 'locker' : isBalcony ? 'planter' : 'kitchen';

    createNestTopDownBackground(this, region);
    addWarmGlow(this, GAME_WIDTH / 2, 40, DEPTH.ambient, 0.6);

    this.dustEmitter = spawnAmbientDust(this);

    this.tilesLayer = this.add.container(0, 0).setDepth(DEPTH.floor);
    this.buildingsLayer = this.add.container(0, 0).setDepth(DEPTH.world);

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
      const { gridX, gridY } = screenToGrid(pointer.x, pointer.y, this.originX, this.originY);
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
      this.handleGridClick(pointer.x, pointer.y);
    });

    this.input.keyboard?.on('keydown-ESC', () => {
      this.state.persist();
      this.scene.start(SCENES.MENU);
    });

    this.refreshWorld();
    this.updateInfo();
    SoundManager.getInstance().playMusic('ambient_nest');
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
    SoundManager.getInstance().stopMusic();
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;
    this.lastTick += dt;
    if (this.lastTick >= 1) {
      const rooms = this.state.building.getRooms();
      const hatched = this.state.breeding.updateTimers();
      if (hatched.length > 0) {
        this.state.breeding.syncMaxCapacity(rooms);
        this.breedingPanel.refreshHudButton(this);
        this.state.persist();
      }
      this.state.economy.tickNest(this.lastTick);
      const workerBonus = 1 + this.state.breeding.getRoleBonus('worker');
      const foodMult = this.state.liveOps.getEventMultiplier('passive_food') * workerBonus;
      this.state.economy.applyPassiveIncome(rooms, this.lastTick, {
        food: foodMult,
        money: workerBonus,
      });
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
        this.state.economy.heal(0.6 * niche.level * this.lastTick);
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
      createAdaptiveButton(
        this,
        getBuildPanelCenterX(),
        panelTop + 52 + i * 50,
        `${i18n.roomName(type)}\n${costs.money}💰`,
        () => {
          this.selectedRoom = type;
          this.buildMode = true;
          showToast(this, fmt(t.nest.selected, { room: i18n.roomName(type) }));
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
        this.buildMode = false;
        showToast(this, t.nest.clickUpgrade);
      },
      btnW,
      44,
      'ui_click',
      uiDepth,
    );
  }

  private createDefensePanel(): void {
    const t = L();
    const uiDepth = DEPTH.hud + 4;
    const panelTop = NEST_LAYOUT.defensePanelTop;
    const panelW = NEST_LAYOUT.defensePanelW;
    createPanel(this, NEST_LAYOUT.sideMargin, panelTop, panelW, NEST_LAYOUT.defensePanelH, 0.92, DEPTH.ui);
    this.add
      .text(NEST_LAYOUT.sideMargin + 12, panelTop + 10, t.nest.defense, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '18px',
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
    traps.forEach((tr, i) => {
      const active = this.state.raid.defenseTraps.includes(tr.key);
      createAdaptiveButton(
        this,
        NEST_LAYOUT.sideMargin + panelW / 2,
        panelTop + 44 + i * 42,
        active ? `${tr.label} ✓` : tr.label,
        () => {
          this.state.raid.toggleTrap(tr.key);
          this.state.persist();
          showToast(this, t.nest.trapsSaved);
          this.scene.restart();
        },
        trapBtnW,
        38,
        'ui_click',
        uiDepth,
      );
    });

    createAdaptiveButton(
      this,
      NEST_LAYOUT.sideMargin + panelW / 2,
      panelTop + NEST_LAYOUT.defensePanelH + 18,
      t.nest.worldMap,
      () => {
        this.state.persist();
        this.scene.start(SCENES.WORLD_MAP);
      },
      trapBtnW,
      38,
      'ui_click',
      uiDepth,
    );
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
    const gridStartX = NEST_LAYOUT.sideMargin + btnW / 2 + 8;
    const uiDepth = DEPTH.hud + 4;

    createPanel(this, NEST_LAYOUT.sideMargin, panelY, panelW, panelH, 0.92, DEPTH.ui);
    this.add
      .text(NEST_LAYOUT.sideMargin + 14, panelY + 10, t.nest.dangers, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '18px',
        color: '#fff8e1',
        stroke: '#3e2723',
        strokeThickness: 2,
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
        panelY + 50 + row * (btnH + rowGap),
        m.label,
        () => {
          if (m.scene === SCENES.FOOD) {
            this.state.tutorial.onFoodArcadeStarted();
            this.state.persist();
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
      x: gridStartX + btnW + colGap,
      y: panelY + 50 + btnH + rowGap,
      width: btnW,
      height: btnH,
    };
    this.worldMapBtn = {
      x: NEST_LAYOUT.sideMargin + NEST_LAYOUT.defensePanelW / 2,
      y: NEST_LAYOUT.defensePanelTop + NEST_LAYOUT.defensePanelH + 18,
      width: panelW - 20,
      height: 38,
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

    const err = this.buildMode ? this.state.building.canBuild(this.selectedRoom, gx, gy) : null;
    const canPlace = err === null;
    this.repaintGridCell(gx, gy, canPlace ? 'ok' : 'bad');
    this.updateHoverLabel();
  }

  private handleGridClick(screenX: number, screenY: number): void {
    const t = L();
    const { gridX, gridY } = screenToGrid(screenX, screenY, this.originX, this.originY);
    const building = this.state.building;

    if (this.buildMode) {
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
    const info = isMobileDevice()
      ? `${fmt(t.nest.info, { count })}${regionHint}  •  ${t.mobile.tapToBuild}`
      : `${fmt(t.nest.info, { count })}${regionHint}`;
    this.infoText.setText(info);
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

    const onSkip = (): void => {
      this.state.skipTutorial();
      this.tutorialOverlay.destroy();
    };

    const onNext = (): void => {
      if (step === 'welcome') {
        this.state.tutorial.advance();
        this.state.persist();
        this.refreshTutorial();
      }
    };

    let message = t.welcome;
    let target: TutorialTarget | undefined;

    switch (step) {
      case 'welcome':
        message = t.welcome;
        break;
      case 'buildKitchen':
        message = t.buildKitchen;
        target = { x: this.originX + 200, y: this.originY + 90, width: 500, height: 240 };
        break;
      case 'foodArcade':
        message = t.foodArcade;
        target = this.foodArcadeBtn;
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
      nextLabel: step === 'welcome' ? t.next : t.next,
      skipLabel: t.skip,
      onNext: step === 'welcome' ? onNext : () => undefined,
      onSkip,
    });
  }
}
