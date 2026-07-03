import Phaser from 'phaser';
import { SCENES } from '../game/config';
import { GameState } from '../game/GameState';
import { getBotPlayers } from '../game/systems/WorldMapData';
import { applyScreenshotState } from './setupScreenshotState';
import { SS_REGISTRY } from './screenshotRegistry';

export { SS_REGISTRY } from './screenshotRegistry';

type ScreenshotTarget =
  | 'nest'
  | 'slipper'
  | 'raid'
  | 'world-map'
  | 'breeding'
  | 'shop-daily';

const TARGETS: { id: ScreenshotTarget; label: string; file: string }[] = [
  { id: 'nest', label: '1. Nest building', file: '01-nest-building.png' },
  { id: 'slipper', label: '2. Slipper dodge', file: '02-slipper-dodge.png' },
  { id: 'raid', label: '3. Raid infiltration', file: '03-raid-infiltration.png' },
  { id: 'world-map', label: '4. World map', file: '04-world-map.png' },
  { id: 'breeding', label: '5. Breeding panel', file: '05-breeding-panel.png' },
  { id: 'shop-daily', label: '6. Shop + daily', file: '06-shop-daily-quests.png' },
];

function clearScreenshotFlags(game: Phaser.Game): void {
  game.registry.set(SS_REGISTRY.NEST_PANEL, null);
  game.registry.set(SS_REGISTRY.SKIP_DAILY_POPUP, false);
  game.registry.set(SS_REGISTRY.DUAL_PANELS, false);
  game.registry.set(SS_REGISTRY.SLIPPER_MID, false);
  game.registry.set(SS_REGISTRY.RAID_INFILTRATE, false);
}

function navigateToScreenshot(game: Phaser.Game, target: ScreenshotTarget): void {
  const state = GameState.getInstance();
  applyScreenshotState(state);
  clearScreenshotFlags(game);
  game.registry.set(SS_REGISTRY.ACTIVE, true);

  switch (target) {
    case 'nest':
      game.registry.set(SS_REGISTRY.SKIP_DAILY_POPUP, true);
      state.switchNestRegion('apartment');
      game.scene.start(SCENES.NEST);
      break;

    case 'slipper':
      game.registry.set(SS_REGISTRY.SLIPPER_MID, { score: 620 });
      game.scene.start(SCENES.SLIPPER);
      break;

    case 'raid': {
      const bot = getBotPlayers().find((p) => p.districtId === 'fridge') ?? getBotPlayers()[0];
      if (bot) {
        state.raid.currentTarget = {
          ...bot,
          rooms: bot.rooms.map((r) => ({ ...r })),
          traps: [...bot.traps],
        };
      }
      game.registry.set(SS_REGISTRY.RAID_INFILTRATE, true);
      game.scene.start(SCENES.RAID);
      break;
    }

    case 'world-map':
      game.scene.start(SCENES.WORLD_MAP);
      break;

    case 'breeding':
      game.registry.set(SS_REGISTRY.SKIP_DAILY_POPUP, true);
      game.registry.set(SS_REGISTRY.NEST_PANEL, 'breeding');
      game.scene.start(SCENES.NEST);
      break;

    case 'shop-daily':
      game.registry.set(SS_REGISTRY.SKIP_DAILY_POPUP, true);
      game.registry.set(SS_REGISTRY.NEST_PANEL, 'shop-daily');
      game.registry.set(SS_REGISTRY.DUAL_PANELS, true);
      game.scene.start(SCENES.NEST);
      break;
  }
}

function createPanel(game: Phaser.Game): HTMLElement {
  const panel = document.createElement('div');
  panel.id = 'screenshot-mode-panel';
  panel.innerHTML = `
    <style>
      #screenshot-mode-panel {
        position: fixed;
        top: 12px;
        right: 12px;
        z-index: 100000;
        font-family: 'Segoe UI', Arial, sans-serif;
        background: rgba(26, 18, 8, 0.94);
        border: 2px solid #ffa726;
        border-radius: 10px;
        padding: 12px 14px;
        color: #fff8e1;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.55);
        max-width: 240px;
        pointer-events: auto;
      }
      #screenshot-mode-panel h3 {
        margin: 0 0 8px;
        font-size: 14px;
        color: #ffa726;
        font-weight: 700;
      }
      #screenshot-mode-panel .ss-hint {
        margin: 0 0 10px;
        font-size: 11px;
        line-height: 1.4;
        color: #bcaaa4;
      }
      #screenshot-mode-panel button {
        display: block;
        width: 100%;
        margin: 0 0 6px;
        padding: 7px 10px;
        border: 1px solid #e65100;
        border-radius: 6px;
        background: #2d1f0e;
        color: #fff8e1;
        font-size: 12px;
        cursor: pointer;
        text-align: left;
      }
      #screenshot-mode-panel button:hover {
        background: #3d2910;
        border-color: #ffa726;
      }
      #screenshot-mode-panel button:last-child {
        margin-bottom: 0;
      }
      #screenshot-mode-panel .ss-reset {
        margin-top: 8px;
        border-color: #546e7a;
        color: #bcaaa4;
        font-size: 11px;
      }
    </style>
    <h3>📸 Screenshot Mode</h3>
    <p class="ss-hint">Press F12 or use browser screenshot at 1280×720</p>
  `;

  for (const target of TARGETS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = target.label;
    btn.title = `Save as ${target.file}`;
    btn.addEventListener('click', () => navigateToScreenshot(game, target.id));
    panel.appendChild(btn);
  }

  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.className = 'ss-reset';
  resetBtn.textContent = '↺ Reset save state';
  resetBtn.addEventListener('click', () => applyScreenshotState());
  panel.appendChild(resetBtn);

  return panel;
}

/** Mount the floating screenshot helper panel (call once from main.ts). */
export function initScreenshotMode(game: Phaser.Game): void {
  if (document.getElementById('screenshot-mode-panel')) return;

  game.registry.set(SS_REGISTRY.ACTIVE, true);
  document.body.appendChild(createPanel(game));
}
