/** Consistent render layers across all scenes (lower = behind). */
export const DEPTH = {
  background: 0,
  ambient: 3,
  floor: 5,
  world: 10,
  entities: 20,
  particles: 40,
  ui: 100,
  hud: 500,
  overlay: 900,
  vignette: 8,
  modal: 1000,
  touch: 1100,
} as const;
