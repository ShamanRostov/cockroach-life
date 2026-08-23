import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { getNestHudButtonX, getNestHudButtonY } from './MobileUILayout';
import { GameState } from '../GameState';
import type { CockroachRole } from '../types';
import {
  createAdaptiveButton,
  createModalOverlay,
  createModalPanel,
  showToast,
} from './ButtonHelper';
import { L, fmt } from '../../i18n';
import { SoundManager } from '../audio/SoundManager';
import { DEPTH } from '../graphics/SceneDepth';
import { ModalLayer } from './ModalLayer';

const ROLES: CockroachRole[] = ['worker', 'scout', 'fighter'];

export class BreedingPanel {
  private readonly state = GameState.getInstance();
  private modal = new ModalLayer();
  private hudButton: Phaser.GameObjects.Container | null = null;
  private overlay: Phaser.GameObjects.Rectangle | null = null;
  private container: Phaser.GameObjects.Container | null = null;
  private listText: Phaser.GameObjects.Text | null = null;
  private bonusText: Phaser.GameObjects.Text | null = null;
  private timerText: Phaser.GameObjects.Text | null = null;
  private selectedRole: CockroachRole = 'worker';
  private refreshTimer: Phaser.Time.TimerEvent | null = null;

  createHudButton(scene: Phaser.Scene): void {
    this.destroyHudButton();
    const rooms = this.state.building.getRooms();
    if (!this.state.breeding.hasNursery(rooms)) return;

    const count = this.state.breeding.getCockroaches().length;

    this.hudButton = createAdaptiveButton(
      scene,
      getNestHudButtonX('breeding'),
      getNestHudButtonY('breeding'),
      `🐣\n${count}`,
      () => this.show(scene),
      54,
      46,
    );
    this.hudButton.setDepth(DEPTH.hud + 12);
  }

  destroyHudButton(): void {
    this.hudButton?.destroy(true);
    this.hudButton = null;
  }

