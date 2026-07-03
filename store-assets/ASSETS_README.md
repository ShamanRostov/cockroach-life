# Store Assets Guide — Cockroach Life

This folder contains marketing copy, SVG source art, and metadata for all publishing platforms. Game code lives in `src/`; deployment steps in `docs/DEPLOYMENT.md`.

## Folder structure

```
store-assets/
├── ASSETS_README.md          ← this file
├── descriptions/             ← platform-specific markdown copy
│   ├── yandex-ru.md / yandex-en.md
│   ├── steam-en.md / steam-ru.md
│   ├── google-play.md
│   └── operator-beeline.md / operator-megafon.md
├── promo/
│   └── copy.json             ← structured titles, tags, IDs (single source)
├── icons/
│   ├── icon.svg              ← 512×512 master (export PNG)
│   ├── icon-192.svg          ← PWA / small icon
│   └── icon-512.png          ← export from icon.svg (required by stores)
├── banners/
│   ├── cover.svg             ← 800×470 master
│   └── cover-800x470.png     ← export from cover.svg
└── screenshots/
    ├── SCREENSHOTS.md        ← capture brief for 6 shots
    └── 01-…png through 06-…png  ← capture from running game
```

## Export PNG from SVG

Stores require raster icons/covers. Export once after editing SVG:

```bash
# Inkscape (CLI)
inkscape store-assets/icons/icon.svg -w 512 -h 512 -o store-assets/icons/icon-512.png
inkscape store-assets/banners/cover.svg -w 800 -h 470 -o store-assets/banners/cover-800x470.png

# Or open in Figma / browser, export at exact dimensions
```

## Platform matrix

| Platform | Title RU | Title EN | Copy source | Icon | Cover | Screenshots |
|----------|----------|----------|-------------|------|-------|-------------|
| **Yandex Games** | Жизнь таракана | Cockroach Life | `descriptions/yandex-*.md` | 512×512 PNG | 800×470 PNG | 6× 1280×720 |
| **Steam** | Жизнь таракана | Cockroach Life | `descriptions/steam-*.md` | 512×512 (library) | 800×450 header optional | 5–10 min 1280×720 |
| **Google Play** | — | Cockroach Life | `descriptions/google-play.md` | 512×512 | 1024×500 feature graphic | Phone 16:9 |
| **Beeline portal** | Жизнь таракана | — | `descriptions/operator-beeline.md` | Portal spec | Portal spec | 3–6 landscape |
| **Megafon portal** | Жизнь таракана | — | `descriptions/operator-megafon.md` | Portal spec | Portal spec | 3–6 landscape |
| **Web / PWA** | Both | Both | `promo/copy.json` | icon.svg + 192 | cover.svg | Optional |

## Yandex Games Console

1. Copy text from `descriptions/yandex-ru.md` and `yandex-en.md`.
2. Sync technical IDs from `yandex-games.config.json`:
   - Leaderboards: `slipper_highscore`, `raid_rating`, `colony_size`
   - IAP: `food_pack_small`, `food_pack_large`, `money_pack`, `shield_24h`, `energy_refill`, `remove_ads`
3. Upload `icon-512.png`, `cover-800x470.png`, six screenshots.
4. Build: `npm run build:yandex` → zip `dist/` contents.

## Steam Partner

1. Short/long description from `steam-en.md` (+ `steam-ru.md` for Russian store page).
2. Capsule art: export cover at 800×450 or design dedicated capsule from `cover.svg` palette.
3. Build: `npm run electron:build` — see `steam/README.md`.
4. Tags: Casual, Simulation, Strategy, Singleplayer, 2D.

## Google Play (TWA/APK wrapper)

1. Wrap `dist/` in Android WebView or Trusted Web Activity.
2. Use `google-play.md` for listing; feature graphic from `cover.svg` resized to 1024×500.
3. Declare IAP and ads in Play Console questionnaire.
4. Test back button, notch safe area, landscape lock.

## Operator portals (Beeline / Megafon)

1. Brief copy in `operator-*.md`.
2. Set env vars: `VITE_OPERATOR_BEELINE_*` / `VITE_OPERATOR_MEGAFON_*`.
3. Test URL: `?platform=operator&portal=beeline`.
4. Confirm postMessage handshake — `docs/OPERATOR_PORTALS.md`.

## Brand colors (from `src/game/config.ts`)

| Token | Hex | Use |
|-------|-----|-----|
| bgDark | `#1a1208` | Backgrounds, letterboxing |
| bgWarm | `#2d1f0e` | Panels |
| accent | `#ffa726` | CTAs, title highlights |
| accentDark | `#e65100` | Shadows, emphasis |
| floor | `#8b6914` | Kitchen floor in art |
| text | `#fff8e1` | Body text on dark |
| cockroach | `#4a3728` | Character fill |

## Maintenance

- Update `promo/copy.json` first when copy changes; regenerate platform MD if needed.
- Keep `yandex-games.config.json` in sync with `LeaderboardService.ts` and `IAPService.ts`.
- Re-capture screenshots after major UI changes — follow `screenshots/SCREENSHOTS.md`.

## Related docs

- [README.md](../README.md) — project overview
- [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md) — build & publish commands
- [docs/OPERATOR_PORTALS.md](../docs/OPERATOR_PORTALS.md) — operator integration
