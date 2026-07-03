import Phaser from 'phaser';
import { AnalyticsService } from '../../platforms/AnalyticsService';

/** Wire global scene-start and session lifecycle analytics hooks. */
export function bindAnalytics(game: Phaser.Game): void {
  const analytics = AnalyticsService.getInstance();
  analytics.bindSessionLifecycle();

  game.events.on(Phaser.Scenes.Events.START, (_scene: Phaser.Scene, sys: Phaser.Scenes.Systems) => {
    analytics.trackSceneEnter(sys.settings.key);
  });
}
