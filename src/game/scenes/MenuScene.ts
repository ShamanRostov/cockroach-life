import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT, isMobileDevice } from '../config';
import { createAdaptiveButton, addFullscreenBg, createModalOverlay, createModalPanel } from '../ui/ButtonHelper';
import { addVignette, addWarmGlow } from '../graphics/VisualEffects';
import { DEPTH } from '../graphics/SceneDepth';
import { GameState } from '../GameState';
import { i18n, L, SUPPORTED_LOCALES } from '../../i18n';
import { SoundManager } from '../audio/SoundManager';
import { LeaderboardPanel } from '../ui/LeaderboardPanel';
import { SeasonPassPanel } from '../ui/SeasonPassPanel';
import { ru } from '../../i18n/locales/ru';
import { en } from '../../i18n/locales/en';
import packageJson from '../../../package.json';

const GAME_VERSION = packageJson.version;

const LOCALE_NAMES = { ru: ru.meta.name, en: en.meta.name } as const;

const MENU_BTN_W = 460;
const MENU_BTN_H = 68;
const MENU_BTN_GAP = 82;

export class MenuScene extends Phaser.Scene {
  private leaderboardPanel = new LeaderboardPanel();
  private seasonPassPanel = new SeasonPassPanel();

  constructor() {
    super(SCENES.MENU);
  }

  create(): void {
    addFullscreenBg(this, 'menu-bg', DEPTH.background);
    addWarmGlow(this, GAME_WIDTH * 0.72, 80, DEPTH.ambient, 1.8);
    addVignette(this);
    this.createBackgroundParticles();

    const cx = GAME_WIDTH / 2;
    const t = L();
    const startY = 268;

    this.add
      .image(cx, 108, 'ui-panel')
      .setDisplaySize(680, 130)
      .setAlpha(0.9)
      .setDepth(DEPTH.ui);

    const titleShadow = this.add
      .text(cx + 3, 111, t.game.title, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '52px',
        color: '#1a1208',
      })
      .setOrigin(0.5)
      .setAlpha(0.45)
      .setDepth(DEPTH.ui + 1);

    const title = this.add
      .text(cx, 108, t.game.title, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '52px',
        color: '#fff8e1',
        stroke: '#e65100',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.ui + 2);

    this.tweens.add({
      targets: title,
      y: title.y + 2,
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: titleShadow,
      x: titleShadow.x + 2,
      y: titleShadow.y + 3,
      alpha: 0.55,
      duration: 2800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add
      .text(cx, 178, t.game.subtitle, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '22px',
        color: '#bcaaa4',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.ui + 2);

    const menuButtons: Phaser.GameObjects.Container[] = [];

    menuButtons.push(
      createAdaptiveButton(this, cx, startY, t.menu.play, () => {
        SoundManager.getInstance().playMusic('ambient_nest');
        this.scene.start(SCENES.NEST);
      }, MENU_BTN_W, MENU_BTN_H, 'ui_confirm'),
    );

    if (GameState.getInstance().tutorial.isActive()) {
      this.add
        .text(cx, startY - 52, L().tutorial.welcome.split('\n')[0]!, {
          fontFamily: 'Segoe UI, Arial, sans-serif',
          fontSize: '16px',
          color: '#ffa726',
          align: 'center',
          wordWrap: { width: 520 },
        })
        .setOrigin(0.5)
        .setDepth(DEPTH.ui + 10);
    }

    menuButtons.push(
      createAdaptiveButton(this, cx, startY + MENU_BTN_GAP, t.menu.arcade, () => {
        this.showArcadeMenu();
      }, MENU_BTN_W, MENU_BTN_H),
      createAdaptiveButton(this, cx, startY + MENU_BTN_GAP * 2, t.menu.leaderboards, () => {
        this.leaderboardPanel.show(this);
      }, MENU_BTN_W, MENU_BTN_H),
      createAdaptiveButton(this, cx, startY + MENU_BTN_GAP * 3, t.menu.newGame, () => {
        GameState.getInstance().reset();
        GameState.getInstance().persist();
        this.scene.restart();
      }, MENU_BTN_W, MENU_BTN_H),
      createAdaptiveButton(this, cx, startY + MENU_BTN_GAP * 4, t.menu.language, () => {
        this.showLanguageMenu();
      }, MENU_BTN_W, MENU_BTN_H),
      createAdaptiveButton(this, cx, startY + MENU_BTN_GAP * 5, L().seasonPass.title, () => {
        this.seasonPassPanel.show(this);
      }, MENU_BTN_W, MENU_BTN_H),
    );

    menuButtons.forEach((btn, i) => {
      const targetY = btn.y;
      btn.setDepth(DEPTH.ui + 10).setAlpha(0);
      btn.y = targetY + 10;
      this.tweens.add({
        targets: btn,
        alpha: 1,
        y: targetY,
        duration: 380,
        delay: 120 + i * 90,
        ease: 'Cubic.easeOut',
      });
    });

    this.createMuteButton();

    this.add
      .text(12, GAME_HEIGHT - 12, `v${GAME_VERSION}`, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '13px',
        color: '#8d6e63',
      })
      .setOrigin(0, 1)
      .setDepth(DEPTH.ui + 2);

    this.add
      .text(cx, GAME_HEIGHT - 36, isMobileDevice() ? t.menu.touchControls : t.menu.controls, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '15px',
        color: '#bcaaa4',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.ui + 2);

    SoundManager.getInstance().playMusic('ambient_nest');
  }

