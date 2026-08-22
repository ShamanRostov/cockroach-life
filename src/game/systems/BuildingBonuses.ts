import type { PlacedRoom } from '../types';
import type { RoomType } from './BuildingSystem';
import {
  ARCADE_HOSPITAL,
  BASE_FOOD_CAP,
  BASE_MONEY_CAP,
  HOSPITAL_ARCADE_COMPLETION_PER_LEVEL,
  HOSPITAL_ARCADE_HEAL_PER_LEVEL,
  HOSPITAL_ARCADE_HIT_REDUCTION_PER_LEVEL,
  HOSPITAL_ARCADE_MIN_HITS,
  HOSPITAL_HEAL_PER_LEVEL,
  STORAGE_FOOD_CAP_PER_LEVEL,
  STORAGE_MONEY_CAP_PER_LEVEL,
} from './GameBalance';

export function sumRoomLevels(rooms: PlacedRoom[], type: RoomType): number {
  return rooms.filter((r) => r.type === type).reduce((sum, r) => sum + r.level, 0);
}

export function getFoodStorageCap(rooms: PlacedRoom[]): number {
  const storageLevels = sumRoomLevels(rooms, 'storage');
  return BASE_FOOD_CAP + storageLevels * STORAGE_FOOD_CAP_PER_LEVEL;
}

export function getMoneyStorageCap(rooms: PlacedRoom[]): number {
  const storageLevels = sumRoomLevels(rooms, 'storage');
  return BASE_MONEY_CAP + storageLevels * STORAGE_MONEY_CAP_PER_LEVEL;
}

export function getHospitalNestHealPerSec(rooms: PlacedRoom[]): number {
  return sumRoomLevels(rooms, 'hospital') * HOSPITAL_HEAL_PER_LEVEL;
}

export interface HospitalArcadeBonuses {
  requiredHits: number;
  healPerHit: number;
  completionHeal: number;
}

export function getHospitalArcadeBonuses(rooms: PlacedRoom[]): HospitalArcadeBonuses {
  const hospitalLevels = sumRoomLevels(rooms, 'hospital');
  const hitReduction = hospitalLevels * HOSPITAL_ARCADE_HIT_REDUCTION_PER_LEVEL;
  return {
    requiredHits: Math.max(
      HOSPITAL_ARCADE_MIN_HITS,
      ARCADE_HOSPITAL.requiredHits - hitReduction,
    ),
    healPerHit: ARCADE_HOSPITAL.healPerHit + hospitalLevels * HOSPITAL_ARCADE_HEAL_PER_LEVEL,
    completionHeal:
      ARCADE_HOSPITAL.completionHeal + hospitalLevels * HOSPITAL_ARCADE_COMPLETION_PER_LEVEL,
  };
}
