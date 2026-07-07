import Phaser from 'phaser';
import { isMobileDevice } from '../config';

/** Interactive hit box on a Container — full-size transparent rectangle. */
export function setContainerHitArea(
  container: Phaser.GameObjects.Container,
  displayWidth: number,
  displayHeight: number,
  onClick?: () => void,
): Phaser.GameObjects.Rectangle {
  const w = displayWidth;
  const h = displayHeight;
  const hitRect = container.scene.add.rectangle(0, 0, w, h, 0x000000, 0);
  hitRect.setInteractive({ useHandCursor: !isMobileDevice() });
  container.add(hitRect);

  if (onClick) {
    hitRect.removeAllListeners('pointerdown');
    hitRect.on('pointerdown', (
      _p: Phaser.Input.Pointer,
      _lx: number,
      _ly: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      event.stopPropagation();
      onClick();
    });
  }

  return hitRect;
}

/** @deprecated Use setContainerHitArea on a Container instead. */
export function setDisplayHitArea(
  obj: Phaser.GameObjects.Image | Phaser.GameObjects.Container,
  displayWidth: number,
  displayHeight: number,
  onClick?: () => void,
): void {
  if (obj instanceof Phaser.GameObjects.Container) {
    setContainerHitArea(obj, displayWidth, displayHeight, onClick);
    return;
  }
  const w = displayWidth;
  const h = displayHeight;
  obj.setInteractive({
    hitArea: new Phaser.Geom.Rectangle(0, 0, w, h),
    hitAreaCallback: Phaser.Geom.Rectangle.Contains,
    useHandCursor: !isMobileDevice(),
  });
  if (onClick) {
    obj.removeAllListeners('pointerdown');
    obj.on('pointerdown', (
      _p: Phaser.Input.Pointer,
      _lx: number,
      _ly: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      event.stopPropagation();
      onClick();
    });
  }
}
