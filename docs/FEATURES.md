# Cockroach Life — Feature Reference

Complete feature documentation for **Cockroach Life** v0.3.0.

---

## Overview

| Property | Value |
|----------|-------|
| Genre | Casual simulation + arcade survival |
| Engine | Phaser 3, TypeScript, Vite |
| Orientation | Landscape (1280×720 logical canvas) |
| Languages | Russian, English |
| Platforms | Web, Yandex Games, Steam (Electron), operator portals |
| Save | localStorage (cloud on Yandex / operator when enabled) |
| Version | 0.3.0 |

**Elevator pitch:** Build a junk nest from a cockroach's POV, breed a colony, raid rivals across a world map, survive arcade hazards, and climb leaderboards — with optional ads and IAP.

---

## Core Loop

1. **Build & upgrade** rooms in the nest (apartment → balcony → stairwell).
2. **Earn resources** via passive income, arcades, raids, daily rewards, and quests.
3. **Spend resources** on buildings, breeding, traps, shields, and shop items.
4. **Progress** through season pass tiers, unlock regions, and compete on leaderboards.

---

## Nest — Building & Economy

### Regions

| Region | Unlock condition | Room types |
|--------|------------------|------------|
| **Apartment** | Start | kitchen, bedroom, storage, nursery, hospital |
| **Balcony** | 5 total builds OR raid rating ≥ 1200 | planter, shelter |
| **Stairwell** | 10 total builds OR rating ≥ 1500 OR (balcony unlocked + 3 balcony builds) | locker, niche |

### Room types (9 total)

| Room | Primary benefit |
|------|-----------------|
| Kitchen | Passive food income |
| Bedroom | Passive health recovery |
| Storage | Capacity / progression gate |
| Nursery | Enables breeding |
| Hospital | Faster recovery meta |
| Planter | Balcony food income |
| Shelter | Balcony health recovery |
| Locker | Stairwell money income |
| Niche | Stairwell health recovery |

- Buildings placed on isometric grid; tap/click to build, **Upgrade** button for levels 1–5 (nursery/hospital max 3).
- **Traps** (slipper, spray, glue) defend against bot raids during build mode.
- **Instant build** rewarded ad skips construction animation.

### Resources

| Resource | Used for |
|----------|----------|
| Food | Building, breeding |
| Money | Building, upgrades |
| Health | Survival; 0 HP triggers Hospital scene |

---

## Arcade Mini-Games (5)

| Scene | Controls | Rewards |
|-------|----------|---------|
| **Slipper Dodge** | ← → / A D / touch | Score, leaderboard |
| **Spray Escape** | WASD, hide in cracks | Food, money |
| **Food Hunt** | WASD | +40 food |
| **Cat Chase** | WASD / touch | Food, money |
| **Hospital** | Space (timing) | +30 HP |

- ESC returns to nest (Hospital after spray poisoning).
- Interstitial ad every 3rd arcade completion (min 60s apart) when ads enabled.
- Season pass XP on completion.

---

## World Map & Raids

### Map

- **16 districts** across 3 regions with procedural furniture markers.
- Region tabs: apartment / balcony / stairwell (locked regions show requirement message).
- Player nest + rival bot colonies per district.

### Raid flow (3 phases)

1. **Infiltration** — navigate to target.
2. **Loot** — steal from rival nest.
3. **Escape** — dodge slipper on exit.

### Limits & boosts

- **Energy:** 3 per day, resets at local midnight.
- **Daily raid cap:** 5 raids per day.
- **Shield:** 24h protection from counter-raids (IAP or season pass reward).
- **Double loot** rewarded ad before next raid.

---

## Breeding

- Requires **nursery** building.
- Three roles: **Worker** (income), **Scout** (speed), **Fighter** (raid strength).
- Hatch timer and nursery level cap colony size.
- Named cockroaches with role bonuses.

---

## Daily & Live-Ops Systems

### Daily bonus

- Streak rewards on consecutive days.
- Does not auto-open during active tutorial.

### Daily quests

- 3 quests per day, reset at **local midnight**.
- Rewards: food, money, season pass XP.

### Weekly live-ops events

Rotating multipliers:

| Event | Effect |
|-------|--------|
| Slipper Week | 2× slipper score |
| Spray Week | 2× spray rewards |
| Raid Week | 1.5× raid loot |
| Build Week | 30% build cost discount |
| Food Frenzy | 2× passive food |

---

## Season Pass

