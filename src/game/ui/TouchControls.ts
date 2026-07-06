import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, isMobileDevice } from '../config';
import { getSafeAreaInsets } from './MobileUILayout';

export interface TouchDirection {
  x: number;
  y: number;
}

export type TouchControlsLayout = 'joystick' | 'horizontal-zones';

export interface TouchControlsConfig {
  scene: Phaser.Scene;
  layout?: TouchControlsLayout;
  onMove?: (direction: TouchDirection) => void;
  onAction?: () => void;
  showActionButton?: boolean;
  actionLabel?: string;
  depth?: number;
}

export interface TouchVelocity {
  vx: number;
  vy: number;
}

/**
 * Semi-transparent on-screen controls for mobile/touch devices.
 * No-op on desktop — keyboard controls remain unchanged.
 */
export class TouchControls {
  private readonly scene: Phaser.Scene;
  private readonly layout: TouchControlsLayout;
  private readonly onMove?: (direction: TouchDirection) => void;
  private readonly onAction?: () => void;
  private readonly depth: number;

  private container: Phaser.GameObjects.Container | null = null;
  private direction: TouchDirection = { x: 0, y: 0 };
  private leftActive = false;
  private rightActive = false;
  private joystickPointerId: number | null = null;
  private readonly maxRadius = 52;
  private knob: Phaser.GameObjects.Arc | null = null;

