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
import { ModalLayer } from './ModalLayer';

const TAB_BOARDS: LeaderboardId[] = [
  LEADERBOARD_IDS.SLIPPER_HIGHSCORE,
  LEADERBOARD_IDS.RAID_RATING,
  LEADERBOARD_IDS.COLONY_SIZE,
];

const MAX_VISIBLE_ENTRIES = 7;
const LIST_LINE_H = 34;
const LIST_FONT = '18px';
const PANEL_W = 600;
const PANEL_H = 560;

export class LeaderboardPanel {
  private modal = new ModalLayer();
  private overlay: Phaser.GameObjects.Rectangle | null = null;
  private container: Phaser.GameObjects.Container | null = null;
  private tabContainer: Phaser.GameObjects.Container | null = null;
  private listContainer: Phaser.GameObjects.Container | null = null;
  private playerRankText: Phaser.GameObjects.Text | null = null;
  private playerRankBg: Phaser.GameObjects.Rectangle | null = null;
  private activeTab = 0;
  private onClose: (() => void) | null = null;
  private sceneRef: Phaser.Scene | null = null;

  show(scene: Phaser.Scene, onClose?: () => void, initialTab = 0): void {
    this.modal.destroyAll();
    this.overlay = null;
    this.container = null;
    this.tabContainer = null;
    this.listContainer = null;
    this.playerRankText = null;
    this.playerRankBg = null;
    this.sceneRef = null;
    this.onClose = onClose ?? null;
    this.activeTab = initialTab;

    const t = L().leaderboard;
    const depth = 900;
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.overlay = this.modal.track(createModalOverlay(scene, depth));
    this.overlay.on('pointerdown', () => this.hide());

    this.modal.track(createModalPanel(scene, cx, cy, PANEL_W, PANEL_H, depth + 1));

    const panelBlocker = this.modal.track(
      scene.add
        .rectangle(cx, cy, PANEL_W, PANEL_H, 0x000000, 0)
        .setInteractive()
        .setDepth(depth + 1),
    );
    panelBlocker.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
      ev.stopPropagation();
    });

    this.container = this.modal.track(scene.add.container(0, 0).setDepth(depth + 2));

    const title = scene.add
      .text(cx, cy - PANEL_H / 2 + 32, t.title, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#fff8e1',
        stroke: '#5d2e00',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    this.container.add(title);

    this.tabContainer = scene.add.container(0, 0);
    this.container.add(this.tabContainer);
    this.sceneRef = scene;
    this.renderTabs(cx, cy - PANEL_H / 2 + 78);

    const listTop = cy - PANEL_H / 2 + 118;
    const listH = MAX_VISIBLE_ENTRIES * LIST_LINE_H + 12;
    const listBg = scene.add
      .rectangle(cx, listTop + listH / 2, PANEL_W - 48, listH, 0x000000, 0.35)
      .setStrokeStyle(1, 0xffa726, 0.35);
    this.container.add(listBg);

    this.listContainer = scene.add.container(0, 0);
    this.container.add(this.listContainer);

    // Dedicated band for the player's place — clear of the entry list
    const rankY = cy + PANEL_H / 2 - 100;
    this.playerRankBg = scene.add
      .rectangle(cx, rankY, PANEL_W - 64, 52, 0x3e2723, 0.95)
      .setStrokeStyle(2, 0xffa726, 0.7);
    this.container.add(this.playerRankBg);

    this.playerRankText = scene.add
      .text(cx, rankY, t.loading, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#ffca28',
        align: 'center',
        wordWrap: { width: PANEL_W - 96 },
      })
      .setOrigin(0.5);
    this.container.add(this.playerRankText);

    this.modal.track(
      createTextButton(
        scene,
        cx,
        cy + PANEL_H / 2 - 36,
        t.close,
        () => this.hide(),
        200,
        44,
      ).setDepth(depth + 3),
    );

    void this.loadBoard(TAB_BOARDS[this.activeTab]!);
  }

  hide(): void {
    this.modal.destroyAll();
    this.overlay = null;
    this.container = null;
    this.tabContainer = null;
    this.listContainer = null;
    this.playerRankText = null;
    this.playerRankBg = null;
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

    const tabW = 172;
    TAB_BOARDS.forEach((boardId, i) => {
      const x = cx + (i - 1) * (tabW + 10);
      const active = i === this.activeTab;
      const btn = this.modal.track(
        createTextButton(
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
          40,
        ),
      );
      this.tabContainer!.add(btn);
      if (active) {
        const underline = this.sceneRef!.add.rectangle(x, y + 24, tabW - 16, 3, 0xffca28);
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

    const startY = cy - PANEL_H / 2 + 118 + LIST_LINE_H / 2 + 4;
    const rankX = cx - 230;
    const nameX = cx - 80;
    const scoreX = cx + 220;
    const textStyle = {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: LIST_FONT,
      color: '#fff8e1',
    } as const;

    data.entries.slice(0, MAX_VISIBLE_ENTRIES).forEach((entry, i) => {
      const y = startY + i * LIST_LINE_H;
      const color = entry.isPlayer ? '#ffca28' : '#fff8e1';
      const rankStr = fmt(t.rank, { rank: entry.rank });
      const scoreStr = fmt(t.score, { score: entry.score });

      // Truncate long names so they never spill into the player-rank band
      const name =
        entry.name.length > 18 ? `${entry.name.slice(0, 16)}…` : entry.name;

      const rankText = this.sceneRef!.add
        .text(rankX, y, rankStr, { ...textStyle, color, fontStyle: 'bold' })
        .setOrigin(0, 0.5);
      const nameText = this.sceneRef!.add
        .text(nameX, y, name, { ...textStyle, color })
        .setOrigin(0, 0.5);
      const scoreText = this.sceneRef!.add
        .text(scoreX, y, scoreStr, { ...textStyle, color, fontStyle: 'bold' })
        .setOrigin(1, 0.5);

      this.listContainer!.add([rankText, nameText, scoreText]);
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
