# Cockroach Life — Pre-Publish Checklist

Use this checklist before submitting **v0.3.0** to any platform.  
Complete items in order; do not skip build verification.

---

## 0. Global (all platforms)

- [ ] `package.json` version is **0.3.0**
- [ ] `npm run build` passes with zero errors
- [ ] `npm run build:yandex` passes with zero errors
- [ ] Manual smoke test per [QA_CHECKLIST.md](./QA_CHECKLIST.md) (desktop + mobile 375px)
- [ ] CHANGELOG.md updated for release
- [ ] No debug `console.log` spam in production paths
- [ ] RU and EN strings reviewed for new v0.3.0 features (season pass, stairwell, skins)

---

## 1. Store assets

- [ ] `store-assets/icons/icon-512.png` exported from SVG (512×512)
- [ ] `public/icon-512.png` copied (web favicon / OG image)
- [ ] `store-assets/banners/cover-800x470.png` exported from SVG
- [ ] Six screenshots captured per [store-assets/screenshots/SCREENSHOTS.md](../store-assets/screenshots/SCREENSHOTS.md)
- [ ] Screenshot filenames match `yandex-games.config.json` and `copy.json`
- [ ] `store-assets/promo/copy.json` whatsNew and IAP list match code
- [ ] Platform descriptions updated if major copy change (`store-assets/descriptions/`)

---

## 2. Web (standalone)

### Build

```bash
npm run build
```

### Deploy checklist

- [ ] Upload entire `dist/` folder to static host (HTTPS)
- [ ] `index.html` loads; game reaches Menu scene
- [ ] Favicon `/icon-512.png` visible in browser tab
- [ ] Open Graph preview tested (paste URL in Telegram / Discord / Facebook debugger)
- [ ] Mobile viewport and touch controls work
- [ ] Cache headers set for hashed `assets/*.js` files

### Subfolder hosting (if applicable)

```bash
# PowerShell
$env:VITE_BASE_PATH="/games/cockroach/"; npm run build
```

- [ ] Re-test all asset paths after subfolder build

---

## 3. Yandex Games

### Config sync

- [ ] [yandex-games.config.json](../yandex-games.config.json) copied into Console fields
- [ ] Leaderboards created: `slipper_highscore`, `raid_rating`, `colony_size`
- [ ] IAP catalog (8 products):

| ID | Consumable |
|----|------------|
| `food_pack_small` | yes |
| `food_pack_large` | yes |
| `money_pack` | yes |
| `shield_24h` | yes |
| `energy_refill` | yes |
| `remove_ads` | no |
| `season_pass_premium` | no |
| `skin_pack` | no |

- [ ] **whats_new** v0.3.0 text pasted (RU + EN)
- [ ] Age rating **6+** with justification text
- [ ] Categories: simulator, arcade, casual

### Build & upload

```bash
npm run build:yandex
```

- [ ] Zip **contents** of `dist/` (not the folder itself)
- [ ] Upload zip in [Yandex Games Console](https://games.yandex.ru/console)
- [ ] Icon 512×512, cover 800×470, 6 screenshots uploaded
- [ ] RU + EN descriptions from `store-assets/descriptions/yandex-*.md`
- [ ] Test in Yandex iframe: SDK loads, `LoadingAPI.ready()` fires
- [ ] Interstitial + rewarded ads show in moderation build
- [ ] IAP test purchases for consumables and non-consumables
- [ ] Cloud save round-trip tested
- [ ] Submit for **moderation**; track review status

---

## 4. Steam

### Prerequisites

- [ ] Steamworks partner account and approved app
- [ ] Real App ID in `steam/steam_appid.txt`
- [ ] `SteamPlatform` wired to Steamworks SDK (currently stub)

### Build

```bash
npm run electron:build
```

- [ ] Artifacts in `electron/out/` tested on Windows
- [ ] Store page copy from `store-assets/descriptions/steam-en.md` (+ RU)
- [ ] Capsule art 800×450 (from cover palette)
- [ ] 5–10 screenshots 1280×720
- [ ] Depots configured; upload via SteamPipe
- [ ] Steam Cloud save format matches `SaveSystem` JSON
- [ ] Achievements / leaderboards configured in partner portal (if shipping)

---

## 5. Operator portals (Beeline / Megafon)

See [OPERATOR_PORTALS.md](./OPERATOR_PORTALS.md).

### Build

```bash
# Example
$env:VITE_PLATFORM="operator"
$env:VITE_OPERATOR_BEELINE_URL="https://portal.example/api"
$env:VITE_OPERATOR_BEELINE_API_KEY="secret"
npm run build
```

### Per portal

- [ ] Portal iframe loads without console errors
- [ ] `game:loaded` and `game:ready` postMessage received by portal QA
- [ ] Operator ad network connected (interstitial + rewarded)
- [ ] Billing mapped to same 8 IAP product IDs
- [ ] Cloud save restore on second session / device
- [ ] MSISDN / user id passed via query or handshake
- [ ] No `window.top` redirects or external popups
- [ ] Test URLs:
  - `?platform=operator&portal=beeline`
  - `?platform=operator&portal=megafon`

---

## 6. Google Play (optional / future)

- [ ] TWA or WebView wrapper around `dist/`
- [ ] Listing from `store-assets/descriptions/google-play.md`
- [ ] Feature graphic 1024×500 from cover art
- [ ] Play Console content rating questionnaire (IAP + ads declared)
- [ ] Back button and notch safe area on target devices

---

## 7. Post-publish monitoring

- [ ] Analytics dashboard: DAU, session length, retention D1
- [ ] IAP conversion and ad fill rate (Yandex partner stats)
- [ ] Leaderboard submissions appearing in Console
- [ ] User reports / reviews triaged within 48h
- [ ] Hotfix branch ready if moderation rejects build

---

## Quick command reference

| Platform | Command | Output |
|----------|---------|--------|
| Web | `npm run build` | `dist/` |
| Yandex | `npm run build:yandex` | `dist/` (SDK enabled) |
| Staging | `npm run build:staging` | `dist/` |
| Steam desktop | `npm run electron:build` | `electron/out/` |

---

## Sign-off

| Role | Name | Date | OK |
|------|------|------|-----|
| Dev / build | | | ☐ |
| QA | | | ☐ |
| Owner | | | ☐ |

**Release version:** 0.3.0  
**Target date:** _______________
