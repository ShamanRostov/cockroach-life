# Changelog

All notable changes to **Cockroach Life** are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).  
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Changed

- **Nest building view** — switched from isometric grid to top-down orthogonal layout; parquet floor, aligned grid clicks, smoother cockroach movement
- **Building sprites** — 45 AI-generated top-down sprites (`building-{type}-1` … `5`); upgrade level picks matching texture instead of scale-only
- **Hospital building** — passive nest healing + stronger/faster infirmary arcade based on hospital levels; +8 max HP per hospital level
- **Storage building** — raises food and money caps (+80 🍞 / +60 💰 per storage level)
- **Counter-raids** — rival bots steal from idle nest; traps + fighters defend (max 4/day, shield blocks)
- **Build panel** — room benefit tags and storage-cap hint when warehouse is full

---

## [0.4.1] — 2026-07-06

### Added

- PNG asset pipeline in `public/assets/` — no procedural sprite generation
- Runtime transparency cleanup for sprites (`textureUtils` at boot)
- Automated verify script with embedded preview server (`scripts/run-verify.mjs`)

### Changed

- All arcade mini-games tuned via `GameBalance.ts` (rewards, speeds, difficulty)
- Nest UI layout refined — panels, HUD rail, and grid repositioned to avoid overlap
- Modal close destroys all tracked objects (`ModalLayer`)
- i18n RU/EN expanded for hospital timing hint and cat-chase boost

### Fixed

- White/checkerboard backgrounds stripped from PNG sprites at load
- UI test coordinates aligned with `NestLayout` (7/7 passing)
- Asset processor writes via temp file (in-place reprocess works on Linux)

---

## [0.3.0] — 2026-07-03

### Added

- **Season Pass** — monthly progression with 15 tiers, free and premium reward tracks; XP from daily quests, raids, arcades, and building
- **Stairwell district** — third world-map region with locker and niche buildings; unlock at 10 total builds, raid rating ≥ 1500, or balcony + 3 builds
- **Cockroach skins** — golden, neon, zombie, chef variants; equip tint in nest and arcades
- **IAP products** — `season_pass_premium` and `skin_pack` (non-consumable)
- **Procedural graphics pipeline** — runtime-generated textures for UI, buildings, arcades, world map, and effects (no external sprite sheets)
- **Cat Chase** arcade mini-game (5th arcade)
- Screenshot capture mode for store assets (`?screenshot=…`)

### Changed

- World map expanded to **16 districts** across apartment, balcony, and stairwell
- Mobile HUD layout refined for season pass and shop buttons at 375px width
- Menu displays version from `package.json`
- Web `index.html`: favicon, Open Graph and Twitter Card meta tags

### Fixed

- Region switcher skips locked balcony/stairwell correctly
- Old saves missing season pass, skins, or stairwell data load with sensible defaults

---

## [0.2.0] — 2026-06

### Added

- **World map** with apartment and balcony regions; **three-phase raids** on rival colonies
- **Breeding system** — worker, scout, and fighter roles with nursery capacity
- **Balcony district** — planter and shelter buildings; unlock at 5 builds or raid rating ≥ 1200
- **Live-ops events** — weekly rotation (slipper, spray, raid, build, food frenzy weeks)
- **Daily bonus** streak and **daily quests** (reset at local midnight)
- **Leaderboards** — slipper high score, raid rating, colony size (Yandex SDK integration)
- **IAP shop** — food packs, money pack, raid shield, energy refill, remove ads
- **Monetization** — interstitial and rewarded ads (Yandex, operator, dev mock on web)
- Platform adapters: **Yandex Games**, **Steam** (Electron stub), **operator portals** (Beeline / Megafon)
- **Mobile UI** — touch controls, joystick, adaptive layout, safe-area padding
- **Tutorial** overlay for new players
- Store assets, deployment docs, Yandex config template

### Changed

- Nest supports trap placement (slipper, spray, glue) for raid defense
- Save system extended for map progress, breeding, quests, and IAP state
- RU / EN localization expanded for all new systems

---

## [0.1.0] — 2026-05

### Added

- Initial release — **Cockroach Life** browser game (Phaser 3 + TypeScript + Vite)
- **Nest meta-game** — isometric junk building: kitchen, bedroom, storage, nursery, hospital
- **Economy** — food, money, health; passive income; upgrade buildings to level 5
- **Arcade mini-games** — Slipper Dodge, Spray Escape, Food Hunt, Hospital timing mini-game
- **Save system** — localStorage persistence, new game reset
- **RU / EN localization** with in-game language switcher
- Procedural cockroach sprite and apartment environment art
- Sound manager with generated SFX
- Web platform adapter and dev server (`npm run dev`)

[0.4.1]: https://github.com/ShamanRostov/cockroach-life/compare/v0.3.0...v0.4.1
[0.3.0]: https://github.com/your-org/cockroach-life/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/your-org/cockroach-life/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/your-org/cockroach-life/releases/tag/v0.1.0
