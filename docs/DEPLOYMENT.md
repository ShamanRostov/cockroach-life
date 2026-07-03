# Deployment Guide — Cockroach Life

Phaser 3 + Vite + TypeScript. Supports web, Yandex Games, Steam/Electron, and operator portals.

## Quick reference

| Platform | Build command | Entry / upload |
|----------|---------------|----------------|
| Web (standalone) | `npm run build` | `dist/` → any static host |
| Web (subfolder) | `VITE_BASE_PATH=/games/cockroach/ npm run build` | Host under subpath |
| Yandex Games | `npm run build:yandex` | Zip `dist/` → Yandex Console |
| Staging | `npm run build:staging` | Internal QA host |
| Steam / Desktop | `npm run electron:build` | See `steam/README.md` |
| Operator portal | `npm run build` + env vars | Portal CDN per operator spec |

## Prerequisites

```bash
npm install
npm run build    # must pass before any deploy
```

Electron is **optional** — only installed when running `electron:dev` / `electron:build`.

---

## 1. Web deployment

### Build

```bash
npm run build
```

Output: `dist/` with relative asset paths (`base: './'`).

### Subfolder hosting

```bash
# PowerShell
$env:VITE_BASE_PATH="/your/subfolder/"; npm run build

# Bash
VITE_BASE_PATH=/your/subfolder/ npm run build
```

### Console / host checklist

- [ ] HTTPS enabled
- [ ] `index.html` + `assets/` uploaded
- [ ] Cache headers for hashed assets (`assets/*.js`)
- [ ] Test mobile viewport and touch controls

### Local preview

```bash
npm run preview
```

---

## 2. Yandex Games

### Metadata

Edit `yandex-games.config.json` — title, description, categories — then copy values into [Yandex Games Console](https://games.yandex.ru/console).

### Build with SDK

```bash
npm run build:yandex
```

This sets `VITE_LOAD_YANDEX_SDK=true` and embeds the SDK loader in `index.html`.

**Alternatives:**

- Dev/test: open with `?platform=yandex` or `?yandex=1`
- Manual entry: rename/copy `public/yandex-index.html` after build (update asset hashes)

### iframe requirements

- SDK loaded from `https://yandex.ru/games/sdk/v2`
- No `window.top` redirects (game is iframe-safe)
- Call `platformManager.gameReady()` after load (via `BootScene`)
- Ads/IAP/cloud save enabled via `PlatformConfig` for `yandex` platform

### Yandex Console checklist

- [ ] Game zip uploaded (`dist/` contents)
- [ ] Icons, screenshots, localized description
- [ ] Leaderboard `raid_rating` configured
- [ ] IAP catalog matches `IAPService` product IDs
- [ ] Moderation: test interstitial + rewarded ads
- [ ] `LoadingAPI.ready()` fires (check SDK logs)

---

## 3. Steam / Electron

### Dev run

```bash
npm run electron:dev
```

Builds web assets, installs Electron in `electron/`, opens desktop window with `?platform=steam`.

### Production desktop build

```bash
npm run electron:build
```

Artifacts in `electron/out/`. See `steam/README.md` for Steamworks App ID and depot setup.

### Steamworks checklist

- [ ] Replace `steam/steam_appid.txt` with real App ID
- [ ] Wire `SteamPlatform` to Steamworks SDK
- [ ] Steam Cloud compatible with `SaveSystem` JSON
- [ ] Achievements / leaderboards configured in partner portal
- [ ] Depot upload via SteamPipe

---

## 4. Operator portals (Beeline / Megafon)

See [OPERATOR_PORTALS.md](./OPERATOR_PORTALS.md) for full integration details.

### Build

```bash
# Example Beeline staging
VITE_PLATFORM=operator \
VITE_OPERATOR_BEELINE_URL=https://portal.example/api \
VITE_OPERATOR_BEELINE_API_KEY=secret \
npm run build
```

### Test locally

```
http://localhost:5173/?platform=operator&portal=beeline
```

### Portal checklist

- [ ] iframe handshake (`game:loaded`, `game:ready`)
- [ ] Operator ad SDK connected
- [ ] Billing / IAP mapped
- [ ] Cloud save via portal API
- [ ] Subscriber identity (`msisdn` / `user` param)

---

## 5. Environment & feature flags

Configured in `src/platforms/PlatformConfig.ts`:

| Flag | Yandex | Web | Steam | Operator |
|------|--------|-----|-------|----------|
| `enableAds` | ✓ | dev only | ✗ | ✓ |
| `enableIAP` | ✓ | dev mock | ✓ | ✓ |
| `enableAnalytics` | ✓ | ✓ | ✓ | ✓ |
| `enableCloudSave` | ✓ | staging+ | ✓ | ✓ |

Environment: `VITE_ENV` = `dev` | `staging` | `production` (via `.env.*` files).

Force platform in dev: `?platform=yandex|web|steam|operator`

---

## 6. Build optimization

`vite.config.ts` includes:

- **manualChunks** — Phaser split into `phaser-*.js`, other deps into `vendor-*.js`
- **base path** — `VITE_BASE_PATH` for CDN/subfolder deploys
- **chunkSizeWarningLimit** — 1600 kB (Phaser is large by design)

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Blank page on subfolder host | Rebuild with correct `VITE_BASE_PATH` |
| YaGames undefined | Use `build:yandex` or `?platform=yandex` |
| Ads not showing | Check `platformConfig.features.enableAds` |
| Electron won't start | Run `npm run build` first; `cd electron && npm install` |
| Operator iframe blocked | Remove any `window.open` / top-frame navigation |
