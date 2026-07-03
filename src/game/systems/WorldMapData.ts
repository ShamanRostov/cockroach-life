import type { MapPlayer, TrapType } from '../types';
import type { PlacedRoom } from '../types';

export type MapRegion = 'apartment' | 'balcony' | 'stairwell';

export type ApartmentFurniture =
  | 'fridge'
  | 'stove'
  | 'sink'
  | 'trash'
  | 'table'
  | 'cabinet'
  | 'plinth';

export type BalconyFurniture =
  | 'flowerpot'
  | 'grill'
  | 'birdfeeder'
  | 'watering'
  | 'railing';

export type StairwellFurniture = 'mailbox' | 'mopcloset' | 'elevator' | 'stairs';

export interface MapDistrict {
  id: string;
  region: MapRegion;
  mapX: number;
  mapY: number;
  labelKey: string;
  furniture: ApartmentFurniture | BalconyFurniture | StairwellFurniture;
}

export const APARTMENT_DISTRICTS: MapDistrict[] = [
  { id: 'fridge', region: 'apartment', mapX: 220, mapY: 200, labelKey: 'fridge', furniture: 'fridge' },
  { id: 'stove', region: 'apartment', mapX: 720, mapY: 180, labelKey: 'stove', furniture: 'stove' },
  { id: 'sink', region: 'apartment', mapX: 980, mapY: 320, labelKey: 'sink', furniture: 'sink' },
  { id: 'trash', region: 'apartment', mapX: 1050, mapY: 520, labelKey: 'trash', furniture: 'trash' },
  { id: 'table', region: 'apartment', mapX: 520, mapY: 280, labelKey: 'table', furniture: 'table' },
  { id: 'cabinet', region: 'apartment', mapX: 180, mapY: 420, labelKey: 'cabinet', furniture: 'cabinet' },
  { id: 'plinth', region: 'apartment', mapX: 480, mapY: 520, labelKey: 'plinth', furniture: 'plinth' },
];

export const BALCONY_DISTRICTS: MapDistrict[] = [
  { id: 'flowerpot', region: 'balcony', mapX: 200, mapY: 140, labelKey: 'flowerpot', furniture: 'flowerpot' },
  { id: 'grill', region: 'balcony', mapX: 480, mapY: 110, labelKey: 'grill', furniture: 'grill' },
  { id: 'birdfeeder', region: 'balcony', mapX: 760, mapY: 130, labelKey: 'birdfeeder', furniture: 'birdfeeder' },
  { id: 'watering', region: 'balcony', mapX: 1020, mapY: 150, labelKey: 'watering', furniture: 'watering' },
  { id: 'railing', region: 'balcony', mapX: 620, mapY: 260, labelKey: 'railing', furniture: 'railing' },
];

export const STAIRWELL_DISTRICTS: MapDistrict[] = [
  { id: 'mailbox', region: 'stairwell', mapX: 180, mapY: 220, labelKey: 'mailbox', furniture: 'mailbox' },
  { id: 'mopcloset', region: 'stairwell', mapX: 420, mapY: 180, labelKey: 'mopcloset', furniture: 'mopcloset' },
  { id: 'elevator', region: 'stairwell', mapX: 720, mapY: 240, labelKey: 'elevator', furniture: 'elevator' },
  { id: 'stairs', region: 'stairwell', mapX: 980, mapY: 200, labelKey: 'stairs', furniture: 'stairs' },
];

/** Balcony bot colonies — two rival nests on the balcony map. */
const BALCONY_BOT_IDS = ['flowerpot', 'grill'] as const;

/** Stairwell bot colonies — two rival nests in the stairwell. */
const STAIRWELL_BOT_IDS = ['mailbox', 'elevator'] as const;

export const MAP_DISTRICTS: MapDistrict[] = [
  ...APARTMENT_DISTRICTS,
  ...BALCONY_DISTRICTS,
  ...STAIRWELL_DISTRICTS,
];

export function isBalconyUnlocked(buildingCount: number, raidRating: number): boolean {
  return buildingCount >= 5 || raidRating >= 1200;
}

export function isStairwellUnlocked(
  totalBuildingCount: number,
  raidRating: number,
  balconyBuildingCount: number,
  balconyUnlocked: boolean,
): boolean {
  return (
    totalBuildingCount >= 10 ||
    raidRating >= 1500 ||
    (balconyUnlocked && balconyBuildingCount >= 3)
  );
}

export function getDistrictsForRegion(
  region: MapRegion,
  buildingCount: number,
  raidRating: number,
  balconyBuildingCount = 0,
  balconyUnlocked = false,
): MapDistrict[] {
  if (region === 'balcony' && !isBalconyUnlocked(buildingCount, raidRating)) {
    return [];
  }
  if (
    region === 'stairwell' &&
    !isStairwellUnlocked(buildingCount, raidRating, balconyBuildingCount, balconyUnlocked)
  ) {
    return [];
  }
  if (region === 'apartment') return APARTMENT_DISTRICTS;
  if (region === 'balcony') return BALCONY_DISTRICTS;
  return STAIRWELL_DISTRICTS;
}

export function findDistrict(id: string): MapDistrict | undefined {
  return MAP_DISTRICTS.find((d) => d.id === id);
}

