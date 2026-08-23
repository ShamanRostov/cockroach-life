import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { isNestUIRegion } from './NestLayout';

const MIN_ZOOM = 1;
const MAX_ZOOM = 2.4;

/**
 * Wheel + pinch zoom for nest world layers (UI stays fixed in screen space).
 * World objects live in `worldRoot` at absolute nest coordinates.
 */
export class NestWorldZoom {
  private readonly worldRoot: Phaser.GameObjects.Container;
  private zoom = 1;
  private panX = 0;
  private panY = 0;
  private pinchStartDist = 0;
  private pinchStartZoom = 1;
  private panning = false;
  private panLastX = 0;
  private panLastY = 0;

  constructor(scene: Phaser.Scene, worldRoot: Phaser.GameObjects.Container) {
    this.worldRoot = worldRoot;

    scene.input.on('wheel', (
      pointer: Phaser.Input.Pointer,
      _over: unknown,
      _dx: number,
      dy: number,
    ) => {
      if (isNestUIRegion(pointer.x, pointer.y)) return;
      const factor = dy > 0 ? 0.9 : 1.1;
      this.setZoom(this.zoom * factor, pointer.x, pointer.y);
    });

    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (isNestUIRegion(pointer.x, pointer.y)) return;
      const pointers = scene.input.manager.pointers.filter((p) => p.active);
      if (pointers.length >= 2) {
        this.panning = false;
        const [a, b] = pointers;
        this.pinchStartDist = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
        this.pinchStartZoom = this.zoom;
        return;
      }
      if (this.zoom > 1.02 && pointer.rightButtonDown() === false) {
        // Middle button or hold-drag when zoomed: start pan on second gesture —
        // use space/middle only would be obscure; pan with two-finger already via pinch center.
        // Single-finger pan when zoomed and not building: enabled via shift or when no build intent.
      }
      if (pointer.middleButtonDown() || (pointer.event as PointerEvent | undefined)?.altKey) {
        this.panning = true;
        this.panLastX = pointer.x;
        this.panLastY = pointer.y;
      }
    });

    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const pointers = scene.input.manager.pointers.filter((p) => p.isDown);
      if (pointers.length >= 2) {
        const [a, b] = pointers;
        const dist = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
        if (this.pinchStartDist > 8) {
          const midX = (a.x + b.x) / 2;
          const midY = (a.y + b.y) / 2;
          this.setZoom(this.pinchStartZoom * (dist / this.pinchStartDist), midX, midY);
        }
        return;
      }
      if (this.panning && pointer.isDown) {
        this.panX += pointer.x - this.panLastX;
        this.panY += pointer.y - this.panLastY;
        this.panLastX = pointer.x;
        this.panLastY = pointer.y;
        this.clampPan();
        this.applyTransform();
      }
    });

    scene.input.on('pointerup', () => {
      this.panning = false;
      const down = scene.input.manager.pointers.filter((p) => p.isDown);
      if (down.length < 2) {
        this.pinchStartDist = 0;
      }
    });
  }

  /** Convert screen pointer to nest world coordinates (pre-zoom space). */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX - this.panX) / this.zoom,
      y: (screenY - this.panY) / this.zoom,
    };
  }

  get scale(): number {
    return this.zoom;
  }

  private setZoom(next: number, focusX: number, focusY: number): void {
    const old = this.zoom;
    const clamped = Phaser.Math.Clamp(next, MIN_ZOOM, MAX_ZOOM);
    if (Math.abs(clamped - old) < 0.001) return;

    const wx = (focusX - this.panX) / old;
    const wy = (focusY - this.panY) / old;
    this.zoom = clamped;
    this.panX = focusX - wx * this.zoom;
    this.panY = focusY - wy * this.zoom;

    if (this.zoom <= 1.001) {
      this.zoom = 1;
      this.panX = 0;
      this.panY = 0;
    } else {
      this.clampPan();
    }
    this.applyTransform();
  }

  private clampPan(): void {
    const maxPanX = GAME_WIDTH * 0.35 * (this.zoom - 1);
    const maxPanY = GAME_HEIGHT * 0.35 * (this.zoom - 1);
    this.panX = Phaser.Math.Clamp(this.panX, -maxPanX, maxPanX);
    this.panY = Phaser.Math.Clamp(this.panY, -maxPanY, maxPanY);
  }

  private applyTransform(): void {
    this.worldRoot.setScale(this.zoom);
    this.worldRoot.setPosition(this.panX, this.panY);
  }
}
