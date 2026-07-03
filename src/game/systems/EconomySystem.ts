import { PASSIVE_INCOME, NEST_FOOD_DRAIN_RATE, STARVATION_DAMAGE_RATE } from './GameBalance';

export class EconomySystem {
  food = 50;
  money = 100;
  health = 100;
  maxHealth = 100;

  /** Passive food drain per second while in nest. */
  readonly nestFoodDrainRate = NEST_FOOD_DRAIN_RATE;

  load(food: number, money: number, health: number, maxHealth: number): void {
    this.food = food;
    this.money = money;
    this.health = health;
    this.maxHealth = maxHealth;
  }

  canAfford(moneyCost: number, foodCost = 0): boolean {
    return this.money >= moneyCost && this.food >= foodCost;
  }

  spend(moneyCost: number, foodCost = 0): boolean {
    if (!this.canAfford(moneyCost, foodCost)) return false;
    this.money -= moneyCost;
    this.food -= foodCost;
    return true;
  }

  addMoney(amount: number): void {
    this.money += amount;
  }

  addFood(amount: number): void {
    this.food += amount;
  }

  heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  damage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
  }

  tickNest(dt: number): void {
    this.food = Math.max(0, this.food - this.nestFoodDrainRate * dt);
    if (this.food <= 0) {
      this.damage(STARVATION_DAMAGE_RATE * dt);
    }
  }

  /** Income from built rooms per second. */
  getPassiveIncome(rooms: { type: string; level: number }[]): { money: number; food: number } {
    let money = 0;
    let food = 0;
    for (const room of rooms) {
      const rates = PASSIVE_INCOME[room.type as keyof typeof PASSIVE_INCOME];
      if (!rates) continue;
      food += rates.food * room.level;
      money += rates.money * room.level;
    }
    return { money, food };
  }

  applyPassiveIncome(
    rooms: { type: string; level: number }[],
    dt: number,
    multipliers: { food?: number; money?: number } = {},
  ): void {
    const inc = this.getPassiveIncome(rooms);
    const foodMult = multipliers.food ?? 1;
    const moneyMult = multipliers.money ?? 1;
    this.money += inc.money * moneyMult * dt;
    this.food += inc.food * foodMult * dt;
  }
}
