import type { PlatformId } from './types';

export type Environment = 'dev' | 'staging' | 'production';

export interface PlatformFeatureFlags {
  enableAds: boolean;
  enableIAP: boolean;
  enableAnalytics: boolean;
  enableCloudSave: boolean;
}

export interface PlatformConfigSnapshot {
  environment: Environment;
  platform: PlatformId;
  features: PlatformFeatureFlags;
  basePath: string;
  isIframe: boolean;
  isYandexBuild: boolean;
}

function detectEnvironment(): Environment {
  const explicit = import.meta.env.VITE_ENV as string | undefined;
  if (explicit === 'dev' || explicit === 'staging' || explicit === 'production') {
    return explicit;
  }
  if (import.meta.env.DEV) return 'dev';
  if (import.meta.env.MODE === 'staging') return 'staging';
  return 'production';
}

function detectPlatformFromEnv(): PlatformId | null {
  const forced = import.meta.env.VITE_PLATFORM as string | undefined;
  if (forced === 'yandex' || forced === 'web' || forced === 'steam' || forced === 'operator') {
    return forced;
  }
  return null;
}

function isInIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function featureFlagsFor(platform: PlatformId, environment: Environment): PlatformFeatureFlags {
  switch (platform) {
    case 'yandex':
      return {
        enableAds: true,
        enableIAP: true,
        enableAnalytics: environment !== 'dev',
        enableCloudSave: true,
      };
    case 'steam':
      return {
        enableAds: false,
        enableIAP: true,
        enableAnalytics: environment !== 'dev',
        enableCloudSave: true,
      };
    case 'operator':
      return {
        enableAds: true,
        enableIAP: true,
        enableAnalytics: environment !== 'dev',
        enableCloudSave: true,
      };
    default:
      return {
        enableAds: environment === 'dev',
        enableIAP: environment === 'dev',
        enableAnalytics: true,
        enableCloudSave: environment !== 'production',
      };
  }
}

function resolvePlatform(platform: PlatformId): PlatformConfigSnapshot {
  const environment = detectEnvironment();
  return {
    environment,
    platform,
    features: featureFlagsFor(platform, environment),
    basePath: import.meta.env.BASE_URL ?? './',
    isIframe: isInIframe(),
    isYandexBuild: import.meta.env.VITE_LOAD_YANDEX_SDK === 'true',
  };
}

class PlatformConfigImpl {
  private snapshot: PlatformConfigSnapshot | null = null;

  /** Call once platform id is known (from PlatformManager). */
  configure(platform: PlatformId): PlatformConfigSnapshot {
    this.snapshot = resolvePlatform(platform);
    if (this.snapshot.isIframe) {
      console.info('[PlatformConfig] Running inside iframe — no top-frame navigation');
    }
    console.info('[PlatformConfig]', this.snapshot);
    return this.snapshot;
  }

  get(): PlatformConfigSnapshot {
    if (!this.snapshot) {
      const envPlatform = detectPlatformFromEnv() ?? 'web';
      return resolvePlatform(envPlatform);
    }
    return this.snapshot;
  }

  get features(): PlatformFeatureFlags {
    return this.get().features;
  }

  get environment(): Environment {
    return this.get().environment;
  }

  isFeatureEnabled(feature: keyof PlatformFeatureFlags): boolean {
    return this.get().features[feature];
  }
}

export const platformConfig = new PlatformConfigImpl();
