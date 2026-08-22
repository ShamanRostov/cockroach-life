import type { TrapType } from '../types';
import {
  COUNTER_RAID_ATTACK_BASE,
  COUNTER_RAID_ATTACK_PER_BUILDING,
  COUNTER_RAID_ATTACK_VARIANCE,
  COUNTER_RAID_FOOD_LOSS_BASE,
  COUNTER_RAID_MONEY_LOSS_BASE,
  FIGHTER_COUNTER_DEFENSE_BONUS,
  TRAP_DEFENSE_POWER,
} from './GameBalance';

export interface CounterRaidResult {
  blocked: boolean;
  foodLost: number;
  moneyLost: number;
  defense: number;
  attack: number;
}

export function calcTrapDefensePower(traps: TrapType[], fighterBonus = 0): number {
  const trapPower = traps.reduce((sum, trap) => sum + TRAP_DEFENSE_POWER[trap], 0);
  return trapPower + fighterBonus * FIGHTER_COUNTER_DEFENSE_BONUS;
}

export function calcCounterRaidAttack(totalBuildings: number, variance = 0): number {
  return (
    COUNTER_RAID_ATTACK_BASE +
    totalBuildings * COUNTER_RAID_ATTACK_PER_BUILDING +
    variance
  );
}

/** Roll a rival bot sniffing your nest — traps and fighters can block the theft. */
export function resolveCounterRaid(
  traps: TrapType[],
  totalBuildings: number,
  fighterBonus = 0,
  variance = COUNTER_RAID_ATTACK_VARIANCE,
): CounterRaidResult {
  const defense = calcTrapDefensePower(traps, fighterBonus);
  const attack = calcCounterRaidAttack(
    totalBuildings,
    Math.floor(Math.random() * (variance * 2 + 1)) - variance,
  );

  if (defense >= attack) {
    return { blocked: true, foodLost: 0, moneyLost: 0, defense, attack };
  }

  const severity = (attack - defense) / attack;
  const scale = 1 + totalBuildings / 10;
  return {
    blocked: false,
    foodLost: Math.max(1, Math.floor(COUNTER_RAID_FOOD_LOSS_BASE * severity * scale)),
    moneyLost: Math.max(1, Math.floor(COUNTER_RAID_MONEY_LOSS_BASE * severity * scale)),
    defense,
    attack,
  };
}
