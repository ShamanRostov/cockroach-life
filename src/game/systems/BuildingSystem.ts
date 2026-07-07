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

export type BuildErrorKey = 'outOfBounds' | 'locked' | 'occupied';

export interface RoomDefinition {
  type: RoomType;
  moneyCost: number;
  foodCost: number;
  color: number;
  roofColor: number;
  maxLevel: number;
  upgradeMoneyCost: number;
}

export const ROOM_DEFINITIONS: Record<RoomType, RoomDefinition> = {
  kitchen: {
    type: 'kitchen',
    moneyCost: 30,
    foodCost: 10,
    color: 0xd4a574,
    roofColor: 0xc62828,
    maxLevel: 5,
    upgradeMoneyCost: 20,
  },
  bedroom: {
    type: 'bedroom',
    moneyCost: 25,
    foodCost: 5,
    color: 0xb39ddb,
    roofColor: 0x5e35b1,
    maxLevel: 5,
    upgradeMoneyCost: 15,
  },
  storage: {
    type: 'storage',
    moneyCost: 40,
    foodCost: 0,
    color: 0xa1887f,
    roofColor: 0x6d4c41,
    maxLevel: 5,
    upgradeMoneyCost: 25,
  },
  nursery: {
    type: 'nursery',
    moneyCost: 60,
    foodCost: 20,
    color: 0x81c784,
    roofColor: 0x2e7d32,
    maxLevel: 3,
    upgradeMoneyCost: 40,
  },
  hospital: {
    type: 'hospital',
    moneyCost: 50,
    foodCost: 10,
    color: 0x90caf9,
    roofColor: 0x1565c0,
    maxLevel: 3,
    upgradeMoneyCost: 30,
  },
  planter: {
    type: 'planter',
    moneyCost: 28,
    foodCost: 8,
    color: 0x81c784,
    roofColor: 0x388e3c,
    maxLevel: 5,
    upgradeMoneyCost: 18,
  },
  shelter: {
    type: 'shelter',
    moneyCost: 22,
    foodCost: 5,
    color: 0xa5d6a7,
    roofColor: 0x558b2f,
    maxLevel: 5,
    upgradeMoneyCost: 16,
  },
  locker: {
    type: 'locker',
    moneyCost: 38,
    foodCost: 0,
    color: 0x90a4ae,
    roofColor: 0x455a64,
    maxLevel: 5,
    upgradeMoneyCost: 24,
  },
  niche: {
    type: 'niche',
    moneyCost: 24,
    foodCost: 5,
    color: 0xb0bec5,
    roofColor: 0x37474f,
    maxLevel: 5,
    upgradeMoneyCost: 15,
  },
};

export class BuildingSystem {
  private rooms: PlacedRoom[] = [];
  private unlockedRooms: RoomType[] = ['kitchen', 'bedroom'];
  private regionMode: 'apartment' | 'balcony' | 'stairwell' = 'apartment';
  readonly gridWidth = 12;
  readonly gridHeight = 9;

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
