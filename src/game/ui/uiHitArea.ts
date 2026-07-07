import Phaser from 'phaser';
import { isMobileDevice } from '../config';

/** Full-size transparent hit rect inside a container — reliable click zone. */
export function setContainerHitArea(
  container: Phaser.GameObjects.Container,
  displayWidth: number,
  displayHeight: number,
  onClick?: () => void,
): Phaser.GameObjects.Rectangle {
  const w = displayWidth;
  const h = displayHeight;
  const scene = container.scene;

  const hitRect = scene.add.rectangle(0, 0, w, h, 0x000000, 0);
  hitRect.setInteractive({ useHandCursor: !isMobileDevice() });

  if (onClick) {
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

  container.add(hitRect);
  container.setSize(w, h);
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
    hitArea: new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
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
