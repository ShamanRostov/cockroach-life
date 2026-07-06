import Phaser from 'phaser';
import { generateAllSounds, type SoundKey } from './generateSounds';

const MUTE_KEY = 'cockroach-life-muted';

/** Procedural Web Audio — does not rely on Phaser audio cache. */
export class SoundManager {
  private static instance: SoundManager | null = null;

  private ctx: AudioContext | null = null;
  private buffers = new Map<SoundKey, AudioBuffer>();
  private muted = false;
  private musicSource: AudioBufferSourceNode | null = null;
  private initialized = false;

  static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  /** @param _game Kept for call-site compatibility with Phaser scenes. */
  init(_game?: Phaser.Game): void {
    if (this.initialized) return;

    this.muted = localStorage.getItem(MUTE_KEY) === 'true';

    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) {
        console.warn('[SoundManager] Web Audio API unavailable');
        return;
      }

      this.ctx = new Ctx();
      const generated = generateAllSounds(this.ctx);
      for (const [key, buffer] of Object.entries(generated)) {
        this.buffers.set(key as SoundKey, buffer);
      }
      this.initialized = true;
    } catch (error) {
      console.warn('[SoundManager] Init failed — game continues without sound', error);
    }
  }

  private ensureResumed(): void {
    if (this.ctx?.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  playSFX(key: SoundKey, volume = 0.65): void {
    if (this.muted || !this.ctx || !this.initialized) return;
    const buffer = this.buffers.get(key);
    if (!buffer) return;

    try {
      this.ensureResumed();
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      const gain = this.ctx.createGain();
      gain.gain.value = volume;
      source.connect(gain);
      gain.connect(this.ctx.destination);
      source.start(0);
    } catch {
      // Blocked until user gesture — fail silently.
    }
  }

  playMusic(key: SoundKey, volume = 0.18): void {
    if (!this.ctx || !this.initialized) return;

    this.stopMusic();
    if (this.muted) return;

    const buffer = this.buffers.get(key);
    if (!buffer) return;

    try {
      this.ensureResumed();
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const gain = this.ctx.createGain();
      gain.gain.value = volume;
      source.connect(gain);
      gain.connect(this.ctx.destination);
      source.start(0);
      this.musicSource = source;
    } catch {
      // ignore
    }
  }

  stopMusic(): void {
    try {
      this.musicSource?.stop();
    } catch {
      // already stopped
    }
    this.musicSource = null;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    localStorage.setItem(MUTE_KEY, String(muted));
    if (muted) {
      this.stopMusic();
    }
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }
}
