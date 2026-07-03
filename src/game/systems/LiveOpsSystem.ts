import { L } from '../../i18n';

export type LiveOpsEventId =
  | 'slipper_week'
  | 'spray_week'
  | 'raid_week'
  | 'build_week'
  | 'food_frenzy';

export type LiveOpsMultiplierType =
  | 'slipper_score'
  | 'spray_reward'
  | 'raid_loot'
  | 'build_cost'
  | 'passive_food';

export interface LiveOpsEvent {
  id: LiveOpsEventId;
  nameKey: LiveOpsEventId;
  descriptionKey: LiveOpsEventId;
  icon: string;
  startDate: Date;
  endDate: Date;
}

const EVENT_CYCLE: LiveOpsEventId[] = [
  'slipper_week',
  'spray_week',
  'raid_week',
  'build_week',
  'food_frenzy',
];

const EVENT_ICONS: Record<LiveOpsEventId, string> = {
  slipper_week: '👟',
  spray_week: '☠️',
  raid_week: '⚔️',
  build_week: '🏗',
  food_frenzy: '🍞',
};

const MULTIPLIER_MAP: Record<LiveOpsEventId, LiveOpsMultiplierType> = {
  slipper_week: 'slipper_score',
  spray_week: 'spray_reward',
  raid_week: 'raid_loot',
  build_week: 'build_cost',
  food_frenzy: 'passive_food',
};

const MULTIPLIER_VALUES: Record<LiveOpsMultiplierType, number> = {
  slipper_score: 2,
  spray_reward: 2,
  raid_loot: 1.5,
  build_cost: 0.7,
  passive_food: 2,
};

function getISOWeekInfo(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

export function getWeekKey(date = new Date()): string {
  const { year, week } = getISOWeekInfo(date);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function getWeekBounds(date: Date): { start: Date; end: Date } {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const start = new Date(d);
  start.setDate(d.getDate() + diff);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  end.setMilliseconds(-1);
  return { start, end };
}

export class LiveOpsSystem {
  liveOpsWeekKey = '';
  eventParticipation: Record<string, boolean> = {};

  load(data: { liveOpsWeekKey?: string; eventParticipation?: Record<string, boolean> }): void {
    this.liveOpsWeekKey = data.liveOpsWeekKey ?? '';
    this.eventParticipation = { ...(data.eventParticipation ?? {}) };
    this.checkWeekReset();
  }

  checkWeekReset(): void {
    const current = getWeekKey();
    if (this.liveOpsWeekKey !== current) {
      this.liveOpsWeekKey = current;
      this.eventParticipation = {};
    }
  }

  getCurrentEvent(date = new Date()): LiveOpsEvent {
    const { week } = getISOWeekInfo(date);
    const index = ((week - 1) % EVENT_CYCLE.length + EVENT_CYCLE.length) % EVENT_CYCLE.length;
    const id = EVENT_CYCLE[index];
    const { start, end } = getWeekBounds(date);

    return {
      id,
      nameKey: id,
      descriptionKey: id,
      icon: EVENT_ICONS[id],
      startDate: start,
      endDate: end,
    };
  }

  getEventMultiplier(type: LiveOpsMultiplierType, date = new Date()): number {
    const event = this.getCurrentEvent(date);
    if (MULTIPLIER_MAP[event.id] !== type) return 1;
    return MULTIPLIER_VALUES[type];
  }

  getEventName(date = new Date()): string {
    const event = this.getCurrentEvent(date);
    return L().events.items[event.id].name;
  }

  getEventDescription(date = new Date()): string {
    const event = this.getCurrentEvent(date);
    return L().events.items[event.id].description;
  }

  getTimeRemaining(date = new Date()): number {
    const event = this.getCurrentEvent(date);
    return Math.max(0, event.endDate.getTime() - date.getTime());
  }

  formatTimeRemaining(date = new Date()): { days: number; hours: number } {
    const ms = this.getTimeRemaining(date);
    const totalHours = Math.ceil(ms / 3600000);
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    return { days, hours };
  }

  markParticipation(eventId: LiveOpsEventId): void {
    this.checkWeekReset();
    this.eventParticipation[eventId] = true;
  }

  hasParticipated(eventId: LiveOpsEventId): boolean {
    return !!this.eventParticipation[eventId];
  }

  isEventActive(type: LiveOpsMultiplierType, date = new Date()): boolean {
    return this.getEventMultiplier(type, date) !== 1;
  }
}
