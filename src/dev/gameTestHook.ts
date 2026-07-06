import type Phaser from 'phaser';
import { SCENES } from '../game/config';

export interface GameTestApi {
  getActiveSceneKey(): string | null;
  waitForScene(key: string, timeoutMs?: number): Promise<boolean>;
  tap(x: number, y: number): void;
  getInteractiveCount(): number;
}

declare global {
  interface Window {
    __CL_GAME__?: Phaser.Game;
    __CL_TEST__?: GameTestApi;
  }
}

export function installGameTestHook(game: Phaser.Game): void {
  const api: GameTestApi = {
    getActiveSceneKey(): string | null {
      const scenes = game.scene.getScenes(true);
      const active = scenes.find((s) => s.scene.isActive() && s.scene.key !== SCENES.BOOT);
      return active?.scene.key ?? scenes[0]?.scene.key ?? null;
    },

    waitForScene(key: string, timeoutMs = 15000): Promise<boolean> {
      return new Promise((resolve) => {
        const start = Date.now();
        const tick = (): void => {
          if (api.getActiveSceneKey() === key) {
            resolve(true);
            return;
          }
          if (Date.now() - start > timeoutMs) {
            resolve(false);
            return;
          }
          requestAnimationFrame(tick);
        };
        tick();
      });
    },

    tap(x: number, y: number): void {
      const scene = game.scene.getScenes(true).find((s) => s.scene.isActive());
      if (!scene) return;
      const pointer = scene.input.activePointer;
      pointer.x = x;
      pointer.y = y;
      pointer.worldX = x;
      pointer.worldY = y;
      pointer.downX = x;
      pointer.downY = y;
      pointer.upX = x;
      pointer.upY = y;
      scene.input.emit('pointerdown', pointer);
      scene.input.emit('pointerup', pointer);
    },

    getInteractiveCount(): number {
      const scene = game.scene.getScenes(true).find((s) => s.scene.isActive());
      if (!scene) return 0;
      return scene.input.hitTestPointer(scene.input.activePointer).length;
    },
  };

  window.__CL_GAME__ = game;
  window.__CL_TEST__ = api;
}
