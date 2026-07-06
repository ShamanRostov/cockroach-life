import Phaser from 'phaser';
import { isMobileDevice } from '../config';

/** Interactive hit box on a Container (reliable for nested UI). */
export function setContainerHitArea(
  container: Phaser.GameObjects.Container,
  displayWidth: number,
  displayHeight: number,
  onClick?: () => void,
): void {
  const w = displayWidth;
  const h = displayHeight;
  container.setSize(w, h);
  // Hit area is top-left aligned: Phaser adds displayOrigin before testing.
  container.setInteractive({
    hitArea: new Phaser.Geom.Rectangle(0, 0, w, h),
    hitAreaCallback: Phaser.Geom.Rectangle.Contains,
    useHandCursor: !isMobileDevice(),
  });

  if (onClick) {
    container.removeAllListeners('pointerdown');
    container.on('pointerdown', (
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