  private createBackgroundParticles(): void {
    const particles = this.add.particles(0, 0, 'spark', {
      x: { min: 0, max: GAME_WIDTH },
      y: GAME_HEIGHT + 10,
      speedY: { min: -30, max: -70 },
      speedX: { min: -15, max: 15 },
      scale: { min: 0.04, max: 0.1 },
      alpha: { min: 0.15, max: 0.45 },
      lifespan: { min: 3000, max: 6000 },
      frequency: 280,
      tint: [0xffa726, 0xffcc80, 0xbcaaa4],
      blendMode: Phaser.BlendModes.ADD,
    });
    particles.setDepth(DEPTH.ambient + 1);
  }

  private createMuteButton(): void {
    const sound = SoundManager.getInstance();
    const label = () => (sound.isMuted() ? L().menu.soundOff : L().menu.soundOn);

    const btn = createAdaptiveButton(this, GAME_WIDTH - 88, 40, label(), () => {
      sound.toggleMute();
      const text = btn.getAt(1);
      if (text instanceof Phaser.GameObjects.Text) {
        text.setText(label());
      }
    }, 140, 44);
    btn.setDepth(DEPTH.ui + 20);
  }

  private showLanguageMenu(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const depth = 900;

    createModalOverlay(this, depth);
    createModalPanel(this, cx, cy, 440, 300, depth + 1);

    this.add
      .text(cx, cy - 110, L().menu.language, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '28px',
        color: '#fff8e1',
      })
      .setOrigin(0.5)
      .setDepth(depth + 2);

    const close = (): void => {
      this.scene.restart();
    };

    SUPPORTED_LOCALES.forEach((locale, i) => {
      const isActive = locale === i18n.getLocale();
      const label = isActive ? `✓ ${LOCALE_NAMES[locale]}` : LOCALE_NAMES[locale];

      createAdaptiveButton(
        this,
        cx,
        cy - 40 + i * 72,
        label,
        () => {
          i18n.setLocale(locale);
          close();
        },
        360,
        58,
      ).setDepth(depth + 3);
    });

    createAdaptiveButton(this, cx, cy + 100, L().menu.back, close, 200, 52).setDepth(depth + 3);
  }

  private showArcadeMenu(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const t = L();
    const depth = 900;

    createModalOverlay(this, depth);
    createModalPanel(this, cx, cy, 520, 540, depth + 1);

    this.add
      .text(cx, cy - 190, t.menu.arcadeTitle, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '30px',
        color: '#fff8e1',
      })
      .setOrigin(0.5)
      .setDepth(depth + 2);

    const arcades = [
      { label: t.arcade.slipper.title, scene: SCENES.SLIPPER },
      { label: t.arcade.spray.title, scene: SCENES.SPRAY },
      { label: t.arcade.food.title, scene: SCENES.FOOD },
      { label: t.arcade.catChase.title, scene: SCENES.CAT_CHASE },
      { label: t.arcade.hospital.title, scene: SCENES.HOSPITAL },
    ];

    arcades.forEach((a, i) => {
      createAdaptiveButton(
        this,
        cx,
        cy - 110 + i * 76,
        a.label,
        () => {
          this.scene.start(a.scene);
        },
        420,
        62,
      ).setDepth(depth + 3);
    });

    createAdaptiveButton(
      this,
      cx,
      cy + 210,
      t.menu.back,
      () => {
        this.scene.restart();
      },
      220,
      52,
    ).setDepth(depth + 3);
  }
}
