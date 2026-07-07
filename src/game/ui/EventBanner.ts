import Phaser from 'phaser';
import { GAME_WIDTH } from '../config';
import { getEventBannerY, getEventBannerX } from './NestLayout';
import { GameState } from '../GameState';
import {
  createTextButton,
  createModalOverlay,
  createModalPanel,
} from './ButtonHelper';
import { setContainerHitArea } from './uiHitArea';
import { DEPTH } from '../graphics/SceneDepth';
import { L, fmt } from '../../i18n';
import { ModalLayer } from './ModalLayer';

export class EventBanner {
  private readonly state = GameState.getInstance();
  private modal = new ModalLayer();
  private container: Phaser.GameObjects.Container | null = null;
  private timerText: Phaser.GameObjects.Text | null = null;
  private overlay: Phaser.GameObjects.Rectangle | null = null;
  private detailContainer: Phaser.GameObjects.Container | null = null;
  private timerEvent: Phaser.Time.TimerEvent | null = null;

  create(scene: Phaser.Scene): Phaser.GameObjects.Container {
    this.destroy();

    const event = this.state.liveOps.getCurrentEvent();
    const t = L().events;
    const { days, hours } = this.state.liveOps.formatTimeRemaining();

    const container = scene.add.container(getEventBannerX(), getEventBannerY()).setDepth(DEPTH.hud + 1);

    const bannerW = 360;
    const bannerH = 36;
    const bg = scene.add
      .rectangle(0, 0, bannerW, bannerH, 0x1e140c, 0.9)
      .setStrokeStyle(2, 0xffa726, 0.55);

    const label = scene.add
      .text(-200, 0, `${event.icon} ${this.state.liveOps.getEventName()}`, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '17px',
        color: '#fff8e1',
        stroke: '#5d2e00',
        strokeThickness: 2,
      })
      .setOrigin(0, 0.5);

    this.timerText = scene.add
      .text(200, 0, fmt(t.timeRemaining, { days, hours }), {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '16px',
        color: '#ffca28',
      })
      .setOrigin(1, 0.5);

    container.add([bg, label, this.timerText]);
    setContainerHitArea(container, bannerW, bannerH, () => this.showDetails(scene));

    this.container = container;
    this.timerEvent = scene.time.addEvent({
      delay: 60_000,
      loop: true,
      callback: () => this.refreshTimer(),
    });

    return container;
  }

  private refreshTimer(): void {
    if (!this.timerText) return;
    const { days, hours } = this.state.liveOps.formatTimeRemaining();
    this.timerText.setText(fmt(L().events.timeRemaining, { days, hours }));
  }

  private showDetails(scene: Phaser.Scene): void {
    this.modal.destroyAll();
    this.overlay = null;
    this.detailContainer = null;

    const t = L().events;
    const event = this.state.liveOps.getCurrentEvent();
    const { days, hours } = this.state.liveOps.formatTimeRemaining();
    const depth = 900;

    this.overlay = this.modal.track(createModalOverlay(scene, depth));
    this.overlay.on('pointerdown', () => this.hideDetails());

    const panelW = 480;
    const panelH = 280;
    const cx = GAME_WIDTH / 2;
    const cy = 360;

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

    this.detailContainer = this.modal.track(scene.add.container(0, 0).setDepth(depth + 2));

    const title = scene.add
      .text(cx, cy - 90, `${event.icon} ${this.state.liveOps.getEventName()}`, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '24px',
        color: '#fff8e1',
        stroke: '#5d2e00',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    const desc = scene.add
      .text(cx, cy - 20, this.state.liveOps.getEventDescription(), {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '16px',
        color: '#bcaaa4',
        align: 'center',
        wordWrap: { width: panelW - 48 },
      })
      .setOrigin(0.5);

    const timer = scene.add
      .text(cx, cy + 50, fmt(t.timeRemaining, { days, hours }), {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '18px',
        color: '#ffca28',
      })
      .setOrigin(0.5);

    this.detailContainer.add([title, desc, timer]);

    this.modal.track(
      createTextButton(
        scene,
        cx,
        cy + 110,
        t.close,
        () => this.hideDetails(),
        160,
        40,
      ).setDepth(depth + 3),
    );
  }

  hideDetails(): void {
    this.modal.destroyAll();
    this.overlay = null;
    this.detailContainer = null;
  }

  destroy(): void {
    this.timerEvent?.destroy();
    this.timerEvent = null;
    this.hideDetails();
    this.container?.destroy();
    this.container = null;
    this.timerText = null;
  }
}
