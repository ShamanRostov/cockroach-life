import type { PlatformAdapter, ShareResult } from './types';

export type OperatorId = 'beeline' | 'megafon' | 'generic';

export interface OperatorPortalConfig {
  operatorId: OperatorId;
  portalBaseUrl: string;
  apiKey: string;
  enableAds: boolean;
  enableIAP: boolean;
  enableCloudSave: boolean;
}

const OPERATOR_ENV_PREFIX = 'VITE_OPERATOR_';

function readOperatorFromQuery(): OperatorId {
  const params = new URLSearchParams(window.location.search);
  const portal = (params.get('portal') ?? params.get('operator') ?? '').toLowerCase();

  if (portal.includes('beeline') || portal === 'bl') return 'beeline';
  if (portal.includes('megafon') || portal === 'mf') return 'megafon';
  return 'generic';
}

function readPortalConfig(operatorId: OperatorId): OperatorPortalConfig {
  const env = import.meta.env as ImportMetaEnv & Record<string, string | undefined>;
  const suffix = operatorId === 'generic' ? 'GENERIC' : operatorId.toUpperCase();

  return {
    operatorId,
    portalBaseUrl: (env[`${OPERATOR_ENV_PREFIX}${suffix}_URL`] as string | undefined) ?? '',
    apiKey: (env[`${OPERATOR_ENV_PREFIX}${suffix}_API_KEY`] as string | undefined) ?? '',
    enableAds: env[`${OPERATOR_ENV_PREFIX}${suffix}_ADS`] !== 'false',
    enableIAP: env[`${OPERATOR_ENV_PREFIX}${suffix}_IAP`] !== 'false',
    enableCloudSave: env[`${OPERATOR_ENV_PREFIX}${suffix}_CLOUD`] !== 'false',
  };
}

function isInPortalIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/**
 * Operator portal adapter (Beeline / Megafon and similar WAP/game portals).
 * Uses URL params and postMessage hooks — no window.top redirects.
 */
export class OperatorPlatform implements PlatformAdapter {
  readonly operatorId: OperatorId;
  readonly portalConfig: OperatorPortalConfig;
  private portalReady = false;

  constructor() {
    this.operatorId = readOperatorFromQuery();
    this.portalConfig = readPortalConfig(this.operatorId);
  }

  async init(): Promise<void> {
    if (isInPortalIframe()) {
      this.bindPortalMessages();
    }

    console.info(
      `[Platform:Operator] ${this.operatorId} — ads:${this.portalConfig.enableAds} iap:${this.portalConfig.enableIAP}`,
    );

    if (this.portalConfig.portalBaseUrl) {
      console.info('[Platform:Operator] Portal URL configured');
    } else {
      console.info('[Platform:Operator] Stub mode — set VITE_OPERATOR_* env vars for production');
    }

    this.portalReady = true;
  }

  private bindPortalMessages(): void {
    window.addEventListener('message', (event) => {
      if (!event.data || typeof event.data !== 'object') return;
      const type = (event.data as { type?: string }).type;
      if (type === 'portal:ready') {
        this.portalReady = true;
        console.info('[Platform:Operator] Portal handshake received');
      }
    });

    try {
      window.parent.postMessage({ type: 'game:loaded', operator: this.operatorId }, '*');
    } catch {
      // Cross-origin iframe — portal may use alternate handshake.
    }
  }

  gameReady(): void {
    try {
      window.parent.postMessage({ type: 'game:ready', operator: this.operatorId }, '*');
    } catch {
      console.info('[Platform:Operator] Game ready (no parent frame)');
    }
  }

  async showInterstitialAd(): Promise<boolean> {
    if (!this.portalConfig.enableAds) return false;
    return this.requestPortalAd('interstitial');
  }

  async showRewardedAd(rewardType: string): Promise<boolean> {
    if (!this.portalConfig.enableAds) return false;
    return this.requestPortalAd('rewarded', rewardType);
  }

  private async requestPortalAd(kind: 'interstitial' | 'rewarded', rewardType?: string): Promise<boolean> {
    console.info(`[Platform:Operator] ${kind} ad request`, rewardType ?? '');

    if (!this.portalReady) {
      await new Promise((r) => setTimeout(r, 100));
    }

    // Production: replace with operator SDK callback / postMessage round-trip.
    return false;
  }

  async saveToCloud(data: string): Promise<void> {
    if (!this.portalConfig.enableCloudSave) return;

    try {
      window.parent.postMessage(
        { type: 'game:save', operator: this.operatorId, payload: data },
        '*',
      );
    } catch {
      console.info('[Platform:Operator] Cloud save stub', data.length, 'bytes');
    }
  }

  async loadFromCloud(): Promise<string | null> {
    if (!this.portalConfig.enableCloudSave) return null;

    console.info('[Platform:Operator] Cloud load stub — wire portal restore API');
    return null;
  }

  async getPlayerName(): Promise<string> {
    const params = new URLSearchParams(window.location.search);
    return params.get('user') ?? params.get('msisdn') ?? 'Guest';
  }

  async shareGame(text: string): Promise<ShareResult> {
    try {
      await navigator.clipboard.writeText(text);
      return 'clipboard';
    } catch {
      console.info('[Platform:Operator] Share stub:', text);
      return 'none';
    }
  }

  isMobile(): boolean {
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  }

  getOperatorId(): OperatorId {
    return this.operatorId;
  }
}
