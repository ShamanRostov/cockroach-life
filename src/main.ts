import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  COLORS,
  MIN_GAME_WIDTH,
  MIN_GAME_HEIGHT,
  isMobileDevice,
} from './game/config';
import { BootScene } from './game/scenes/BootScene';
import { MenuScene } from './game/scenes/MenuScene';
import { NestScene } from './game/scenes/NestScene';
import { SlipperDodgeScene } from './game/scenes/SlipperDodgeScene';
import { SprayEscapeScene } from './game/scenes/SprayEscapeScene';
import { FoodHuntScene } from './game/scenes/FoodHuntScene';
import { CatChaseScene } from './game/scenes/CatChaseScene';
import { HospitalScene } from './game/scenes/HospitalScene';
import { WorldMapScene } from './game/scenes/WorldMapScene';
import { RaidScene } from './game/scenes/RaidScene';
import { bindAnalytics } from './game/analytics/bindAnalytics';
import { i18n } from './i18n';
import { showLaunchError, probeWebGL } from './boot/launchGuard';

i18n.init();

function buildConfig(renderer: number): Phaser.Types.Core.GameConfig {
  const mobile = isMobileDevice();

  return {
    type: renderer,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: 'game-container',
    backgroundColor: COLORS.bgDark,
    scale: {
      mode: mobile ? Phaser.Scale.ENVELOP : Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      min: {
        width: MIN_GAME_WIDTH,
        height: MIN_GAME_HEIGHT,
      },
      max: {
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
      },
    },
    input: {
      activePointers: mobile ? 2 : 1,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [
      BootScene,
      MenuScene,
      NestScene,
      SlipperDodgeScene,
      SprayEscapeScene,
      FoodHuntScene,
      CatChaseScene,
      HospitalScene,
      WorldMapScene,
      RaidScene,
    ],
  };
}

function wireMobileScrollLock(game: Phaser.Game): void {
  if (!isMobileDevice()) return;

  document.addEventListener(
    'touchmove',
    (e) => {
      if (e.target === game.canvas) e.preventDefault();
    },
    { passive: false },
  );

  document.addEventListener('gesturestart', (e) => e.preventDefault());
}

function startGame(): void {
  const webgl = probeWebGL();
  if (!webgl.ok) {
    showLaunchError(webgl.message);
    return;
  }

  try {
    const game = new Phaser.Game(buildConfig(Phaser.AUTO));
    bindAnalytics(game);
    wireMobileScrollLock(game);

    if (new URLSearchParams(location.search).get('screenshots') === '1') {
      void import('./dev/ScreenshotMode').then(({ initScreenshotMode }) => initScreenshotMode(game));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Launch] Phaser failed:', error);

    if (message.toLowerCase().includes('webgl')) {
      try {
        const game = new Phaser.Game(buildConfig(Phaser.CANVAS));
        bindAnalytics(game);
        wireMobileScrollLock(game);
        return;
      } catch (fallbackError) {
        console.error('[Launch] Canvas fallback failed:', fallbackError);
      }
    }

    showLaunchError(
      'Не удалось запустить игру. Запустите через npm run dev и откройте http://localhost:5173',
    );
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startGame);
} else {
  startGame();
}
