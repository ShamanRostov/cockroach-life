import Phaser from 'phaser';
import { generateAllSounds, type SoundKey } from './generateSounds';

const MUTE_KEY = 'cockroach-life-muted';

/** Lightweight singleton wrapping Phaser's Web Audio sound manager. */
export class SoundManager {
  private static instance: SoundManager | null = null;

  private game: Phaser.Game | null = null;
  private muted = false;
  private musicKey: SoundKey | null = null;
  private initialized = false;

  static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  init(game: Phaser.Game): void {
    if (this.initialized) return;

    this.game = game;
    this.muted = localStorage.getItem(MUTE_KEY) === 'true';

    const sound = game.sound;
    if (!(sound instanceof Phaser.Sound.WebAudioSoundManager)) {
      console.warn('[SoundManager] Web Audio unavailable');
      return;
    }

    const ctx = sound.context;
    if (!ctx) {
      console.warn('[SoundManager] Web Audio unavailable');
      return;
    }

    const buffers = generateAllSounds(ctx);
    for (const [key, buffer] of Object.entries(buffers)) {
      if (!game.cache.audio.exists(key)) {
        sound.add(key, { buffer } as unknown as Phaser.Types.Sound.SoundConfig);
      }
    }

    this.initialized = true;
  }

  playSFX(key: SoundKey, volume = 0.65): void {
    if (this.muted || !this.game || !this.initialized) return;
    try {
      this.game.sound.play(key, { volume });
    } catch {
      // Audio may be blocked until user gesture — fail silently.
    }
  }

  playMusic(key: SoundKey, volume = 0.18): void {
    if (!this.game || !this.initialized) return;

    if (this.musicKey && this.musicKey !== key) {
      this.game.sound.stopByKey(this.musicKey);
    }

    this.musicKey = key;

    if (this.muted) return;

    try {
      if (!this.game.sound.isPlaying(key)) {
        this.game.sound.play(key, { volume, loop: true });
      }
    } catch {
      // ignore
    }
  }

  stopMusic(): void {
    if (!this.game || !this.musicKey) return;
    this.game.sound.stopByKey(this.musicKey);
    this.musicKey = null;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    localStorage.setItem(MUTE_KEY, String(muted));

    if (!this.game) return;

    if (muted) {
      this.game.sound.mute = true;
      if (this.musicKey) {
        this.game.sound.stopByKey(this.musicKey);
      }
    } else {
      this.game.sound.mute = false;
      if (this.musicKey) {
        this.playMusic(this.musicKey);
      }
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
