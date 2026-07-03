# Screenshot Brief — Cockroach Life

Capture at **1280×720** (native game resolution). Export as PNG. Landscape orientation for Yandex, Steam, and operator portals; optionally crop/portrait for Google Play.

Palette reference: `bgDark #1a1208`, `accent #ffa726`, warm kitchen browns.

---

## 1. `01-nest-building.png` — Nest building view

**Scene:** `NestScene` — apartment floor, isometric grid visible.

**Must show:**
- At least 3–4 built rooms (Kitchen, Bedroom, Storage) at different upgrade levels
- Resource HUD top-left: food 🍞, money 💰, health ❤️ with readable numbers
- Building panel on the right with room icons (Kitchen selected or highlighted)
- Warm parquet floor tiles, wall/baseboard in background
- One room mid-upgrade glow or «Улучшить» button visible
- Optional: «Карта мира» / trap defense buttons in bottom bar

**Mood:** Cozy empire-building — «look what I built from trash.»

**Avoid:** Empty grid, death screen, modal overlays blocking the nest.

---

## 2. `02-slipper-dodge.png` — Slipper dodge arcade

**Scene:** `SlipperDodgeScene` — mid-run action frame.

**Must show:**
- Player cockroach centered or dodging
- Human slipper (👟) in motion — mid-air or about to land
- Score counter visible (preferably 500+ for marketing appeal)
- Floor cracks/lane markers showing dodge lanes
- «← →» or touch hint at bottom
- High-energy moment — near-miss, not game-over

**Mood:** Fast reflex arcade — tension + humor.

**Avoid:** «Hit by slipper» defeat screen, score of 0.

---

## 3. `03-raid-infiltration.png` — Raid infiltration

**Scene:** `RaidScene` — Phase 1 (Infiltration).

**Must show:**
- HUD: «Фаза 1: Проникновение» / «Phase 1: Infiltration»
- Enemy nest name (e.g. «Колония Хлеба» / «Crumb Colony»)
- Green target zone on far side of map
- Player roach moving through enemy territory
- Trap icons or warning «Вражеских ловушек: N»
- Timer and damage indicators in HUD

**Mood:** Stealth heist — Ocean's Eleven at floor level.

**Avoid:** Victory/defeat overlay, Phase 3 escape (save for alternate marketing asset).

---

## 4. `04-world-map.png` — World map

**Scene:** `WorldMapScene` — full map of Apartment 47.

**Must show:**
- Multiple district nodes lit up (Fridge, Stove, Trash, etc.)
- Player nest marker («Ваше гнездо») distinct from rivals
- Raid energy ⚡ and rating 🏆 in header
- At least one rival bot name visible on hover or label (e.g. «Банда у мусорки»)
- «⚔️ Налёт!» button or raid-in-progress animation on one node
- Balcony region visible (locked or unlocked)

**Mood:** Strategic overview — «choose your target.»

**Avoid:** Zoomed crop that hides map topology.

---

## 5. `05-breeding-panel.png` — Breeding panel

**Scene:** `NestScene` with `BreedingPanel` overlay open.

**Must show:**
- Panel title «🪳 Разведение» / «🪳 Breeding»
- Colony capacity bar (e.g. 4/8)
- Active bonuses line (Worker +X%, Scout +X%, Fighter +X%)
- 2–3 named roaches listed with roles and levels
- Role selection buttons: Worker / Scout / Fighter
- «Развести» button with food/money cost visible
- Nursery room visible behind semi-transparent overlay

**Mood:** Colony management depth — RPG-lite progression.

**Avoid:** Empty colony with error «Постройте Питомник» unless showing tutorial flow.

---

## 6. `06-shop-daily-quests.png` — Shop / daily quests

**Scene:** Composite or single capture with `DailyPanel` and/or `ShopPanel`.

**Preferred layout:** Daily panel primary — show:
- «🎁 Ежедневный бонус» with streak Day 3+ 
- «📋 Ежедневные задания» with 2–3 quests (one complete ✓)
- Claim button visible

**Secondary (corner inset or second variant):** Shop panel with IAP rows:
- Food pack, Money pack, Remove ads
- Prices or «Купить» buttons

**Optional:** Weekly event banner (`EventBanner`) at top — e.g. «Неделя налётов ×1.5»

**Mood:** Live service — reasons to return daily.

**Avoid:** Purchase failure dialogs, ad loading spinner.

---

## Export checklist

| File | Dimensions | Max size (Yandex) |
|------|------------|-------------------|
| All screenshots | 1280×720 | ≤ 1 MB each PNG |
| Icon | 512×512 | From `icon.svg` |
| Cover | 800×470 | From `cover.svg` |

**Capture tips:**
1. Use Russian locale for RU store; EN for Steam global.
2. Disable tutorial overlay (`TutorialSystem` complete save).
3. Populate mid-game save: 5+ buildings, rating 800+, 3+ roaches.
4. Run `npm run dev`, F12 screenshot or OS capture at 100% scale.
