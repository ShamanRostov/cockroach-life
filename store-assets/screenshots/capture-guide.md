# Screenshot Capture Guide — Cockroach Life

Step-by-step instructions for capturing the six store screenshots using the in-game dev helper.

## Setup

1. Build or run the dev server:
   ```bash
   npm run dev
   ```
2. Open the game with screenshot mode enabled:
   ```
   http://localhost:5173/?screenshots=1
   ```
3. Set your browser window to **1280×720** (exact game resolution).
   - Chrome/Edge: F12 → device toolbar → Responsive → 1280 × 720, zoom 100%
   - Or resize the window and verify the canvas fills the viewport without letterboxing
4. A floating **Screenshot Mode** panel appears in the top-right corner.

## Capture method

- **Chrome/Edge:** F12 → `Ctrl+Shift+P` → “Capture screenshot” (captures the viewport)
- **Firefox:** F12 → `Ctrl+Shift+S` → “Save visible screenshot”
- **Windows:** Win+Shift+S (crop to the game canvas only)
- Hide the dev panel before capturing if it overlaps the game (move browser window or temporarily set `#screenshot-mode-panel { display: none }` in DevTools)

Save all files as **PNG** into `store-assets/screenshots/`.

---

## 1. `01-nest-building.png` — Nest building

1. Click **1. Nest building** in the screenshot panel.
2. Wait for the nest scene to load (apartment region, 5 buildings visible).
3. Verify: resource HUD (food/money/health), build panel on the right, isometric grid with kitchen, bedroom, storage, nursery, hospital.
4. Capture the full 1280×720 frame.

**Tips:** Buildings are pre-placed at mixed upgrade levels. Tutorial overlay is disabled.

---

## 2. `02-slipper-dodge.png` — Slipper dodge mid-game

1. Click **2. Slipper dodge**.
2. Scene loads with score ~620, cockroach dodging, slipper mid-air.
3. Verify: score counter, lane floor, control hint at bottom, no game-over overlay.
4. Capture during action (slippers in motion).

---

## 3. `03-raid-infiltration.png` — Raid infiltration

1. Click **3. Raid infiltration**.
2. Scene skips intro and opens **Phase 1: Infiltration** directly.
3. Verify: phase banner, enemy colony name, green exit zone, player roach in enemy territory, trap count in HUD.
4. Capture with the roach mid-map (move slightly with arrow keys/WASD if needed).

---

## 4. `04-world-map.png` — World map

1. Click **4. World map**.
2. Full Apartment 47 map loads with multiple districts lit.
3. Verify: raid energy ⚡, rating 🏆 (~1450), player nest marker, rival bot labels, balcony region visible.
4. Capture the entire map.

---

## 5. `05-breeding-panel.png` — Breeding panel

1. Click **5. Breeding panel**.
2. Nest scene opens with the **Breeding** overlay automatically.
3. Verify: colony capacity (4/4 or similar), named roaches with roles, Worker/Scout/Fighter buttons, breed cost visible.
4. Capture with the panel fully open.

---

## 6. `06-shop-daily-quests.png` — Shop + daily quests

1. Click **6. Shop + daily**.
2. Nest scene opens with **Daily panel** (left) and **Shop panel** (right) side by side.
3. Verify: daily bonus streak (Day 5+), 3 daily quests (one completed ✓), IAP product rows with prices.
4. Capture both panels in one frame.

---

## File naming convention

| # | Filename | Scene |
|---|----------|-------|
| 1 | `01-nest-building.png` | NestScene |
| 2 | `02-slipper-dodge.png` | SlipperDodgeScene |
| 3 | `03-raid-infiltration.png` | RaidScene (Phase 1) |
| 4 | `04-world-map.png` | WorldMapScene |
| 5 | `05-breeding-panel.png` | NestScene + BreedingPanel |
| 6 | `06-shop-daily-quests.png` | NestScene + DailyPanel + ShopPanel |

## Export checklist

| Asset | Dimensions | Format | Max size |
|-------|------------|--------|----------|
| All screenshots | 1280×720 | PNG | ≤ 1 MB each |
| Icon | 512×512 | PNG from `store-assets/icons/icon.svg` | — |
| Cover | 800×470 | From `store-assets/cover.svg` | — |

## Locale

- Use `?lang=ru` (or Russian browser locale) for Yandex Games RU listing.
- Use English (default) for Steam global listing.

## Resetting state

Click **↺ Reset save state** in the screenshot panel to re-apply the pre-populated mid-game save at any time.

## Pre-populated save summary

The dev helper seeds:

- 8 buildings (5 apartment + 3 balcony)
- Food 850, Money 1240
- 4 bred cockroaches with roles
- Raid rating 1450, 18 wins
- Login streak Day 5+, daily quests with one complete
- Tutorial complete

See also: `SCREENSHOTS.md` for creative brief and mood notes per shot.
