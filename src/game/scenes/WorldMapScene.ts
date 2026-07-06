import Phaser from 'phaser';
import { SCENES, COLORS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { GameState } from '../GameState';
import { createPanel, showToast, createAdaptiveButton } from '../ui/ButtonHelper';
import { isWorldMapUIRegion, mapPickRadius } from '../ui/MobileUILayout';
import {
  getDistrictsForRegion,
  getBotsForRegion,
  buildPlayerMapEntry,
  findDistrict,
  type MapRegion,
} from '../systems/WorldMapData';
import { TUTORIAL_STEP_COUNT } from '../systems/TutorialSystem';
import {
  addWorldMapBackground,
  addNestMarker,
  addNeutralCrumb,
  addDistrictGlow,
  createRaidTrailImages,
} from '../graphics/WorldMapRenderer';
import { TutorialOverlay } from '../ui/TutorialOverlay';
import type { MapPlayer } from '../types';
import { L, fmt, mapPlayerName } from '../../i18n';

type RaidErrorKey = 'noEnergy' | 'dailyLimit' | 'shielded' | 'self';

export class WorldMapScene extends Phaser.Scene {
  private state = GameState.getInstance();
  private markersLayer!: Phaser.GameObjects.Container;
  private trailLayer!: Phaser.GameObjects.Container;
  private selected: MapPlayer | null = null;
  private panelContainer: Phaser.GameObjects.Container | null = null;
  private pulse = 0;
  private playerEntry!: MapPlayer;
  private allPlayers: MapPlayer[] = [];
  private mapRegion: MapRegion = 'apartment';
  private tutorialOverlay = new TutorialOverlay();

  private crumbSpotsApartment = [
    { x: 640, y: 380 },
    { x: 400, y: 450 },
    { x: 860, y: 440 },
  ];

  private crumbSpotsBalcony = [
    { x: 350, y: 200 },
    { x: 820, y: 180 },
    { x: 580, y: 240 },
  ];

  private crumbSpotsStairwell = [
    { x: 300, y: 260 },
    { x: 620, y: 220 },
    { x: 900, y: 280 },
  ];

  constructor() {
    super(SCENES.WORLD_MAP);
  }

  init(data: { mapRegion?: MapRegion }): void {
    if (data?.mapRegion) {
      this.mapRegion = data.mapRegion;
      return;
    }
    const playerDistrict = findDistrict(GameState.getInstance().raid.playerDistrict);
    this.mapRegion = playerDistrict?.region ?? 'apartment';
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.bgDark);
    this.state.raid.refreshDailyRaids();
    addWorldMapBackground(this, this.mapRegion);
    const visibleDistricts = getDistrictsForRegion(
      this.mapRegion,
      this.state.getTotalBuildingCount(),
      this.state.raid.raidRating,
      this.state.getBalconyBuildingCount(),
      this.state.isBalconyUnlocked(),
    );
    addDistrictGlow(this, visibleDistricts);
    this.markersLayer = this.add.container(0, 0).setDepth(20);
    this.trailLayer = this.add.container(0, 0).setDepth(30);

    this.refreshPlayers();
    this.drawDistrictLabels();
    this.createChrome();
    this.handleTutorialOnEnter();

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (isWorldMapUIRegion(p.x, p.y)) return;
      this.pickPlayer(p.x, p.y);
    });

    this.input.keyboard?.on('keydown-ESC', () => {
      this.state.persist();
      this.scene.start(SCENES.NEST);
    });
  }

  shutdown(): void {
    this.tutorialOverlay.destroy();
  }

  private refreshPlayers(): void {
    this.playerEntry = buildPlayerMapEntry(
      this.state.economy.food,
      this.state.economy.money,
      this.state.building.getRooms(),
      this.state.raid.defenseTraps,
      this.state.raid.shieldUntil,
      this.state.raid.playerDistrict,
    );

    const bots = getBotsForRegion(this.mapRegion);
    const playerInRegion =
      findDistrict(this.playerEntry.districtId)?.region === this.mapRegion;
    this.allPlayers = playerInRegion ? [...bots, this.playerEntry] : [...bots];
  }

  private createChrome(): void {
    const t = L();
    const title =
      this.mapRegion === 'balcony'
        ? t.world.regions.balconyTitle
        : this.mapRegion === 'stairwell'
          ? t.world.regions.stairwellTitle
          : t.world.title;

    this.add
      .text(GAME_WIDTH / 2, 28, title, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '28px',
        color: '#fff8e1',
        stroke: '#e65100',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(100);

    this.add
      .text(16, 16, fmt(t.world.energy, { current: this.state.raid.raidEnergy }), {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '18px',
        color: '#ffca28',
      })
      .setDepth(100);

    this.add
      .text(16, 42, fmt(t.world.rating, { value: this.state.raid.raidRating }), {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '16px',
        color: '#66bb6a',
      })
      .setDepth(100);

    createAdaptiveButton(this, GAME_WIDTH - 110, 36, t.common.esc, () => {
      this.state.persist();
      this.scene.start(SCENES.NEST);
    }, 90, 40).setDepth(100);

    const balconyUnlocked = this.state.isBalconyUnlocked();
    const stairwellUnlocked = this.state.isStairwellUnlocked();
    createAdaptiveButton(
      this,
      GAME_WIDTH / 2 - 200,
      68,
      t.world.regions.apartment,
      () => this.switchRegion('apartment'),
      170,
      36,
      'none',
    ).setDepth(100);

    createAdaptiveButton(
      this,
      GAME_WIDTH / 2,
      68,
      t.world.regions.balcony,
      () => {
        if (!balconyUnlocked) {
          showToast(this, t.world.regions.balconyLocked);
          return;
        }
        this.switchRegion('balcony');
      },
      170,
      36,
      'none',
    ).setDepth(100);

    createAdaptiveButton(
      this,
      GAME_WIDTH / 2 + 200,
      68,
      t.world.regions.stairwell,
      () => {
        if (!stairwellUnlocked) {
          showToast(this, t.world.regions.stairwellLocked);
          return;
        }
        this.switchRegion('stairwell');
      },
      170,
      36,
      'none',
    ).setDepth(100);

    if (!balconyUnlocked || !stairwellUnlocked) {
      const hints: string[] = [];
      if (!balconyUnlocked) hints.push(t.world.regions.balconyLocked);
      if (!stairwellUnlocked) hints.push(t.world.regions.stairwellLocked);
      this.add
        .text(GAME_WIDTH / 2, 98, hints.join('  •  '), {
          fontFamily: 'Segoe UI, Arial, sans-serif',
          fontSize: '11px',
          color: '#bcaaa4',
          align: 'center',
          wordWrap: { width: GAME_WIDTH - 40 },
        })
        .setOrigin(0.5)
        .setDepth(100);
    }
  }

  private switchRegion(region: MapRegion): void {
    if (region === this.mapRegion) return;
    this.scene.restart({ mapRegion: region });
  }

  update(_t: number, delta: number): void {
    this.pulse += delta * 0.003;
    this.markersLayer.removeAll(true);

    for (const p of this.allPlayers) {
      const marker = addNestMarker(this, p, this.selected?.id === p.id, this.pulse);
      this.markersLayer.add(marker);
    }

    const crumbs =
      this.mapRegion === 'balcony'
        ? this.crumbSpotsBalcony
        : this.mapRegion === 'stairwell'
          ? this.crumbSpotsStairwell
          : this.crumbSpotsApartment;
    for (const c of crumbs) {
      const crumb = addNeutralCrumb(this, c.x, c.y, this.pulse);
      this.markersLayer.add(crumb);
    }
  }

  private drawDistrictLabels(): void {
    const districts = L().world.districts;
    const visible = getDistrictsForRegion(
      this.mapRegion,
      this.state.getTotalBuildingCount(),
      this.state.raid.raidRating,
      this.state.getBalconyBuildingCount(),
      this.state.isBalconyUnlocked(),
    );
    visible.forEach((d) => {
      this.add
        .text(d.mapX, d.mapY + 30, districts[d.labelKey as keyof typeof districts], {
          fontFamily: 'Segoe UI, Arial, sans-serif',
          fontSize: '11px',
          color: '#fff8e1',
          stroke: '#1a1208',
          strokeThickness: 2,
        })
        .setOrigin(0.5)
        .setDepth(15)
        .setAlpha(0.9);
    });
  }

  private pickPlayer(x: number, y: number): void {
    let closest: MapPlayer | null = null;
    let dist = 999;
    const pickRadius = mapPickRadius();
    for (const p of this.allPlayers) {
      const d = Phaser.Math.Distance.Between(x, y, p.mapX, p.mapY - 22);
      if (d < pickRadius && d < dist) {
        dist = d;
        closest = p;
      }
    }
    this.selected = closest;
    this.showPlayerPanel();
  }

  private showPlayerPanel(): void {
    this.panelContainer?.destroy();
    if (!this.selected) return;

    const p = this.selected;
    const power = this.state.raid.calcPower(p.rooms);
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT - 100;
    const t = L();

    this.panelContainer = this.add.container(0, 0).setDepth(200);
    this.panelContainer.add(createPanel(this, cx - 220, cy - 90, 440, 180, 0.92));

    this.panelContainer.add(
      this.add
        .text(cx, cy - 70, mapPlayerName(p), {
          fontFamily: 'Segoe UI, Arial, sans-serif',
          fontSize: '22px',
          color: '#fff8e1',
        })
        .setOrigin(0.5),
    );

    this.panelContainer.add(
      this.add
        .text(
          cx,
          cy - 35,
          fmt(t.world.playerInfo, {
            power,
            food: Math.floor(p.food),
            money: Math.floor(p.money),
            buildings: p.rooms.length,
            traps: p.traps.length,
          }),
          {
            fontFamily: 'Segoe UI, Arial, sans-serif',
            fontSize: '14px',
            color: '#bcaaa4',
            align: 'center',
          },
        )
        .setOrigin(0.5),
    );

    if (p.id === 'player') {
      this.panelContainer.add(
        this.add.text(cx, cy + 20, t.world.yourNest, {
          fontFamily: 'Segoe UI, Arial, sans-serif',
          fontSize: '14px',
          color: '#ffa726',
        }).setOrigin(0.5),
      );
    } else {
      const err = this.state.raid.canRaid(p);
      createAdaptiveButton(this, cx - 90, cy + 55, t.world.raid, () => this.launchRaid(p), 170, 48).setDepth(
        201,
      );
      if (err) {
        this.panelContainer.add(
          this.add
            .text(cx + 100, cy + 55, t.world.errors[err as RaidErrorKey], {
              fontFamily: 'Segoe UI, Arial, sans-serif',
              fontSize: '12px',
              color: '#ef5350',
            })
            .setOrigin(0, 0.5),
        );
      }
    }

    createAdaptiveButton(this, cx + 120, cy + 55, t.menu.back, () => {
      this.panelContainer?.destroy();
      this.selected = null;
    }, 100, 44).setDepth(201);
  }

  private launchRaid(target: MapPlayer): void {
    const err = this.state.raid.canRaid(target);
    if (err) {
      showToast(this, L().world.errors[err as RaidErrorKey]);
      return;
    }
    if (!this.state.raid.startRaid(target)) return;

    const from = this.playerEntry;
    const holder = { t: 0 };

    const banner = this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, 'ui-panel')
      .setDisplaySize(480, 72)
      .setAlpha(0.92)
      .setDepth(300);

    const bannerText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, fmt(L().world.marching, { name: mapPlayerName(target) }), {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '24px',
        color: '#fff8e1',
      })
      .setOrigin(0.5)
      .setDepth(301);

    this.trailLayer.removeAll(true);
    this.tweens.add({
      targets: holder,
      t: 1,
      duration: 1800,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        this.trailLayer.removeAll(true);
        const trail = createRaidTrailImages(
          this,
          from.mapX,
          from.mapY - 22,
          target.mapX,
          target.mapY - 22,
          holder.t,
        );
        this.trailLayer.add(trail);
      },
      onComplete: () => {
        banner.destroy();
        bannerText.destroy();
        this.cameras.main.flash(400, 255, 167, 38);
        this.time.delayedCall(200, () => this.scene.start(SCENES.RAID));
      },
    });
  }

  private handleTutorialOnEnter(): void {
    if (!this.state.tutorial.isActive()) return;
    if (!this.state.tutorial.onWorldMapVisited()) return;

    const t = L().tutorial;
    this.tutorialOverlay.show(
      this,
      `${t.complete}\n${t.reward}`,
      TUTORIAL_STEP_COUNT - 1,
      TUTORIAL_STEP_COUNT,
      {
        nextLabel: t.next,
        skipLabel: t.skip,
        onNext: () => this.completeTutorial(),
        onSkip: () => this.completeTutorial(),
      },
    );
  }

  private completeTutorial(): void {
    this.tutorialOverlay.destroy();
    this.state.finishTutorial();
    showToast(this, L().tutorial.reward);
  }
}
