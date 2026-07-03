import { sendToYandexAnalytics } from './YandexAnalytics';
import { platformConfig } from './PlatformConfig';

export interface AnalyticsEvent {
  name: string;
  params?: Record<string, string | number>;
  timestamp: number;
}

const DEV = import.meta.env.DEV;

/** In-memory analytics buffer with safe no-op fallbacks when platform is unavailable. */
export class AnalyticsService {
  private static instance: AnalyticsService | null = null;

  private readonly events: AnalyticsEvent[] = [];
  private lastPersistTrack = 0;

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  trackEvent(name: string, params?: Record<string, string | number>): void {
    if (!platformConfig.isFeatureEnabled('enableAnalytics')) return;

    try {
      const event: AnalyticsEvent = {
        name,
        params: params ? { ...params } : undefined,
        timestamp: Date.now(),
      };
      this.events.push(event);
      if (DEV) {
        console.info('[Analytics]', name, params ?? '');
      }
    } catch {
      // Never crash gameplay for analytics failures.
    }
  }

  /** Send buffered events to platform adapters and return a copy of the queue. */
  flush(): AnalyticsEvent[] {
    const snapshot = [...this.events];
    try {
      sendToYandexAnalytics(snapshot);
    } catch {
      // Platform analytics may be unavailable in standalone mode.
    }
    return snapshot;
  }

  getEvents(): readonly AnalyticsEvent[] {
    return this.events;
  }

  clear(): void {
    this.events.length = 0;
  }

  trackSceneEnter(scene: string): void {
    this.trackEvent('scene_enter', { scene });
  }

  trackArcadeComplete(scene: string, score: number, won: boolean): void {
    this.trackEvent('arcade_complete', { scene, score, won: won ? 1 : 0 });
  }

  trackRaidComplete(success: boolean, foodStolen: number): void {
    this.trackEvent('raid_complete', { success: success ? 1 : 0, foodStolen });
  }

  trackBuildingPlaced(roomType: string): void {
    this.trackEvent('building_placed', { roomType });
  }

  trackBuildingUpgraded(roomType: string, level: number): void {
    this.trackEvent('building_upgraded', { roomType, level });
  }

  trackDailyBonusClaimed(streak: number): void {
    this.trackEvent('daily_bonus_claimed', { streak });
  }

  trackQuestClaimed(questType: string): void {
    this.trackEvent('quest_claimed', { questType });
  }

  trackEventActive(eventId: string): void {
    this.trackEvent('event_active', { eventId });
  }

  trackEventRewardClaimed(eventId: string, rewardType: string): void {
    this.trackEvent('event_reward_claimed', { eventId, rewardType });
  }

  trackAdShown(type: 'interstitial' | 'rewarded'): void {
    this.trackEvent('ad_shown', { type });
  }

  trackAdRewarded(): void {
    this.trackEvent('ad_rewarded');
  }

  trackPurchaseStarted(productId: string): void {
    this.trackEvent('purchase_started', { productId });
  }

  trackPurchaseComplete(productId: string): void {
    this.trackEvent('purchase_complete', { productId });
  }

  trackPurchaseFailed(productId: string, reason: string): void {
    this.trackEvent('purchase_failed', { productId, reason });
  }

  trackResourceEarned(type: string, amount: number): void {
    this.trackEvent('resource_earned', { type, amount });
  }

  /** Called from GameState.persist() — periodically flush buffered events. */
  trackPersistHeartbeat(_playTimeSec: number): void {
    const now = Date.now();
    if (now - this.lastPersistTrack < 120_000) return;
    this.lastPersistTrack = now;
    this.flush();
  }

  bindSessionLifecycle(): void {
    if (typeof window === 'undefined') return;

    const onLeave = (): void => {
      try {
        this.trackEvent('session_end', { reason: 'pagehide' });
        this.flush();
      } catch {
        // ignore
      }
    };

    window.addEventListener('pagehide', onLeave);
    window.addEventListener('beforeunload', onLeave);
  }
}