  show(scene: Phaser.Scene): void {
    this.refreshTimer?.destroy();
    this.refreshTimer = null;
    this.modal.destroyAll();
    this.overlay = null;
    this.container = null;
    this.listText = null;
    this.bonusText = null;
    this.timerText = null;

    const t = L().breeding;
    const depth = 900;

    this.overlay = this.modal.track(createModalOverlay(scene, depth));
    this.overlay.on('pointerdown', () => this.hide());

    const panelW = 540;
    const panelH = 500;
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.modal.track(createModalPanel(scene, cx, cy, panelW, panelH, depth + 1));

    const panelBlocker = this.modal.track(
      scene.add
        .rectangle(cx, cy, panelW, panelH, 0x000000, 0)
        .setInteractive()
        .setDepth(depth + 1),
    );
    panelBlocker.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
      ev.stopPropagation();
    });

    this.container = this.modal.track(scene.add.container(0, 0).setDepth(depth + 2));

    const title = scene.add
      .text(cx, cy - 220, t.title, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '26px',
        color: '#fff8e1',
        stroke: '#2e7d32',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    this.container.add(title);

    const rooms = this.state.building.getRooms();
    const cap = this.state.breeding.getMaxCockroaches(rooms);
    const count = this.state.breeding.getCockroaches().length;

    const subtitle = scene.add
      .text(cx, cy - 185, fmt(t.capacity, { current: count, max: cap }), {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '16px',
        color: '#bcaaa4',
      })
      .setOrigin(0.5);
    this.container.add(subtitle);

    this.bonusText = scene.add
      .text(cx, cy - 155, this.formatBonuses(), {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '14px',
        color: '#81c784',
        align: 'center',
      })
      .setOrigin(0.5);
    this.container.add(this.bonusText);

    this.listText = scene.add
      .text(cx, cy - 70, this.formatRoachList(), {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '14px',
        color: '#fff8e1',
        align: 'center',
        lineSpacing: 4,
      })
      .setOrigin(0.5);
    this.container.add(this.listText);

    this.timerText = scene.add
      .text(cx, cy + 30, this.formatTimers(), {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '15px',
        color: '#ffca28',
        align: 'center',
      })
      .setOrigin(0.5);
    this.container.add(this.timerText);

    this.modal.track(
      scene.add
        .text(cx, cy + 70, t.selectRole, {
          fontFamily: 'Segoe UI, Arial, sans-serif',
          fontSize: '15px',
          color: '#bcaaa4',
        })
        .setOrigin(0.5)
        .setDepth(depth + 2),
    );

    ROLES.forEach((role, i) => {
      const isSelected = role === this.selectedRole;
      const label = isSelected
        ? `✓ ${this.roleLabel(role)}`
        : this.roleLabel(role);
      this.modal.track(
        createAdaptiveButton(
          scene,
          cx - 160 + i * 160,
          cy + 110,
          label,
          () => {
            this.selectedRole = role;
            this.show(scene);
          },
          140,
          40,
        ).setDepth(depth + 2),
      );
    });

    const cost = this.state.breeding.getBreedCost();
    this.modal.track(
      createAdaptiveButton(
        scene,
        cx,
        cy + 170,
        fmt(t.breedButton, { food: cost.food, money: cost.money }),
        () => this.onBreed(scene),
        320,
        44,
      ).setDepth(depth + 2),
    );

    this.modal.track(
      createAdaptiveButton(
        scene,
        cx,
        cy + 225,
        L().daily.close,
        () => this.hide(),
        160,
        40,
      ).setDepth(depth + 4),
    );

    this.refreshTimer = scene.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        this.state.breeding.updateTimers();
        this.refreshContent();
      },
    });
  }

  hide(): void {
    this.refreshTimer?.destroy();
    this.refreshTimer = null;
    this.modal.destroyAll();
    this.overlay = null;
    this.container = null;
    this.listText = null;
    this.bonusText = null;
    this.timerText = null;
  }

  refreshHudButton(scene: Phaser.Scene): void {
    this.createHudButton(scene);
  }

  private onBreed(scene: Phaser.Scene): void {
    const t = L().breeding;
    const rooms = this.state.building.getRooms();
    const economy = this.state.economy;
    const err = this.state.breeding.canBreed(
      this.selectedRole,
      rooms,
      economy.food,
      economy.money,
    );

    if (err) {
      showToast(scene, t.errors[err]);
      return;
    }

    const ok = this.state.breeding.breed(
      this.selectedRole,
      rooms,
      economy.food,
      economy.money,
      (money, food) => economy.spend(money, food),
    );
    if (!ok) {
      showToast(scene, t.errors.notEnoughResources);
      return;
    }

    SoundManager.getInstance().playSFX('build_place');
    showToast(scene, fmt(t.breedStarted, { role: this.roleLabel(this.selectedRole) }));
    this.state.breeding.syncMaxCapacity(rooms);
    this.state.persist();
    this.show(scene);
  }

  private refreshContent(): void {
    this.listText?.setText(this.formatRoachList());
    this.bonusText?.setText(this.formatBonuses());
    this.timerText?.setText(this.formatTimers());
  }

  private formatBonuses(): string {
    const t = L().breeding;
    const worker = Math.round(this.state.breeding.getRoleBonus('worker') * 100);
    const scout = Math.round(this.state.breeding.getRoleBonus('scout') * 100);
    const fighter = Math.round(this.state.breeding.getRoleBonus('fighter') * 100);
    return fmt(t.activeBonuses, { worker, scout, fighter });
  }

  private formatRoachList(): string {
    const roaches = this.state.breeding.getCockroaches();
    const t = L().breeding;
    if (roaches.length === 0) return t.noRoaches;
    return roaches
      .map((r) =>
        fmt(t.roachLine, {
          name: r.name,
          role: this.roleLabel(r.role),
          level: r.level,
        }),
      )
      .join('\n');
  }

  private formatTimers(): string {
    const timers = this.state.breeding.getBreedingTimers();
    const t = L().breeding;
    if (timers.length === 0) return '';
    const now = Date.now();
    return timers
      .map((timer) => {
        const secs = Math.max(0, Math.ceil((timer.finishAt - now) / 1000));
        return fmt(t.timerLine, { role: this.roleLabel(timer.role), seconds: secs });
      })
      .join('\n');
  }

  private roleLabel(role: CockroachRole): string {
    return L().breeding.roles[role];
  }
}