function botRooms(seed: number): PlacedRoom[] {
  const types: PlacedRoom['type'][] = ['kitchen', 'bedroom', 'storage', 'nursery', 'hospital'];
  const count = 2 + (seed % 4);
  const rooms: PlacedRoom[] = [];
  for (let i = 0; i < count; i++) {
    rooms.push({
      type: types[(seed + i) % types.length],
      gridX: i % 4,
      gridY: Math.floor(i / 4),
      level: 1 + ((seed + i * 3) % 3),
    });
  }
  return rooms;
}

function balconyBotRooms(seed: number): PlacedRoom[] {
  const types: PlacedRoom['type'][] = ['planter', 'shelter', 'planter', 'shelter'];
  const count = 2 + (seed % 3);
  const rooms: PlacedRoom[] = [];
  for (let i = 0; i < count; i++) {
    rooms.push({
      type: types[(seed + i) % types.length],
      gridX: i % 4,
      gridY: Math.floor(i / 4),
      level: 1 + ((seed + i * 2) % 2),
    });
  }
  return rooms;
}

function stairwellBotRooms(seed: number): PlacedRoom[] {
  const types: PlacedRoom['type'][] = ['locker', 'niche', 'locker', 'niche'];
  const count = 2 + (seed % 3);
  const rooms: PlacedRoom[] = [];
  for (let i = 0; i < count; i++) {
    rooms.push({
      type: types[(seed + i) % types.length],
      gridX: i % 4,
      gridY: Math.floor(i / 4),
      level: 1 + ((seed + i * 2) % 2),
    });
  }
  return rooms;
}

function botTraps(seed: number): TrapType[] {
  const all: TrapType[] = ['slipper', 'spray', 'glue'];
  return all.slice(0, 1 + (seed % 3));
}

let botPlayers: MapPlayer[] | null = null;

export function initWorldBots(): MapPlayer[] {
  const apartmentBots = APARTMENT_DISTRICTS.filter((d) => d.id !== 'plinth').map((d, i) => {
    const seed = i * 17 + 3;
    return {
      id: `bot_${d.id}`,
      name: d.id,
      isBot: true,
      districtId: d.id,
      mapX: d.mapX,
      mapY: d.mapY,
      food: 40 + seed * 3,
      money: 60 + seed * 5,
      rooms: botRooms(seed),
      traps: botTraps(seed),
      shieldUntil: 0,
      accentColor: [0xff7043, 0xab47bc, 0x42a5f5, 0x66bb6a, 0xffca28, 0xef5350][i % 6],
    };
  });

  const balconyBots = BALCONY_BOT_IDS.map((id, i) => {
    const d = BALCONY_DISTRICTS.find((x) => x.id === id)!;
    const seed = i * 23 + 11;
    return {
      id: `bot_${d.id}`,
      name: d.id,
      isBot: true,
      districtId: d.id,
      mapX: d.mapX,
      mapY: d.mapY,
      food: 55 + seed * 2,
      money: 70 + seed * 4,
      rooms: balconyBotRooms(seed),
      traps: botTraps(seed + 5),
      shieldUntil: 0,
      accentColor: [0x26a69a, 0x7cb342][i % 2],
    };
  });

  const stairwellBots = STAIRWELL_BOT_IDS.map((id, i) => {
    const d = STAIRWELL_DISTRICTS.find((x) => x.id === id)!;
    const seed = i * 29 + 13;
    return {
      id: `bot_${d.id}`,
      name: d.id,
      isBot: true,
      districtId: d.id,
      mapX: d.mapX,
      mapY: d.mapY,
      food: 65 + seed * 2,
      money: 80 + seed * 3,
      rooms: stairwellBotRooms(seed),
      traps: botTraps(seed + 7),
      shieldUntil: 0,
      accentColor: [0x78909c, 0x546e7a][i % 2],
    };
  });

  botPlayers = [...apartmentBots, ...balconyBots, ...stairwellBots];
  return botPlayers;
}

export function getBotPlayers(): MapPlayer[] {
  return botPlayers ?? [];
}

export function getBotsForRegion(region: MapRegion): MapPlayer[] {
  const districts =
    region === 'apartment'
      ? APARTMENT_DISTRICTS
      : region === 'balcony'
        ? BALCONY_DISTRICTS
        : STAIRWELL_DISTRICTS;
  const ids = new Set(districts.map((d) => d.id));
  return getBotPlayers().filter((p) => ids.has(p.districtId));
}

export function updateBotPlayer(updated: MapPlayer): void {
  if (!botPlayers) return;
  const idx = botPlayers.findIndex((p) => p.id === updated.id);
  if (idx >= 0) botPlayers[idx] = updated;
}

export function buildPlayerMapEntry(
  food: number,
  money: number,
  rooms: PlacedRoom[],
  traps: TrapType[],
  shieldUntil: number,
  districtId: string,
): MapPlayer {
  const district = findDistrict(districtId) ?? APARTMENT_DISTRICTS[6]!;
  return {
    id: 'player',
    name: 'player',
    isBot: false,
    districtId: district.id,
    mapX: district.mapX,
    mapY: district.mapY,
    food,
    money,
    rooms: rooms.map((r) => ({ ...r })),
    traps: [...traps],
    shieldUntil,
    accentColor: 0xffa726,
  };
}
