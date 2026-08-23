import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { isNestUIRegion } from './NestLayout';

const MIN_ZOOM = 1;
const MAX_ZOOM = 2.4;
const DRAG_THRESHOLD_PX = 10;

function isPrimaryDown(pointer: Phaser.Input.Pointer): boolean {
  // Touch / pen: any contact. Mouse: left button only (button 0).
  if (pointer.wasTouch) return pointer.isDown;
  return pointer.isDown && pointer.leftButtonDown();
}

/**
 * Wheel + pinch zoom for nest world.
 * Pan only while LMB / finger is held (never sticks after release).
 */
export class NestWorldZoom {
  private readonly worldRoot: Phaser.GameObjects.Container;
  private zoom = 1;
  private panX = 0;
  private panY = 0;
  private pinchStartDist = 0;
  private pinchStartZoom = 1;

  private dragPointerId: number | null = null;
  private dragStartX = 0;
  private dragStartY = 0;
  private panLastX = 0;
  private panLastY = 0;
  private dragging = false;
  private panConsumedClick = false;

  constructor(scene: Phaser.Scene, worldRoot: Phaser.GameObjects.Container) {
    this.worldRoot = worldRoot;

    // Prevent browser context menu so RMB can cancel build modes.
    scene.game.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    scene.input.on(
      'wheel',
      (pointer: Phaser.Input.Pointer, _over: unknown, _dx: number, dy: number) => {
        if (isNestUIRegion(pointer.x, pointer.y)) return;
        const factor = dy > 0 ? 0.9 : 1.1;
        this.setZoom(this.zoom * factor, pointer.x, pointer.y);
      },
    );

    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (isNestUIRegion(pointer.x, pointer.y)) {
        this.stopPan();
        return;
      }

      // Right mouse — not a pan gesture.
      if (!pointer.wasTouch && pointer.rightButtonDown()) {
        this.stopPan();
        return;
      }

      const primaries = scene.input.manager.pointers.filter((p) => isPrimaryDown(p));
      if (primaries.length >= 2) {
        this.stopPan();
        const [a, b] = primaries;
        this.pinchStartDist = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
        this.pinchStartZoom = this.zoom;
        this.panConsumedClick = true;
        return;
      }

      if (this.zoom > 1.02 && isPrimaryDown(pointer)) {
        this.dragPointerId = pointer.id;
        this.dragStartX = pointer.x;
        this.dragStartY = pointer.y;
        this.panLastX = pointer.x;
        this.panLastY = pointer.y;
        this.dragging = false;
        this.panConsumedClick = false;
      }
    });

    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      // Hard stop if primary button is no longer held (fixes sticky pan).
      if (this.dragPointerId !== null && pointer.id === this.dragPointerId && !isPrimaryDown(pointer)) {
        this.stopPan();
        return;
      }

      const primaries = scene.input.manager.pointers.filter((p) => isPrimaryDown(p));
      if (primaries.length >= 2) {
        const [a, b] = primaries;
        const dist = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
        if (this.pinchStartDist > 8) {
          const midX = (a.x + b.x) / 2;
          const midY = (a.y + b.y) / 2;
          this.setZoom(this.pinchStartZoom * (dist / this.pinchStartDist), midX, midY);
          this.panConsumedClick = true;
        }
        return;
      }

      if (this.dragPointerId === null || pointer.id !== this.dragPointerId) return;
      if (!isPrimaryDown(pointer) || this.zoom <= 1.02) {
        this.stopPan();
        return;
      }

      const moved = Phaser.Math.Distance.Between(
        this.dragStartX,
        this.dragStartY,
        pointer.x,
        pointer.y,
      );
      if (!this.dragging && moved < DRAG_THRESHOLD_PX) return;

      this.dragging = true;
      this.panConsumedClick = true;
      this.panX += pointer.x - this.panLastX;
      this.panY += pointer.y - this.panLastY;
      this.panLastX = pointer.x;
      this.panLastY = pointer.y;
      this.clampPan();
      this.applyTransform();
    });

    const endPointer = (pointer: Phaser.Input.Pointer): void => {
      if (pointer.id === this.dragPointerId) {
        this.stopPan();
      }
      const down = scene.input.manager.pointers.filter((p) => isPrimaryDown(p));
      if (down.length < 2) {
        this.pinchStartDist = 0;
      }
    };

    scene.input.on('pointerup', endPointer);
    scene.input.on('pointerupoutside', endPointer);
    // Extra safety: if Phaser loses the button state mid-drag.
    scene.events.on(Phaser.Scenes.Events.UPDATE, () => {
      if (this.dragPointerId === null) return;
      const p = scene.input.manager.pointers.find((ptr) => ptr.id === this.dragPointerId);
      if (!p || !isPrimaryDown(p)) {
        this.stopPan();
      }
    });
  }

  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX - this.panX) / this.zoom,
      y: (screenY - this.panY) / this.zoom,
    };
  }

  get scale(): number {
    return this.zoom;
  }

  /** True if the last gesture was a pan/pinch (not a tap). */
  allowGridTap(): boolean {
    const ok = !this.panConsumedClick && !this.dragging;
    this.panConsumedClick = false;
    return ok;
  }

  private stopPan(): void {
    this.dragPointerId = null;
    this.dragging = false;
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
      this.stopPan();
    } else {
      this.clampPan();
    }
    this.applyTransform();
  }

  private clampPan(): void {
    const maxPanX = GAME_WIDTH * 0.45 * (this.zoom - 1);
    const maxPanY = GAME_HEIGHT * 0.45 * (this.zoom - 1);
    this.panX = Phaser.Math.Clamp(this.panX, -maxPanX, maxPanX);
    this.panY = Phaser.Math.Clamp(this.panY, -maxPanY, maxPanY);
  }

  private applyTransform(): void {
    this.worldRoot.setScale(this.zoom);
    this.worldRoot.setPosition(this.panX, this.panY);
  }
}
