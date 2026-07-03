export const SOUND_KEYS = [
  'ui_click',
  'ui_confirm',
  'build_place',
  'build_upgrade',
  'arcade_hit',
  'arcade_win',
  'arcade_lose',
  'raid_start',
  'raid_win',
  'raid_lose',
  'daily_bonus',
  'quest_complete',
  'ambient_nest',
] as const;

export type SoundKey = (typeof SOUND_KEYS)[number];

const SAMPLE_RATE = 44100;

function createBuffer(ctx: BaseAudioContext, durationSec: number): AudioBuffer {
  return ctx.createBuffer(1, Math.ceil(SAMPLE_RATE * durationSec), SAMPLE_RATE);
}

function applyEnvelope(data: Float32Array, attack = 0.02, release = 0.25): void {
  const len = data.length;
  const attackLen = Math.max(1, Math.floor(len * attack));
  const releaseLen = Math.max(1, Math.floor(len * release));
  for (let i = 0; i < attackLen; i++) {
    data[i] *= i / attackLen;
  }
  for (let i = 0; i < releaseLen; i++) {
    data[len - 1 - i] *= i / releaseLen;
  }
}

function writeTone(
  data: Float32Array,
  start: number,
  length: number,
  freq: number,
  volume: number,
  wave: 'sine' | 'square' | 'triangle' = 'sine',
): void {
  for (let i = 0; i < length; i++) {
    const t = (start + i) / SAMPLE_RATE;
    const phase = 2 * Math.PI * freq * t;
    let sample = 0;
    if (wave === 'sine') sample = Math.sin(phase);
    else if (wave === 'square') sample = Math.sign(Math.sin(phase));
    else sample = (2 / Math.PI) * Math.asin(Math.sin(phase));
    data[start + i] += sample * volume;
  }
}

function writeNoise(data: Float32Array, start: number, length: number, volume: number): void {
  for (let i = 0; i < length; i++) {
    data[start + i] += (Math.random() * 2 - 1) * volume;
  }
}

function normalize(data: Float32Array, peak = 0.85): void {
  let max = 0;
  for (let i = 0; i < data.length; i++) {
    max = Math.max(max, Math.abs(data[i]));
  }
  if (max < 1e-6) return;
  const scale = peak / max;
  for (let i = 0; i < data.length; i++) {
    data[i] *= scale;
  }
}

function synthClick(ctx: BaseAudioContext): AudioBuffer {
  const buffer = createBuffer(ctx, 0.06);
  const data = buffer.getChannelData(0);
  writeTone(data, 0, data.length, 1200, 0.35, 'square');
  applyEnvelope(data);
  normalize(data);
  return buffer;
}

function synthConfirm(ctx: BaseAudioContext): AudioBuffer {
  const buffer = createBuffer(ctx, 0.18);
  const data = buffer.getChannelData(0);
  const note = Math.floor(SAMPLE_RATE * 0.06);
  writeTone(data, 0, note, 660, 0.28);
  writeTone(data, note, note, 990, 0.32);
  applyEnvelope(data, 0.01, 0.2);
  normalize(data);
  return buffer;
}

function synthBuildPlace(ctx: BaseAudioContext): AudioBuffer {
  const buffer = createBuffer(ctx, 0.2);
  const data = buffer.getChannelData(0);
  writeTone(data, 0, data.length, 180, 0.45, 'triangle');
  writeNoise(data, 0, Math.floor(data.length * 0.15), 0.2);
  applyEnvelope(data, 0.005, 0.35);
  normalize(data);
  return buffer;
}

function synthBuildUpgrade(ctx: BaseAudioContext): AudioBuffer {
  const buffer = createBuffer(ctx, 0.35);
  const data = buffer.getChannelData(0);
  const step = Math.floor(SAMPLE_RATE * 0.08);
  const freqs = [440, 554, 659, 880];
  freqs.forEach((freq, i) => writeTone(data, i * step, step + 200, freq, 0.22));
  applyEnvelope(data, 0.01, 0.3);
  normalize(data);
  return buffer;
}

function synthHit(ctx: BaseAudioContext): AudioBuffer {
  const buffer = createBuffer(ctx, 0.15);
  const data = buffer.getChannelData(0);
  writeNoise(data, 0, data.length, 0.5);
  writeTone(data, 0, data.length, 90, 0.35, 'square');
  applyEnvelope(data, 0.001, 0.4);
  normalize(data);
  return buffer;
}

function synthWin(ctx: BaseAudioContext): AudioBuffer {
  const buffer = createBuffer(ctx, 0.55);
  const data = buffer.getChannelData(0);
  const step = Math.floor(SAMPLE_RATE * 0.1);
  [523, 659, 784, 1047].forEach((freq, i) => writeTone(data, i * step, step + 400, freq, 0.24));
  applyEnvelope(data, 0.01, 0.25);
  normalize(data);
  return buffer;
}

function synthLose(ctx: BaseAudioContext): AudioBuffer {
  const buffer = createBuffer(ctx, 0.45);
  const data = buffer.getChannelData(0);
  const step = Math.floor(SAMPLE_RATE * 0.12);
  [392, 330, 262, 196].forEach((freq, i) => writeTone(data, i * step, step + 300, freq, 0.26));
  applyEnvelope(data, 0.01, 0.3);
  normalize(data);
  return buffer;
}

function synthRaidStart(ctx: BaseAudioContext): AudioBuffer {
  const buffer = createBuffer(ctx, 0.5);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / SAMPLE_RATE;
    const freq = 120 + t * 400;
    data[i] = Math.sin(2 * Math.PI * freq * t) * 0.3;
  }
  writeNoise(data, 0, Math.floor(data.length * 0.2), 0.15);
  applyEnvelope(data, 0.05, 0.35);
  normalize(data);
  return buffer;
}

function synthDailyBonus(ctx: BaseAudioContext): AudioBuffer {
  const buffer = createBuffer(ctx, 0.4);
  const data = buffer.getChannelData(0);
  const step = Math.floor(SAMPLE_RATE * 0.07);
  [880, 1108, 1318, 1760].forEach((freq, i) => writeTone(data, i * step, step + 250, freq, 0.2));
  applyEnvelope(data, 0.01, 0.2);
  normalize(data);
  return buffer;
}

function synthAmbient(ctx: BaseAudioContext): AudioBuffer {
  const buffer = createBuffer(ctx, 2);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / SAMPLE_RATE;
    data[i] =
      Math.sin(2 * Math.PI * 55 * t) * 0.08 +
      Math.sin(2 * Math.PI * 82.5 * t) * 0.05 +
      (Math.random() * 2 - 1) * 0.015;
  }
  applyEnvelope(data, 0.1, 0.1);
  normalize(data, 0.5);
  return buffer;
}

/** Synthesize all placeholder SFX using the Web Audio API (no external assets). */
export function generateAllSounds(ctx: BaseAudioContext): Record<SoundKey, AudioBuffer> {
  return {
    ui_click: synthClick(ctx),
    ui_confirm: synthConfirm(ctx),
    build_place: synthBuildPlace(ctx),
    build_upgrade: synthBuildUpgrade(ctx),
    arcade_hit: synthHit(ctx),
    arcade_win: synthWin(ctx),
    arcade_lose: synthLose(ctx),
    raid_start: synthRaidStart(ctx),
    raid_win: synthWin(ctx),
    raid_lose: synthLose(ctx),
    daily_bonus: synthDailyBonus(ctx),
    quest_complete: synthDailyBonus(ctx),
    ambient_nest: synthAmbient(ctx),
  };
}
