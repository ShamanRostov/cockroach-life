import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { getNestHudButtonX, getNestHudButtonY } from './MobileUILayout';
import { GameState } from '../GameState';
import type { DailyQuest } from '../types';
import {
  createTextButton,
  createModalOverlay,
  createModalPanel,
  showToast,
} from './ButtonHelper';
import { L, fmt } from '../../i18n';
import { SoundManager } from '../audio/SoundManager';
import { DEPTH } from '../graphics/SceneDepth';
import { ModalLayer } from './ModalLayer';

const PANEL_W = 540;
const PANEL_H = 560;
const QUEST_ROW_H = 64;

export class DailyPanel {
  private readonly state = GameState.getInstance();
  private modal = new ModalLayer();
  private overlay: Phaser.GameObjects.Rectangle | null = null;
  private container: Phaser.GameObjects.Container | null = null;
  private onClose: (() => void) | null = null;
  private questTexts: Phaser.GameObjects.Text[] = [];
  private progressBars: Phaser.GameObjects.Image[] = [];

  /** HUD toggle button (gift icon). */
  createHudButton(scene: Phaser.Scene): Phaser.GameObjects.Container {
    const streak = this.state.dailyBonus.getStreak();
    const bonus = this.state.dailyBonus.checkDailyBonus();
    const label = bonus.available
      ? fmt(L().daily.hudButtonReady, { streak })
      : L().daily.hudButton;

    const btn = createTextButton(
      scene,
      getNestHudButtonX('daily'),
      getNestHudButtonY('daily'),
      label,
      () => this.show(scene),
      54,
      46,
    );
    btn.setDepth(DEPTH.hud + 12);
    return btn;
  }

  show(scene: Phaser.Scene, onClose?: () => void): void {
    this.modal.destroyAll();
    this.overlay = null;
    this.container = null;
    this.questTexts = [];
    this.progressBars = [];
    this.onClose = onClose ?? null;

    const t = L().daily;
    const dual = scene.registry.get('screenshot.dualPanels') === true;
    const depth = 900;

    this.overlay = this.modal.track(createModalOverlay(scene, depth));
    this.overlay.on('pointerdown', () => this.hide());

    const panelW = dual ? 460 : PANEL_W;
    const panelH = dual ? 520 : PANEL_H;
    const cx = dual ? 310 : GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const top = cy - panelH / 2;

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
      .text(cx, top + 28, t.title, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '26px',
        fontStyle: 'bold',
        color: '#fff8e1',
        stroke: '#5d2e00',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    this.container.add(title);

    this.renderBonusSection(scene, cx, top + 70, depth);
    this.renderQuestsSection(scene, cx, top + 210, depth);

    // Footer close — always below quest rows, never shared with claim buttons
    this.modal.track(
      createTextButton(
        scene,
        cx,
        cy + panelH / 2 - 36,
        t.close,
        () => this.hide(),
        160,
        40,
      ).setDepth(depth + 4),
    );
  }

  private renderBonusSection(scene: Phaser.Scene, cx: number, y: number, depth: number): void {
    const t = L().daily;
    const bonus = this.state.dailyBonus.checkDailyBonus();
    const streak = bonus.streak;
    const { food, money } = bonus.rewards;

    const streakText = scene.add
      .text(cx, y, fmt(t.streak, { n: streak }), {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '18px',
        color: '#ffca28',
      })
      .setOrigin(0.5);
    this.container?.add(streakText);

    const rewardParts: string[] = [];
    if (food > 0) rewardParts.push(fmt(t.rewardFood, { value: food }));
    if (money > 0) rewardParts.push(fmt(t.rewardMoney, { value: money }));
    const rewardLine = rewardParts.length > 0 ? rewardParts.join('  ') : '';

    const rewardText = scene.add
      .text(cx, y + 26, rewardLine, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '15px',
        color: '#bcaaa4',
      })
      .setOrigin(0.5);
    this.container?.add(rewardText);

    if (streak >= 7) {
      const jackpot = scene.add
        .text(cx, y + 48, t.jackpot, {
          fontFamily: 'Segoe UI, Arial, sans-serif',
          fontSize: '14px',
          color: '#ff7043',
        })
        .setOrigin(0.5);
      this.container?.add(jackpot);
    }

    if (bonus.available) {
      this.modal.track(
        createTextButton(
          scene,
          cx,
          y + 86,
          t.claimBonus,
          () => {
            if (this.state.claimDailyBonus()) {
              SoundManager.getInstance().playSFX('daily_bonus');
              showToast(scene, t.bonusClaimed);
              this.hide();
              this.show(scene, this.onClose ?? undefined);
            }
          },
          220,
          40,
        ).setDepth(depth + 3),
      );
    } else {
      const claimed = scene.add
        .text(cx, y + 86, t.bonusClaimedToday, {
          fontFamily: 'Segoe UI, Arial, sans-serif',
          fontSize: '15px',
          color: '#66bb6a',
        })
        .setOrigin(0.5);
      this.container?.add(claimed);
    }
  }