- **Monthly season** (calendar month key).
- **15 tiers**, 100 XP per tier.
- XP sources: daily quest (+50), raid (+30), arcade (+20), building (+10).
- **Free track:** food, money, energy, shield hours.
- **Premium track** (IAP `season_pass_premium`): larger rewards + exclusive skins (neon, golden, zombie, chef).
- Unclaimed rewards persist until claimed; season resets on new month.

---

## Skins

| Skin ID | Source |
|---------|--------|
| default | Free |
| neon | Season pass premium tier 3 |
| golden | Season pass premium tier 9 |
| zombie | Season pass premium tier 13 |
| chef | Season pass premium tier 15 |
| All purchasable | IAP `skin_pack` |

Equipped skin applies tint to cockroach sprite in nest and arcades.

---

## Monetization

### IAP products (8)

| ID | Type | Effect |
|----|------|--------|
| `food_pack_small` | Consumable | +200 food |
| `food_pack_large` | Consumable | +1000 food |
| `money_pack` | Consumable | +500 money |
| `shield_24h` | Consumable | 24h raid shield |
| `energy_refill` | Consumable | +3 raid energy |
| `remove_ads` | Non-consumable | Disables interstitials |
| `season_pass_premium` | Non-consumable | Unlocks premium pass track |
| `skin_pack` | Non-consumable | Unlocks all purchasable skins |

### Ads

- **Interstitial:** post-arcade (every 3rd, cooldown 60s).
- **Rewarded:** double raid loot, +energy, instant build, shop bonuses.
- Disabled when `remove_ads` purchased or platform has ads off (Steam).

---

## Leaderboards

| ID | Metric |
|----|--------|
| `slipper_highscore` | Best slipper dodge score |
| `raid_rating` | Cumulative raid rating |
| `colony_size` | Total buildings across all regions |

Integrated with Yandex Games SDK; mock entries on web dev.

---

## Platforms

| Platform | Adapter | Ads | IAP | Cloud save |
|----------|---------|-----|-----|------------|
| Web | `WebPlatform` | Dev mock | Mock | localStorage |
| Yandex Games | `YandexSDK` | Yandex ads | Yandex payments | Yandex cloud |
| Steam | `SteamPlatform` | Off | Stub | Steam Cloud (planned) |
| Operator | `OperatorPlatform` | Portal SDK | Portal billing | Portal API |

Force platform in dev: `?platform=yandex|web|steam|operator`

---

## Graphics & Audio

- **Procedural assets** — textures generated at boot via `ProceduralAssets.ts` (UI panels, buildings, arcade backgrounds, map, effects).
- **Cockroach sprite** — procedural body with skin tint overlay.
- **Visual effects** — particles, vignette, warm glow, build animations.
- **Audio** — procedurally generated SFX via `SoundManager`; mute toggle in menu.

---

## UI & Accessibility

- Resource HUD (food, money, health, energy).
- Quick buttons: daily bonus, shop, breeding, season pass.
- Event banner for current live-ops week.
- Tutorial overlay (welcome → build → arcade → world map).
- Mobile: virtual joystick, touch zones, safe-area layout (`MobileUILayout`).
- Language switcher: Menu → 🌐 Language (RU / EN).

---

## Analytics Events

Tracked via `AnalyticsService` (and Yandex-specific adapter):

- Session start, scene enter, persist heartbeat
- Arcade complete / fail
- Raid start / win / lose
- IAP purchase started / complete / failed
- Ad show / reward

---

## Save Data

Persisted fields include: resources, all region buildings, breeding state, quest progress, arcade scores, season pass XP/claims, unlocked skins, IAP non-consumables, tutorial step, daily streaks.

**New Game** resets all progress including current month's season pass.

---

## Developer Commands

```bash
npm install
npm run dev              # Local dev server
npm run build            # Production web build → dist/
npm run build:yandex     # Yandex SDK build
npm run build:staging    # Staging env
npm run preview          # Preview dist/
npm run electron:dev     # Desktop dev (Steam platform flag)
npm run electron:build   # Electron distributable
```

Screenshot mode: append `?screenshot=nest|map|shop|…` (see `src/dev/ScreenshotMode.ts`).

---

## Related Documentation

- [README.md](../README.md) — project overview
- [CHANGELOG.md](../CHANGELOG.md) — version history
- [docs/DEPLOYMENT.md](./DEPLOYMENT.md) — build & publish
- [docs/RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) — pre-publish checklist
- [docs/QA_CHECKLIST.md](./QA_CHECKLIST.md) — manual QA
- [store-assets/promo/copy.json](../store-assets/promo/copy.json) — marketing metadata
