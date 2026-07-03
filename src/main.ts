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
import { platformManager } from './platforms/PlatformManager';
import { bindAnalytics } from './game/analytics/bindAnalytics';
import { i18n } from './i18n';

i18n.init();
void platformManager.init();

const mobile = isMobileDevice();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
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

const game = new Phaser.Game(config);
bindAnalytics(game);

if (new URLSearchParams(location.search).get('screenshots') === '1') {
  void import('./dev/ScreenshotMode').then(({ initScreenshotMode }) => initScreenshotMode(game));
}

if (mobile) {
  document.addEventListener(
    'touchmove',
    (e) => {
      if (e.target === game.canvas) e.preventDefault();
    },
    { passive: false },
  );

  document.addEventListener('gesturestart', (e) => e.preventDefault());
}

export { game };
