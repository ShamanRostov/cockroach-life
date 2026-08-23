import Phaser from 'phaser';
import { SCENES, COLORS, GAME_WIDTH, GAME_HEIGHT, GRID_TILE, isMobileDevice } from '../config';
import { GameState } from '../GameState';
import { updateBotPlayer } from '../systems/WorldMapData';
import { buildingTextureKey, buildingDisplayScale } from '../assets/AssetKeys';
import type { MapPlayer, RaidResult, TrapType } from '../types';
import { L, fmt, mapPlayerName } from '../../i18n';
import { createCockroachPhysics } from '../graphics/CockroachSprite';
import { TouchControls } from '../ui/TouchControls';
import { AnalyticsService } from '../../platforms/AnalyticsService';
import { SoundManager } from '../audio/SoundManager';
import { createTextButton, showToast } from '../ui/ButtonHelper';
import { leaderboardService, LEADERBOARD_IDS } from '../../platforms/LeaderboardService';
import { platformManager } from '../../platforms/PlatformManager';
import { spawnRaidSmoke } from '../graphics/ParticleEffects';
import { screenShake } from '../graphics/VisualEffects';
import { DEPTH } from '../graphics/SceneDepth';
import { createNestTopDownBackground } from '../graphics/NestTopDownFloor';
import { SS_REGISTRY } from '../../dev/screenshotRegistry';

type Phase = 'intro' | 'infiltrate' | 'loot' | 'escape' | 'result';

export class RaidScene extends Phaser.Scene {
  private state = GameState.getInstance();
  private target!: MapPlayer;
  private phase: Phase = 'intro';
  private phaseBanner!: Phaser.GameObjects.Text;
  private hudText!: Phaser.GameObjects.Text;

  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;

  private infiltrateScore = 0;
  private lootScore = 0;
  private escapeScore = 0;
  private phaseTimer = 0;
  private damage = 0;
  private collected = 0;
  private lootTarget = 6;
  private escapeTimer = 0;

  private traps: Phaser.GameObjects.Group | null = null;
  private foods: Phaser.Physics.Arcade.Group | null = null;
  private slipper: Phaser.Physics.Arcade.Sprite | null = null;
  private exitZone: Phaser.GameObjects.Zone | null = null;
  private phaseObjects: Phaser.GameObjects.GameObject[] = [];
  private touchControls: TouchControls | null = null;
  private escapeHorizontalOnly = false;

  constructor() {
    super(SCENES.RAID);
  }

  create(): void {
    const target = this.state.raid.currentTarget;
    if (!target) {
      this.scene.start(SCENES.WORLD_MAP);
      return;
    }
    this.target = target;
    this.cameras.main.setBackgroundColor(0x1a1208);
    this.cameras.main.fadeIn(500);

    this.phaseBanner = this.add
      .text(GAME_WIDTH / 2, 80, '', {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '30px',
        color: '#fff8e1',
        stroke: '#e65100',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud)
      .setAlpha(0);

    this.hudText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 36, '', {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '15px',
        color: '#bcaaa4',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey('W'),
      A: this.input.keyboard!.addKey('A'),
      S: this.input.keyboard!.addKey('S'),
      D: this.input.keyboard!.addKey('D'),
    };

    SoundManager.getInstance().playSFX('raid_start');
    if (this.registry.get(SS_REGISTRY.RAID_INFILTRATE)) {
      this.time.delayedCall(150, () => this.startPhase('infiltrate'));
    } else {
      this.showIntro();
    }
  }

  update(_time: number, delta: number): void {
    if (this.phase === 'infiltrate') this.updateInfiltrate(delta);
    if (this.phase === 'loot') this.updateLoot(delta);
    if (this.phase === 'escape') this.updateEscape(delta);
  }

  private showIntro(): void {
    const t = L();
    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.75);
    this.phaseObjects.push(overlay);

    const title = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, fmt(t.raid.intro, { name: mapPlayerName(this.target) }), {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '32px',
        color: '#fff8e1',
        align: 'center',
      })
      .setOrigin(0.5);
    this.phaseObjects.push(title);