  private renderQuestsSection(scene: Phaser.Scene, cx: number, startY: number, depth: number): void {
    const t = L().daily;
    const quests = this.state.dailyQuests.getActiveQuests();

    const header = scene.add
      .text(cx, startY, t.questsTitle, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#fff8e1',
      })
      .setOrigin(0.5);
    this.container?.add(header);

    this.questTexts = [];
    this.progressBars = [];

    quests.forEach((quest, i) => {
      const y = startY + 40 + i * QUEST_ROW_H;
      this.renderQuestRow(scene, cx, y, quest, t, depth);
    });
  }

  private renderQuestRow(
    scene: Phaser.Scene,
    cx: number,
    y: number,
    quest: DailyQuest,
    t: ReturnType<typeof L>['daily'],
    depth: number,
  ): void {
    const name = fmt(t.questNames[quest.type], { n: quest.target });
    const progressLabel = fmt(t.progress, {
      current: Math.min(quest.progress, quest.target),
      target: quest.target,
    });

    const nameText = scene.add
      .text(cx - 230, y - 12, name, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '14px',
        color: '#fff8e1',
      })
      .setOrigin(0, 0.5);
    this.container?.add(nameText);
    this.questTexts.push(nameText);

    const barBg = scene.add
      .image(cx - 230, y + 14, 'ui-button')
      .setOrigin(0, 0.5)
      .setDisplaySize(280, 10)
      .setTint(0x3e2723);
    this.container?.add(barBg);

    const ratio = quest.target > 0 ? Math.min(quest.progress / quest.target, 1) : 0;
    const barFill = scene.add
      .image(cx - 230, y + 14, 'ui-button')
      .setOrigin(0, 0.5)
      .setDisplaySize(Math.max(2, 280 * ratio), 10)
      .setTint(quest.claimed ? 0x66bb6a : 0xffa726);
    this.container?.add(barFill);
    this.progressBars.push(barFill);

    const progText = scene.add
      .text(cx + 60, y + 14, progressLabel, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '12px',
        color: '#bcaaa4',
      })
      .setOrigin(0, 0.5);
    this.container?.add(progText);

    const rewardParts: string[] = [];
    if (quest.reward.food) rewardParts.push(`🍞${quest.reward.food}`);
    if (quest.reward.money) rewardParts.push(`💰${quest.reward.money}`);
    const rewardStr = rewardParts.join(' ');

    // Right column: status / claim — never under the Close footer
    const actionX = cx + 170;
    if (quest.claimed) {
      const done = scene.add
        .text(actionX, y, t.questDone, {
          fontFamily: 'Segoe UI, Arial, sans-serif',
          fontSize: '13px',
          color: '#66bb6a',
        })
        .setOrigin(0.5);
      this.container?.add(done);
    } else if (quest.progress >= quest.target) {
      this.modal.track(
        createTextButton(
          scene,
          actionX,
          y,
          fmt(t.claimQuest, { reward: rewardStr }),
          () => {
            if (this.state.claimDailyQuest(quest.id)) {
              SoundManager.getInstance().playSFX('quest_complete');
              showToast(scene, t.questClaimed);
              this.hide();
              this.show(scene, this.onClose ?? undefined);
            }
          },
          150,
          36,
        ).setDepth(depth + 3),
      );
    } else {
      const pending = scene.add
        .text(actionX, y, rewardStr, {
          fontFamily: 'Segoe UI, Arial, sans-serif',
          fontSize: '13px',
          color: '#8d6e63',
        })
        .setOrigin(0.5);
      this.container?.add(pending);
    }
  }

  hide(): void {
    this.modal.destroyAll();
    this.overlay = null;
    this.container = null;
    this.questTexts = [];
    this.progressBars = [];
    const cb = this.onClose;
    this.onClose = null;
    cb?.();
  }

  isVisible(): boolean {
    return this.overlay !== null;
  }
}
