import type { PlacedRoom } from '../types';

export type RoomType =
  | 'kitchen'
  | 'bedroom'
  | 'storage'
  | 'nursery'
  | 'hospital'
  | 'planter'
  | 'shelter'
  | 'locker'
  | 'niche';

export type BuildErrorKey = 'outOfBounds' | 'locked' | 'occupied' | 'limitReached';

export interface RoomDefinition {
  type: RoomType;
  moneyCost: number;
  foodCost: number;
  color: number;
  roofColor: number;
  maxLevel: number;
  upgradeMoneyCost: number;
}

/**
 * Max copies per nest region.
 * Unique facilities (1): upgrade instead of spam — pantry, nursery, hospital, stairwell locker.
 * Stackable: kitchens/bedrooms and outdoor dens for colony expansion.
 */
export const ROOM_MAX_INSTANCES: Record<RoomType, number> = {
  kitchen: Number.POSITIVE_INFINITY,
  bedroom: Number.POSITIVE_INFINITY,
  storage: 1,
  nursery: 1,
  hospital: 1,
  planter: Number.POSITIVE_INFINITY,
  shelter: Number.POSITIVE_INFINITY,
  locker: 1,
  niche: Number.POSITIVE_INFINITY,
};

export function isUniqueRoom(type: RoomType): boolean {
  return ROOM_MAX_INSTANCES[type] === 1;
}

export const ROOM_DEFINITIONS: Record<RoomType, RoomDefinition> = {
  kitchen: {
    type: 'kitchen',
    moneyCost: 20,
    foodCost: 5,
    color: 0xd4a574,
    roofColor: 0xc62828,
    maxLevel: 5,
    upgradeMoneyCost: 15,
  },
  bedroom: {
    type: 'bedroom',
    moneyCost: 18,
    foodCost: 3,
    color: 0xb39ddb,
    roofColor: 0x5e35b1,
    maxLevel: 5,
    upgradeMoneyCost: 12,
  },
  storage: {
    type: 'storage',
    moneyCost: 35,
    foodCost: 0,
    color: 0xa1887f,
    roofColor: 0x6d4c41,
    maxLevel: 5,
    upgradeMoneyCost: 22,
  },
  nursery: {
    type: 'nursery',
    moneyCost: 50,
    foodCost: 15,
    color: 0x81c784,
    roofColor: 0x2e7d32,
    maxLevel: 3,
    upgradeMoneyCost: 35,
  },
  hospital: {
    type: 'hospital',
    moneyCost: 40,
    foodCost: 8,
    color: 0x90caf9,
    roofColor: 0x1565c0,
    maxLevel: 3,
    upgradeMoneyCost: 25,
  },
  planter: {
    type: 'planter',
    moneyCost: 24,
    foodCost: 6,
    color: 0x81c784,
    roofColor: 0x388e3c,
    maxLevel: 5,
    upgradeMoneyCost: 16,
  },
  shelter: {
    type: 'shelter',
    moneyCost: 18,
    foodCost: 4,
    color: 0xa5d6a7,
    roofColor: 0x558b2f,
    maxLevel: 5,
    upgradeMoneyCost: 14,
  },
  locker: {
    type: 'locker',
    moneyCost: 32,
    foodCost: 0,
    color: 0x90a4ae,
    roofColor: 0x455a64,
    maxLevel: 5,
    upgradeMoneyCost: 20,
  },
  niche: {
    type: 'niche',
    moneyCost: 20,
    foodCost: 4,
    color: 0xb0bec5,
    roofColor: 0x37474f,
    maxLevel: 5,
    upgradeMoneyCost: 12,
  },
};

/** Base money/food spent to reach this room's current level (ignores live-ops discounts). */
export function getRoomInvestedCost(room: PlacedRoom): { money: number; food: number } {
  const def = ROOM_DEFINITIONS[room.type];
  return {
    money: def.moneyCost + Math.max(0, room.level - 1) * def.upgradeMoneyCost,
    food: def.foodCost,
  };
}

/** Demolish refund: half of invested cost (floored). */
export function getDemolishRefund(room: PlacedRoom): { money: number; food: number } {
  const invested = getRoomInvestedCost(room);
  return {
    money: Math.floor(invested.money / 2),
    food: Math.floor(invested.food / 2),
  };
}

export class BuildingSystem {
  private rooms: PlacedRoom[] = [];
  private unlockedRooms: RoomType[] = ['kitchen', 'bedroom'];
  private regionMode: 'apartment' | 'balcony' | 'stairwell' = 'apartment';
  readonly gridWidth = 10;
  readonly gridHeight = 8;

  load(rooms: PlacedRoom[], unlocked: RoomType[], regionMode: 'apartment' | 'balcony' | 'stairwell' = 'apartment'): void {
    this.rooms = rooms.map((r) => ({ ...r }));
    this.unlockedRooms = [...unlocked];
    this.regionMode = regionMode;
  }

  getRooms(): PlacedRoom[] {
    return this.rooms.map((r) => ({ ...r }));
  }

  getUnlockedRooms(): RoomType[] {
    return [...this.unlockedRooms];
  }

  getRoomAt(gridX: number, gridY: number): PlacedRoom | undefined {
    return this.rooms.find((r) => r.gridX === gridX && r.gridY === gridY);
  }

  countOfType(type: RoomType): number {
    return this.rooms.filter((r) => r.type === type).length;
  }

  canBuild(type: RoomType, gridX: number, gridY: number): BuildErrorKey | null {
    if (gridX < 0 || gridY < 0 || gridX >= this.gridWidth || gridY >= this.gridHeight) {
      return 'outOfBounds';
    }
    if (!this.unlockedRooms.includes(type)) {
      return 'locked';
    }
    if (this.getRoomAt(gridX, gridY)) {
      return 'occupied';
    }
    if (this.countOfType(type) >= ROOM_MAX_INSTANCES[type]) {
      return 'limitReached';
    }
    return null;
  }

  build(type: RoomType, gridX: number, gridY: number): PlacedRoom | null {
    const err = this.canBuild(type, gridX, gridY);
    if (err) return null;
    const room: PlacedRoom = { type, gridX, gridY, level: 1 };
    this.rooms.push(room);
    this.checkUnlocks();
    return room;
  }

  upgrade(gridX: number, gridY: number): boolean {
    const room = this.getRoomAt(gridX, gridY);
    if (!room) return false;
    const def = ROOM_DEFINITIONS[room.type];
    if (room.level >= def.maxLevel) return false;
    room.level += 1;
    return true;
  }

  /** Remove a placed room; returns the removed copy or null. */
  remove(gridX: number, gridY: number): PlacedRoom | null {
    const idx = this.rooms.findIndex((r) => r.gridX === gridX && r.gridY === gridY);
    if (idx < 0) return null;
    const [removed] = this.rooms.splice(idx, 1);
    return { ...removed };
  }

  private checkUnlocks(): void {
    const count = this.rooms.length;
    if (this.regionMode === 'apartment') {
      if (count >= 2 && !this.unlockedRooms.includes('storage')) {
        this.unlockedRooms.push('storage');
      }
      if (count >= 4 && !this.unlockedRooms.includes('nursery')) {
        this.unlockedRooms.push('nursery');
      }
      if (count >= 3 && !this.unlockedRooms.includes('hospital')) {
        this.unlockedRooms.push('hospital');
      }
    }
  }
}
