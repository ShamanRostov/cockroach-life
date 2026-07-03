export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

/** Minimum logical resolution when scaling on small screens */
export const MIN_GAME_WIDTH = 640;
export const MIN_GAME_HEIGHT = 360;

/** UI scale multiplier applied on touch devices */
export const MOBILE_UI_SCALE = 1.25;

export const SCENES = {
  BOOT: 'BootScene',
  MENU: 'MenuScene',
  NEST: 'NestScene',
  SLIPPER: 'SlipperDodgeScene',
  SPRAY: 'SprayEscapeScene',
  FOOD: 'FoodHuntScene',
  CAT_CHASE: 'CatChaseScene',
  HOSPITAL: 'HospitalScene',
  WORLD_MAP: 'WorldMapScene',
  RAID: 'RaidScene',
} as const;

export type SceneKey = (typeof SCENES)[keyof typeof SCENES];

export const COLORS = {
  bgDark: 0x1a1208,
  bgWarm: 0x2d1f0e,
  floor: 0x8b6914,
  floorLight: 0xa67c1a,
  wall: 0xc4a574,
  wallDark: 0x8b7355,
  accent: 0xffa726,
  accentDark: 0xe65100,
  danger: 0xe53935,
  success: 0x43a047,
  health: 0xef5350,
  food: 0xffca28,
  money: 0x66bb6a,
  uiBg: 0x000000,
  text: 0xfff8e1,
  cockroach: 0x4a3728,
  cockroachLight: 0x6d4c3d,
} as const;

export const TILE = {
  width: 64,
  height: 32,
} as const;

/** Detect phones/tablets and touch-first browsers (Yandex Games mobile, etc.) */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;

  const touchCapable =
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigator as any).msMaxTouchPoints > 0;

  const mobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
    navigator.userAgent,
  );

  const narrowViewport = window.innerWidth <= 1024 && window.innerHeight <= 900;

  return touchCapable && (mobileUa || narrowViewport);
}
