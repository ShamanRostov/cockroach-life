import Phaser from 'phaser';

/** Tracks every GameObject created for a modal so hide() destroys all of them. */
export class ModalLayer {
  private readonly objects: Phaser.GameObjects.GameObject[] = [];

  track<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.objects.push(obj);
    return obj;
  }

  destroyAll(): void {
    for (const obj of this.objects) {
      if (obj.active) obj.destroy();
    }
    this.objects.length = 0;
  }

  isEmpty(): boolean {
    return this.objects.length === 0;
  }
}
