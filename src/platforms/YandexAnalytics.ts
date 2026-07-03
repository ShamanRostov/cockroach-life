import type { AnalyticsEvent } from './AnalyticsService';

declare global {
  interface Window {
    ym?: (counterId: number, method: string, ...args: unknown[]) => void;
  }
}

const YANDEX_COUNTER_ID = 0;

/** Stub adapter — forwards events to Yandex Metrika when the SDK is available. */
export function sendToYandexAnalytics(events: AnalyticsEvent[]): void {
  if (typeof window === 'undefined' || events.length === 0) return;

  const ym = window.ym;
  if (!ym || YANDEX_COUNTER_ID <= 0) {
    if (import.meta.env.DEV) {
      console.info('[YandexAnalytics] SDK unavailable — skipped', events.length, 'events');
    }
    return;
  }

  for (const event of events) {
    try {
      ym(YANDEX_COUNTER_ID, 'reachGoal', event.name, event.params);
    } catch {
      // Platform SDK not ready.
    }
  }
}
