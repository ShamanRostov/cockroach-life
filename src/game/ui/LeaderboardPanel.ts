import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import {
  createTextButton,
  createModalOverlay,
  createModalPanel,
} from './ButtonHelper';
import { L, fmt } from '../../i18n';
import {
  leaderboardService,
  LEADERBOARD_IDS,
  type LeaderboardData,
  type LeaderboardId,
} from '../../platforms/LeaderboardService';

const TAB_BOARDS: LeaderboardId[] = [
  LEADERBOARD_IDS.SLIPPER_HIGHSCORE,
  LEADERBOARD_IDS.RAID_RATING,
  LEADERBOARD_IDS.COLONY_SIZE,
];

export class LeaderboardPanel {
  private overlay: Phaser.GameObjects.Rectangle | null = null;
  private container: Phaser.GameObjects.Container | null = null;
  private tabContainer: Phaser.GameObjects.Container | null = null;
  private listContainer: Phaser.GameObjects.Container | null = null;
  private playerRankText: Phaser.GameObjects.Text | null = null;
  private activeTab = 0;
  private onClose: (() => void) | null = null;
  private sceneRef: Phaser.Scene | null = null;

  show(scene: Phaser.Scene, onClose?: () => void, initialTab = 0): void {
    this.hide();
    this.onClose = onClose ?? null;
    this.activeTab = initialTab;

    const t = L().leaderboard;
    const depth = 900;
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const panelW = 540;
    const panelH = 500;

    this.overlay = createModalOverlay(scene, depth);
    this.overlay.on('pointerdown', () => this.hide());

    createModalPanel(scene, cx, cy, panelW, panelH, depth + 1);

    const panelBlocker = scene.add
      .rectangle(cx, cy, panelW, panelH, 0x000000, 0)
      .setInteractive()
      .setDepth(depth + 1);
    panelBlocker.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
      ev.stopPropagation();
    });

    this.container = scene.add.container(0, 0).setDepth(depth + 2);

    const title = scene.add
      .text(cx, cy - 220, t.title, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '26px',
        color: '#fff8e1',
        stroke: '#5d2e00',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    this.container.add(title);

    this.tabContainer = scene.add.container(0, 0).setDepth(depth + 2);
    this.container.add(this.tabContainer);
    this.sceneRef = scene;
    this.renderTabs(cx, cy - 170);

    this.listContainer = scene.add.container(0, 0).setDepth(depth + 2);
    this.container.add(this.listContainer);

    this.playerRankText = scene.add
      .text(cx, cy + 170, t.loading, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '16px',
        color: '#ffca28',
      })
      .setOrigin(0.5);
    this.container.add(this.playerRankText);

    createTextButton(scene, cx, cy + 215, t.close, () => this.hide(), 160, 40).setDepth(depth + 3);

    void this.loadBoard(TAB_BOARDS[this.activeTab]!);
  }

  hide(): void {
    this.overlay?.destroy();
    this.overlay = null;
    this.container?.destroy();
    this.container = null;
    this.tabContainer = null;
    this.listContainer = null;
    this.playerRankText = null;
    this.sceneRef = null;
    const cb = this.onClose;
    this.onClose = null;
    cb?.();
  }

  isVisible(): boolean {
    return this.overlay !== null;
  }

  private tabLabel(boardId: LeaderboardId): string {
    const tabs = L().leaderboard.tabs;
    switch (boardId) {
      case LEADERBOARD_IDS.SLIPPER_HIGHSCORE:
        return tabs.slipper;
      case LEADERBOARD_IDS.RAID_RATING:
        return tabs.raid;
      case LEADERBOARD_IDS.COLONY_SIZE:
        return tabs.colony;
      default:
        return boardId;
    }
  }

  private renderTabs(cx: number, y: number): void {
    if (!this.tabContainer || !this.sceneRef) return;
    this.tabContainer.removeAll(true);

    const tabW = 160;
    TAB_BOARDS.forEach((boardId, i) => {
      const x = cx + (i - 1) * (tabW + 8);
      const active = i === this.activeTab;
      const btn = createTextButton(
        this.sceneRef!,
        x,
        y,
        this.tabLabel(boardId),
        () => {
          if (this.activeTab === i) return;
          this.activeTab = i;
          this.renderTabs(cx, y);
          void this.loadBoard(TAB_BOARDS[this.activeTab]!);
        },
        tabW,
        36,
      );
      this.tabContainer!.add(btn);
      if (active) {
        const underline = this.sceneRef!.add
          .rectangle(x, y + 22, tabW - 12, 3, 0xffca28);
        this.tabContainer!.add(underline);
      }
    });
  }

  private async loadBoard(boardId: LeaderboardId): Promise<void> {
    const t = L().leaderboard;
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.listContainer?.removeAll(true);
    this.playerRankText?.setText(t.loading);

    let data: LeaderboardData;
    try {
      data = await leaderboardService.getEntries(boardId, 10);
    } catch {
      this.playerRankText?.setText('—');
      return;
    }

    if (!this.listContainer || !this.playerRankText) return;

    const startY = cy - 120;
    data.entries.forEach((entry, i) => {
      const y = startY + i * 32;
      const color = entry.isPlayer ? '#ffca28' : '#fff8e1';
      const rankStr = fmt(t.rank, { rank: entry.rank });
      const scoreStr = fmt(t.score, { score: entry.score });
      const line = this.sceneRef!.add
        .text(cx, y, `${rankStr}  ${entry.name}  ${scoreStr}`, {
          fontFamily: 'Segoe UI, Arial, sans-serif',
          fontSize: '15px',
          color,
        })
        .setOrigin(0.5);
      this.listContainer!.add(line);
    });

    if (data.playerRank !== null && data.playerScore !== null) {
      this.playerRankText.setText(
        fmt(t.yourRank, { rank: data.playerRank, score: data.playerScore }),
      );
    } else {
      this.playerRankText.setText(t.noRank);
    }
  }
}
