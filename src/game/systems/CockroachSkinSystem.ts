import type { CockroachSkinId } from './SeasonPassSystem';
import { COCKROACH_SKIN_TINTS } from './SeasonPassSystem';

const ALL_SKINS: CockroachSkinId[] = ['default', 'golden', 'neon', 'zombie', 'chef'];
const PURCHASABLE_SKINS: CockroachSkinId[] = ['golden', 'neon', 'zombie', 'chef'];

export class CockroachSkinSystem {
  private unlocked: Set<CockroachSkinId> = new Set(['default']);
  private equipped: CockroachSkinId = 'default';

  load(unlocked: CockroachSkinId[] | undefined, equipped: CockroachSkinId | undefined): void {
    this.unlocked = new Set(['default']);
    for (const id of unlocked ?? []) {
      if (ALL_SKINS.includes(id)) this.unlocked.add(id);
    }
    if (equipped && this.unlocked.has(equipped)) {
      this.equipped = equipped;
    } else {
      this.equipped = 'default';
    }
  }

  exportUnlocked(): CockroachSkinId[] {
    return [...this.unlocked];
  }

  getEquipped(): CockroachSkinId {
    return this.equipped;
  }

  isUnlocked(skinId: CockroachSkinId): boolean {
    return this.unlocked.has(skinId);
  }

  unlock(skinId: CockroachSkinId): void {
    if (ALL_SKINS.includes(skinId)) {
      this.unlocked.add(skinId);
    }
  }

  unlockAllPurchasable(): void {
    for (const id of PURCHASABLE_SKINS) {
      this.unlocked.add(id);
    }
  }

  equip(skinId: CockroachSkinId): boolean {
    if (!this.unlocked.has(skinId)) return false;
    this.equipped = skinId;
    return true;
  }

  getTint(): number | null {
    return COCKROACH_SKIN_TINTS[this.equipped];
  }

  getAllSkins(): CockroachSkinId[] {
    return [...ALL_SKINS];
  }
}
