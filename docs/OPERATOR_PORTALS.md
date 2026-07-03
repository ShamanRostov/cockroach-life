# Operator Portals (Beeline / Megafon)

Integration checklist for Russian mobile operator game portals.

## URL parameters

| Param | Example | Purpose |
|-------|---------|---------|
| `platform` | `operator` | Force operator adapter |
| `portal` / `operator` | `beeline`, `megafon` | Select operator |
| `user` / `msisdn` | `79001234567` | Display name / subscriber id |

**Local test:**

```
http://localhost:5173/?platform=operator&portal=beeline
http://localhost:5173/?platform=operator&portal=megafon&user=Guest
```

## Environment variables

Set per-operator values at build time (`.env.operator` or CI secrets):

| Variable | Description |
|----------|-------------|
| `VITE_OPERATOR_BEELINE_URL` | Portal API base URL |
| `VITE_OPERATOR_BEELINE_API_KEY` | API key / token |
| `VITE_OPERATOR_BEELINE_ADS` | `true` / `false` |
| `VITE_OPERATOR_BEELINE_IAP` | `true` / `false` |
| `VITE_OPERATOR_BEELINE_CLOUD` | `true` / `false` |
| `VITE_OPERATOR_MEGAFON_*` | Same pattern for Megafon |

## iframe / postMessage protocol

The game runs inside the operator portal iframe. **Do not** use `window.top.location` or popups.

| Message | Direction | Purpose |
|---------|-----------|---------|
| `game:loaded` | game → portal | SDK script finished loading |
| `game:ready` | game → portal | `LoadingAPI` equivalent |
| `game:save` | game → portal | Cloud save payload |
| `portal:ready` | portal → game | Handshake complete |

Implement ad callbacks in `OperatorPlatform.requestPortalAd()` using operator SDK or `postMessage` round-trip.

## Pre-submission checklist

- [ ] Portal iframe loads game without console errors
- [ ] `game:loaded` / `game:ready` received by portal QA team
- [ ] Interstitial and rewarded ads wired to operator ad network
- [ ] IAP/billing maps to `IAPService` product IDs
- [ ] Cloud save restore tested on second device / session
- [ ] MSISDN / user id passed via query params or portal handshake
- [ ] Game works on target devices (Android WebView, feature phones if required)
- [ ] No external redirects; share uses clipboard fallback only
- [ ] Analytics events reviewed with operator (see `AnalyticsService`)

## Code references

- `src/platforms/OperatorPlatform.ts` — portal adapter
- `src/platforms/PlatformConfig.ts` — feature flags per platform
- `docs/DEPLOYMENT.md` — full build & deploy guide