    const traps = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, fmt(t.raid.trapsWarning, { count: this.target.traps.length }), {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '18px',
        color: '#ef5350',
      })
      .setOrigin(0.5);
    this.phaseObjects.push(traps);

    this.time.delayedCall(2200, () => {
      this.phaseObjects.forEach((o) => o.destroy());
      this.phaseObjects = [];
      this.startPhase('infiltrate');
    });
  }

  private startPhase(phase: Phase): void {
    this.clearPhase();
    this.phase = phase;
    const t = L();

    if (phase === 'infiltrate') {
      this.phaseTimer = 45000;
      this.escapeHorizontalOnly = false;
      this.setupInfiltrate();
      this.touchControls = new TouchControls({ scene: this, layout: 'joystick' });
      this.showBanner(t.raid.phase1);
      this.hudText.setText(t.raid.phase1Hint);
    } else if (phase === 'loot') {
      this.phaseTimer = 35000;
      this.escapeHorizontalOnly = false;
      this.setupLoot();
      this.touchControls = new TouchControls({ scene: this, layout: 'joystick' });
      this.showBanner(t.raid.phase2);
      this.hudText.setText(t.raid.phase2Hint);
    } else if (phase === 'escape') {
      this.escapeTimer = 0;
      this.escapeHorizontalOnly = true;
      this.setupEscape();
      this.touchControls = new TouchControls({ scene: this, layout: 'horizontal-zones' });
      this.showBanner(t.raid.phase3);
      this.hudText.setText(t.raid.phase3Hint);
    }
  }

  private showBanner(text: string): void {
    this.phaseBanner.setText(text).setAlpha(0);
    this.tweens.add({
      targets: this.phaseBanner,
      alpha: 1,
      y: 90,
      duration: 400,
      yoyo: true,
      hold: 800,
      onComplete: () => this.phaseBanner.setAlpha(0.3),
    });
  }

  private clearPhase(): void {
    this.touchControls?.destroy();
    this.touchControls = null;
    this.traps?.clear(true, true);
    this.foods?.clear(true, true);
    this.slipper?.destroy();
    this.exitZone?.destroy();
    this.player?.destroy();
    this.phaseObjects.forEach((o) => o.destroy());
    this.phaseObjects = [];
    this.traps = null;
    this.foods = null;
    this.slipper = null;
    this.exitZone = null;
  }

  // ─── Phase 1: Infiltrate ───────────────────────────────────────
  private setupInfiltrate(): void {
    this.physics.world.setBounds(80, 120, GAME_WIDTH - 160, GAME_HEIGHT - 200);

    const bg = this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'raid-infiltrate-bg')
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
      .setDepth(0);
    this.phaseObjects.push(bg);

    this.player = createCockroachPhysics(this, 120, GAME_HEIGHT / 2, 1.3, this.state.skins.getTint()).setDepth(DEPTH.entities);
    this.player.setCollideWorldBounds(true);

    spawnRaidSmoke(this, 120, GAME_HEIGHT / 2);

    this.exitZone = this.add.zone(GAME_WIDTH - 120, GAME_HEIGHT / 2, 60, 120).setDepth(5);
    this.physics.add.existing(this.exitZone, true);

    const exitMarker = this.add
      .image(GAME_WIDTH - 120, GAME_HEIGHT / 2, 'nest-marker')
      .setScale(0.2)
      .setTint(COLORS.success)
      .setAlpha(0.85)
      .setDepth(4);
    this.phaseObjects.push(exitMarker);

    this.traps = this.add.group();
    this.spawnDefenderTraps();

    this.physics.add.overlap(this.player, this.exitZone, () => {
      if (this.phase !== 'infiltrate') return;
      this.infiltrateScore = Math.min(100, 50 + (this.phaseTimer / 45000) * 50 - this.damage);
      this.cameras.main.flash(200, 76, 175, 80);
      this.startPhase('loot');
    });
  }

  private spawnDefenderTraps(): void {
    const trapConfigs: { type: TrapType; x: number; y: number }[] = [];
    const baseY = GAME_HEIGHT / 2;
    this.target.traps.forEach((type, i) => {
      trapConfigs.push({ type, x: 280 + i * 180, y: baseY + (i % 2 === 0 ? -80 : 80) });
    });

    for (const cfg of trapConfigs) {
      if (cfg.type === 'slipper') {
        const s = this.add.sprite(cfg.x, cfg.y, 'slipper').setScale(0.45).setAlpha(0.95).setDepth(8);
        this.traps?.add(s);
        this.tweens.add({
          targets: s,
          x: cfg.x + 120,
          duration: 1200,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        const zone = this.add.zone(cfg.x, cfg.y, 70, 50);
        this.physics.add.existing(zone);
        (zone.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
        this.physics.add.overlap(this.player, zone, () => this.hitTrap(12));
        this.tweens.add({ targets: zone, x: cfg.x + 120, duration: 1200, yoyo: true, repeat: -1 });
      } else if (cfg.type === 'spray') {
        const cloud = this.add.sprite(cfg.x, cfg.y, 'spray-cloud').setScale(0.45).setAlpha(0.65).setDepth(7);
        this.traps?.add(cloud);
        this.tweens.add({ targets: cloud, scale: 1.2, alpha: 0.75, duration: 2000, yoyo: true, repeat: -1 });
        const zone = this.add.zone(cfg.x, cfg.y, 90, 90);
        this.physics.add.existing(zone);
        this.physics.add.overlap(this.player, zone, () => this.hitTrap(6, 500));
      } else {
        const glue = this.add.sprite(cfg.x, cfg.y, 'glue-trap').setScale(0.35).setAlpha(0.9).setDepth(6);
        this.phaseObjects.push(glue);
        const zone = this.add.zone(cfg.x, cfg.y, 70, 70);
        this.physics.add.existing(zone);
        this.physics.add.overlap(this.player, zone, () => {
          this.player.setVelocity(this.player.body!.velocity.x * 0.3, this.player.body!.velocity.y * 0.3);
          this.hitTrap(4, 300);
        });
      }
    }
  }

  private hitTrap(dmg: number, cooldown = 800): void {
    if (this.phase !== 'infiltrate') return;
    const now = Date.now();
    if ((this.player.getData('lastHit') as number) > now - cooldown) return;
    this.player.setData('lastHit', now);
    this.damage += dmg;
    this.player.setTint(COLORS.danger);
    this.cameras.main.shake(100, 0.008);
    this.time.delayedCall(200, () => this.player.clearTint());
  }

  private updateInfiltrate(delta: number): void {
    this.movePlayer(220);
    this.phaseTimer -= delta;
    this.hudText.setText(
      fmt(L().raid.infiltrateHud, { time: Math.ceil(this.phaseTimer / 1000), damage: Math.floor(this.damage) }),
    );
    if (this.phaseTimer <= 0) {
      this.infiltrateScore = Math.max(0, 30 - this.damage);
      this.startPhase('loot');
    }
  }

  // ─── Phase 2: Loot ───────────────────────────────────────────
  private setupLoot(): void {
    this.physics.world.setBounds(280, 120, GAME_WIDTH - 560, GAME_HEIGHT - 220);
    this.collected = 0;

    const originX = GAME_WIDTH / 2;
    const originY = 360;

    const floor = createNestTopDownBackground(this, 'apartment');
    floor.setAlpha(0.95);
    this.phaseObjects.push(floor);

    const overlay = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1a1208, 0.25)
      .setDepth(1);
    this.phaseObjects.push(overlay);

    const label = this.add
      .text(GAME_WIDTH / 2, 100, fmt(L().raid.enemyNest, { name: mapPlayerName(this.target) }), {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '26px',
        color: '#fff8e1',
        stroke: '#1a1208',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(20);
    this.phaseObjects.push(label);

    const rooms = this.target.rooms.slice(0, 6);
    rooms.forEach((room, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = originX + (col - 1) * (GRID_TILE.size + 48);
      const y = originY + row * (GRID_TILE.size + 28) - 36;
      const scale = buildingDisplayScale(room.level);
      const img = this.add
        .image(x, y, buildingTextureKey(room.type, room.level))
        .setDepth(10)
        .setOrigin(0.5, 0.55)
        .setScale(scale);
      this.phaseObjects.push(img);

      this.tweens.add({
        targets: img,
        y: y - 3,
        duration: 900 + i * 100,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });

    this.player = createCockroachPhysics(
      this,
      originX,
      originY + 110,
      1.5,
      this.state.skins.getTint(),
    ).setDepth(15);
    this.player.setCollideWorldBounds(true);

    this.foods = this.physics.add.group();
    for (let i = 0; i < 10; i++) {
      this.spawnLootCrumb(originX, originY);
    }

    this.physics.add.overlap(this.player, this.foods, (_p, f) => {
      const food = f as Phaser.Physics.Arcade.Sprite;
      if (!food.active) return;
      food.destroy();
      this.collected += 1;
      const spark = this.add.particles(food.x, food.y, 'spark', {
        speed: 50,
        scale: { start: 0.7, end: 0 },
        lifespan: 400,
        quantity: 8,
        tint: COLORS.food,
      });
      this.time.delayedCall(500, () => spark.destroy());
      if (this.collected >= this.lootTarget) {
        this.lootScore = Math.min(100, 40 + this.collected * 8);
        this.startPhase('escape');
      }
    });

    if (isMobileDevice()) {
      this.touchControls = new TouchControls({ scene: this, layout: 'joystick' });
    }

    this.phaseTimer = 25000;
  }

  private spawnLootCrumb(originX: number, originY: number): void {
    const x = originX + Phaser.Math.Between(-180, 180);
    const y = originY + Phaser.Math.Between(-60, 100);
    const crumb = this.foods!.create(x, y, 'food-crumb') as Phaser.Physics.Arcade.Sprite;
    crumb.setScale(0.22 + Math.random() * 0.08);
    this.tweens.add({ targets: crumb, y: y - 6, duration: 700, yoyo: true, repeat: -1 });
  }

  private updateLoot(delta: number): void {
    this.movePlayer(200);
    this.phaseTimer -= delta;
    this.hudText.setText(
      fmt(L().raid.lootHud, {
        current: this.collected,
        target: this.lootTarget,
        time: Math.ceil(this.phaseTimer / 1000),
      }),
    );
    if (this.phaseTimer <= 0) {
      this.lootScore = Math.min(80, this.collected * 12);
      this.startPhase('escape');
    }
  }

  // ─── Phase 3: Escape ─────────────────────────────────────────
  private setupEscape(): void {
    this.physics.world.setBounds(0, 100, GAME_WIDTH, GAME_HEIGHT - 120);

    const bg = this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'arcade-slipper-bg')
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
      .setDepth(0);
    this.phaseObjects.push(bg);

    this.player = createCockroachPhysics(
      this,
      GAME_WIDTH / 2,
      GAME_HEIGHT - 140,
      1.35,
      this.state.skins.getTint(),
    ).setDepth(10);
    this.player.setCollideWorldBounds(true);

    this.slipper = this.physics.add.sprite(GAME_WIDTH / 2, 80, 'slipper').setScale(0.55).setDepth(12);
    this.physics.add.overlap(this.player, this.slipper, () => {
      if (this.phase !== 'escape') return;
      this.escapeScore = Math.max(0, this.escapeScore - 40);
      screenShake(this, 300, 0.032);
      this.player.setTint(COLORS.danger);
      this.time.delayedCall(300, () => this.player.clearTint());
    });

    this.time.addEvent({
      delay: 1800,
      loop: true,
      callback: () => {
        if (this.slipper && this.phase === 'escape') {
          this.slipper.setX(Phaser.Math.Between(100, GAME_WIDTH - 100));
          this.slipper.setY(80);
          this.slipper.setVelocity(Phaser.Math.Between(-100, 100), Phaser.Math.Between(280, 380));
        }
      },
    });
  }

  private updateEscape(delta: number): void {
    this.movePlayer(260, this.escapeHorizontalOnly);
    this.escapeTimer += delta;
    this.escapeScore = Math.min(100, Math.floor(this.escapeTimer / 200));
    this.hudText.setText(fmt(L().raid.escapeHud, { time: Math.floor(this.escapeTimer / 1000) }));

    if (this.escapeTimer >= 18000) {
      this.escapeScore = Math.min(100, this.escapeScore + 30);
      this.finishRaid();
    }
  }

  private movePlayer(speed: number, horizontalOnly = false): void {
    if (!this.player?.active) return;
    let vx = 0;
    let vy = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) vx = -speed;
    if (this.cursors.right.isDown || this.wasd.D.isDown) vx = speed;
    if (!horizontalOnly) {
      if (this.cursors.up.isDown || this.wasd.W.isDown) vy = -speed;
      if (this.cursors.down.isDown || this.wasd.S.isDown) vy = speed;
    }

    const touch = this.touchControls?.mergeVelocity(vx, vy, speed, horizontalOnly);
    if (touch) {
      vx = touch.vx;
      vy = touch.vy;
    }

    this.player.setVelocity(vx, vy);
  }

  // ─── Result ────────────────────────────────────────────────────
  private finishRaid(): void {
    this.phase = 'result';
    this.clearPhase();

    const scores = {
      infiltrate: Math.floor(this.infiltrateScore),
      loot: Math.floor(this.lootScore),
      escape: Math.floor(this.escapeScore),
    };
    const result = this.state.raid.computeLoot(this.target, scores, {
      lootMultiplier: this.state.breeding.getRoleBonus('scout'),
      successBonus: this.state.breeding.getRoleBonus('fighter'),
    });
    const raidMult = this.state.liveOps.getEventMultiplier('raid_loot');
    const doubleLoot = this.state.consumeDoubleLoot();
    const lootMult = raidMult * (doubleLoot ? 2 : 1);

    if (result.success && lootMult > 1) {
      result.foodStolen = Math.floor(result.foodStolen * lootMult);
      result.moneyStolen = Math.floor(result.moneyStolen * lootMult);
      if (raidMult > 1) {
        this.state.trackEventReward('raid_week', 'loot');
      }
    }

    const updated = this.state.raid.applyRaidResult(result, this.target);

    if (this.target.isBot) {
      updateBotPlayer(updated);
    }

    if (result.success) {
      this.state.addFood(result.foodStolen);
      this.state.addMoney(result.moneyStolen);
    } else {
      this.state.economy.damage(15);
    }
    this.state.trackDailyProgress('raid', 1);
    AnalyticsService.getInstance().trackRaidComplete(result.success, result.foodStolen);
    SoundManager.getInstance().playSFX(result.success ? 'raid_win' : 'raid_lose');
    void leaderboardService.submitScore(LEADERBOARD_IDS.RAID_RATING, this.state.raid.raidRating);
    this.state.persist();

    this.showResult(result);
  }

  private showResult(result: RaidResult): void {
    const t = L();

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.85);

    const title = result.success ? t.raid.victory : t.raid.defeat;
    const color = result.success ? '#66bb6a' : '#ef5350';

    this.add
      .text(GAME_WIDTH / 2, 160, title, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '42px',
        color,
        stroke: '#1a1208',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    const body = result.success
      ? fmt(t.raid.lootResult, {
          food: result.foodStolen,
          money: result.moneyStolen,
          rating: result.ratingChange,
        })
      : fmt(t.raid.failResult, { rating: result.ratingChange });

    this.add
      .text(GAME_WIDTH / 2, 280, body, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '20px',
        color: '#fff8e1',
        align: 'center',
      })
      .setOrigin(0.5);

    const phases = fmt(t.raid.phaseScores, {
      p1: result.phaseScores.infiltrate,
      p2: result.phaseScores.loot,
      p3: result.phaseScores.escape,
    });

    this.add
      .text(GAME_WIDTH / 2, 380, phases, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '16px',
        color: '#bcaaa4',
        align: 'center',
      })
      .setOrigin(0.5);

    if (result.success) {
      const bag = this.add
        .image(GAME_WIDTH / 2, 440, 'food-crumb')
        .setScale(0.5);
      this.tweens.add({
        targets: bag,
        y: 430,
        yoyo: true,
        repeat: -1,
        duration: 600,
      });

      createTextButton(
        this,
        GAME_WIDTH / 2,
        500,
        t.share.share,
        () => {
          void platformManager.shareRaidSuccess(result.foodStolen).then((res) => {
            if (res === 'clipboard') {
              showToast(this, t.share.copyLink);
            }
          });
        },
        200,
        44,
      );
    }

    this.time.delayedCall(result.success ? 6000 : 3500, () => {
      this.scene.start(SCENES.WORLD_MAP);
    });
  }
}
