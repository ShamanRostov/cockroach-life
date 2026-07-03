/** Color helpers for layered isometric art. */
export function darken(color: number, amount: number): number {
  const r = Math.max(0, ((color >> 16) & 0xff) * (1 - amount));
  const g = Math.max(0, ((color >> 8) & 0xff) * (1 - amount));
  const b = Math.max(0, (color & 0xff) * (1 - amount));
  return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
}

export function lighten(color: number, amount: number): number {
  const r = Math.min(255, ((color >> 16) & 0xff) + 255 * amount);
  const g = Math.min(255, ((color >> 8) & 0xff) + 255 * amount);
  const b = Math.min(255, (color & 0xff) + 255 * amount);
  return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Clamp build reveal progress 0..1 */
export function phase(progress: number, start: number, end: number): number {
  if (progress <= start) return 0;
  if (progress >= end) return 1;
  return (progress - start) / (end - start);
}

export const NEST_PALETTE = {
  linoleumBase: 0xc9b896,
  linoleumDark: 0xa8926e,
  linoleumGrout: 0x8a7355,
  dirt: 0x6d5a42,
  wallWarm: 0x3d2e1f,
  wallGlow: 0xffa726,
  cardboard: 0xc4a574,
  cardboardDark: 0x8d6e4c,
  cardboardLine: 0x6d4c33,
  cereal: 0xffb74d,
  fabric: 0xce93d8,
  fabricDark: 0x8e5a9b,
  metal: 0x90a4ae,
  metalDark: 0x546e7a,
  metalShine: 0xeceff1,
  eggShell: 0xfff8e1,
  eggCarton: 0xa5d6a7,
  eggCartonDark: 0x66bb6a,
  bandage: 0xe3f2fd,
  bandageCross: 0xef5350,
  cotton: 0xffffff,
  straw: 0xffcc80,
  crumb: 0xffa726,
  shadow: 0x1a1208,
} as const;