  constructor(config: TouchControlsConfig) {
    this.scene = config.scene;
    this.layout = config.layout ?? 'joystick';
    this.onMove = config.onMove;
    this.onAction = config.onAction;
    this.depth = config.depth ?? 800;

    if (!isMobileDevice()) return;

    if (this.layout === 'horizontal-zones') {
      this.createHorizontalZones();
    } else {
      this.createJoystick();
    }

    if (config.showActionButton && config.onAction) {
      this.createActionButton(config.actionLabel ?? '!');
    }

    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  get active(): boolean {
    return isMobileDevice();
  }

  getDirection(): TouchDirection {
    if (!this.active) return { x: 0, y: 0 };
    if (this.layout === 'horizontal-zones') {
      let x = 0;
      if (this.leftActive) x -= 1;
      if (this.rightActive) x += 1;
      return { x, y: 0 };
    }
    return { ...this.direction };
  }

  /** Convert touch input to velocity matching keyboard speed. */
  getVelocity(speed: number, horizontalOnly = false): TouchVelocity {
    const dir = this.getDirection();
    if (dir.x === 0 && dir.y === 0) return { vx: 0, vy: 0 };

    if (this.layout === 'horizontal-zones') {
      return { vx: dir.x * speed, vy: 0 };
    }

    const len = Math.hypot(dir.x, dir.y);
    const nx = len > 0 ? dir.x / len : 0;
    const ny = len > 0 ? dir.y / len : 0;
    return {
      vx: nx * speed,
      vy: horizontalOnly ? 0 : ny * speed,
    };
  }

  /** Merge keyboard velocity with touch input (touch wins when active). */
  mergeVelocity(
    keyboardVx: number,
    keyboardVy: number,
    speed: number,
    horizontalOnly = false,
  ): TouchVelocity {
    const touch = this.getVelocity(speed, horizontalOnly);
    return {
      vx: touch.vx !== 0 ? touch.vx : keyboardVx,
      vy: touch.vy !== 0 ? touch.vy : keyboardVy,
    };
  }

  destroy(): void {
    this.container?.destroy();
    this.container = null;
    this.knob = null;
    this.direction = { x: 0, y: 0 };
    this.leftActive = false;
    this.rightActive = false;
    this.joystickPointerId = null;
  }

  private emitMove(): void {
    this.onMove?.(this.getDirection());
  }

  private createJoystick(): void {
    const safe = getSafeAreaInsets();
    const baseX = 110 + safe.left;
    const baseY = GAME_HEIGHT - 110 - safe.bottom;

    this.container = this.scene.add.container(baseX, baseY).setDepth(this.depth);

    const base = this.scene.add
      .circle(0, 0, this.maxRadius, 0xffffff, 0.12)
      .setStrokeStyle(2, 0xffffff, 0.25);

    this.knob = this.scene.add.circle(0, 0, 28, 0xffffff, 0.28).setStrokeStyle(2, 0xffa726, 0.5);

    this.container.add([base, this.knob]);
    this.container.setSize(this.maxRadius * 2, this.maxRadius * 2);

    const zone = this.scene.add
      .zone(baseX, baseY, 220, 220)
      .setScrollFactor(0)
      .setDepth(this.depth - 1)
      .setInteractive();

    zone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.joystickPointerId !== null) return;
      this.joystickPointerId = pointer.id;
      this.updateJoystick(pointer, baseX, baseY);
    });

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.id !== this.joystickPointerId) return;
      this.updateJoystick(pointer, baseX, baseY);
    });

    const release = (pointer: Phaser.Input.Pointer): void => {
      if (pointer.id !== this.joystickPointerId) return;
      this.joystickPointerId = null;
      this.direction = { x: 0, y: 0 };
      this.knob?.setPosition(0, 0);
      this.emitMove();
    };

    this.scene.input.on('pointerup', release);
    this.scene.input.on('pointerupoutside', release);
  }

  private updateJoystick(pointer: Phaser.Input.Pointer, baseX: number, baseY: number): void {
    const dx = pointer.x - baseX;
    const dy = pointer.y - baseY;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, this.maxRadius);
    const angle = Math.atan2(dy, dx);
    const kx = Math.cos(angle) * clamped;
    const ky = Math.sin(angle) * clamped;

    this.knob?.setPosition(kx, ky);

    if (dist < 8) {
      this.direction = { x: 0, y: 0 };
    } else {
      this.direction = {
        x: kx / this.maxRadius,
        y: ky / this.maxRadius,
      };
    }
    this.emitMove();
  }

  private createHorizontalZones(): void {
    const safe = getSafeAreaInsets();
    const zoneH = 160;
    const zoneY = GAME_HEIGHT - zoneH / 2 - safe.bottom - 20;
    const halfW = (GAME_WIDTH - safe.left - safe.right) / 2;

    const leftZone = this.scene.add
      .rectangle(safe.left + halfW / 2, zoneY, halfW - 20, zoneH, 0xffffff, 0.06)
      .setDepth(this.depth)
      .setInteractive({ useHandCursor: false });

    const rightZone = this.scene.add
      .rectangle(GAME_WIDTH - safe.right - halfW / 2, zoneY, halfW - 20, zoneH, 0xffffff, 0.06)
      .setDepth(this.depth)
      .setInteractive({ useHandCursor: false });

    this.scene.add
      .text(safe.left + halfW / 2, zoneY, '◀', {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '32px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setAlpha(0.35)
      .setDepth(this.depth + 1);

    this.scene.add
      .text(GAME_WIDTH - safe.right - halfW / 2, zoneY, '▶', {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '32px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setAlpha(0.35)
      .setDepth(this.depth + 1);

    leftZone.on('pointerdown', () => {
      this.leftActive = true;
      this.emitMove();
    });
    leftZone.on('pointerup', () => {
      this.leftActive = false;
      this.emitMove();
    });
    leftZone.on('pointerout', () => {
      this.leftActive = false;
      this.emitMove();
    });

    rightZone.on('pointerdown', () => {
      this.rightActive = true;
      this.emitMove();
    });
    rightZone.on('pointerup', () => {
      this.rightActive = false;
      this.emitMove();
    });
    rightZone.on('pointerout', () => {
      this.rightActive = false;
      this.emitMove();
    });
  }

  private createActionButton(label: string): void {
    const safe = getSafeAreaInsets();
    const x = GAME_WIDTH - 90 - safe.right;
    const y = GAME_HEIGHT - 90 - safe.bottom;

    const btn = this.scene.add.container(x, y).setDepth(this.depth + 2);

    const bg = this.scene.add
      .circle(0, 0, 44, 0xffa726, 0.45)
      .setStrokeStyle(3, 0xffffff, 0.5);

    const text = this.scene.add
      .text(0, 0, label, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '16px',
        color: '#fff8e1',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    btn.add([bg, text]);
    btn.setSize(88, 88);
    // Center matches displayOrigin (half of setSize) after Phaser normalizes input coords.
    btn.setInteractive(new Phaser.Geom.Circle(44, 44, 44), Phaser.Geom.Circle.Contains);

    btn.on('pointerdown', () => {
      bg.setFillStyle(0xffa726, 0.7);
      this.onAction?.();
    });
    btn.on('pointerup', () => bg.setFillStyle(0xffa726, 0.45));
    btn.on('pointerout', () => bg.setFillStyle(0xffa726, 0.45));
  }
}
