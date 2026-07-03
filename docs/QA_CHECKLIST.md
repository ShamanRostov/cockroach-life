# Cockroach Life — Manual QA Checklist

Use this document for release smoke tests. Test on **desktop (1280×720)** and **mobile (375px width)** unless noted.

---

## 1. Boot & Save

- [ ] Game loads from Boot → Menu without console errors
- [ ] Existing save restores food, money, health, rooms, balcony/stairwell layouts
- [ ] **New Game** resets all progress (rooms, quests, arcade scores, season pass XP for current month)
- [ ] Old saves missing new fields (balcony, stairwell, season pass, skins) load with sensible defaults
- [ ] Cloud save (Yandex mode) syncs when enabled

## 2. Nest — Building

- [ ] Build kitchen/bedroom on apartment grid; unlock storage → nursery → hospital by room count
- [ ] Switch to **Balcony** after 5 total buildings OR rating ≥ 1200
- [ ] On balcony: build **planter** and **shelter** only (no apartment rooms leak into unlock list)
- [ ] Switch to **Stairwell** when unlock conditions met (10 builds / rating 1500+ / balcony + 3 builds)
- [ ] On stairwell: build **locker** and **niche**
- [ ] Upgrade buildings; instant-build rewarded ad bonus skips animation
- [ ] Passive income ticks (kitchen food, planter on balcony, locker money on stairwell)
- [ ] Bedroom/shelter/niche passive heal over time

## 3. Nest — UI & Mobile

- [ ] Resource HUD visible; not clipped by notch/safe area on mobile
- [ ] HUD buttons (🎁 daily, 💰 shop, 🪳 breeding, 🎫 season pass) do not overlap at 375px width
- [ ] Event banner shows current live-ops event; tap opens details
- [ ] Arcade row (slipper, spray, food, cat) fits without overlap on mobile
- [ ] Region switcher cycles apartment → balcony → stairwell (skips locked regions)
- [ ] Touch: tap grid to build; side panels do not trigger grid clicks

## 4. Tutorial & Daily Systems

- [ ] Fresh save: tutorial steps welcome → build kitchen → food arcade → world map
- [ ] Tutorial active: daily bonus popup does **not** auto-open
- [ ] After tutorial skip/complete: daily bonus can appear on nest enter
- [ ] Daily bonus claims correctly; streak increments across days (local midnight)
- [ ] Daily quests reset at **local midnight** with 3 new quests
- [ ] Claiming quests grants food/money and season pass XP

## 5. Arcade Missions

| Scene | Win | Lose | Monetization | Analytics | Daily quest | Season XP |
|-------|-----|------|--------------|-----------|-------------|-----------|
| Slipper Dodge | ✓ | ✓ | interstitial on complete | ✓ | arcade | ✓ |
| Spray Escape | ✓ | ✓ | ✓ | ✓ | arcade | ✓ |
| Food Hunt | ✓ | ✓ | ✓ | ✓ | arcade | ✓ |
| Cat Chase | ✓ | ✓ | ✓ | ✓ | arcade | ✓ |
| Hospital | ✓ | N/A | ✓ | ✓ | arcade | ✓ |

- [ ] Each arcade has keyboard controls on desktop
- [ ] Each arcade has touch controls on mobile (joystick or tap zones)
- [ ] ESC returns to nest (or hospital after spray poison)
- [ ] High scores persist; slipper new record offers leaderboard shortcut

## 6. World Map & Raids

- [ ] Energy display updates; **raid energy resets at local midnight** (full 3 energy)
- [ ] Raid daily limit (5/day) enforced
- [ ] Apartment / balcony / stairwell map tabs work; locked regions show message
- [ ] Successful raid submits raid rating to leaderboard
- [ ] Raid win/lose analytics fire; daily raid quest progresses
- [ ] Double-loot rewarded ad doubles next raid loot

## 7. Monetization

- [ ] Shop opens from nest 💰 button
- [ ] IAP mock purchases: food, money, shield, energy refill apply immediately
- [ ] **remove_ads** purchase stops interstitials (iap + save state)
- [ ] **season_pass_premium** unlocks premium track
- [ ] **skin_pack** unlocks all purchasable skins
- [ ] Rewarded ads in shop: double loot, +energy, speed build — each grants bonus once
- [ ] Interstitial shows every 3rd arcade complete (min 60s apart) when ads enabled

## 8. Season Pass & Skins

- [ ] Season pass panel opens from 🎫 HUD button
- [ ] Free and premium rewards claimable at correct tiers
- [ ] XP from build, arcade, raid, daily quest
- [ ] Season resets on new calendar month
- [ ] Skin rewards equip cockroach tint in nest

## 9. Breeding & Hospital

- [ ] Breeding panel only shows when nursery exists
- [ ] Breed worker/scout/fighter; timer hatches; capacity respects nursery level
- [ ] Health = 0 in nest → toast → **Hospital** scene
- [ ] Hospital pulse mini-game heals; completion returns to nest with HP restored

## 10. Leaderboards & Analytics

- [ ] Menu → Leaderboards loads all three tabs (slipper, raid rating, colony size)
- [ ] Colony leaderboard uses **total buildings across all regions**
- [ ] Session start, scene enter, persist heartbeat analytics (dev console in DEV mode)

## 11. i18n

- [ ] Language toggle RU ↔ EN updates all visible UI
- [ ] `en.ts` and `ru.ts` keys match (no missing room/product strings)
- [ ] Locker, niche, stairwell districts, season pass, skin pack strings present

## 12. Build

```bash
npm run build
```

- [ ] `tsc` passes with zero errors
- [ ] Vite production bundle completes

---

## Regression Hotspots

1. **Snapshot completeness** — balcony/stairwell rooms, season pass, skins, IAP products in save JSON
2. **Region switch** — building state saved to correct region slot before switch
3. **remove_ads** — check both `iapService` and `GameState.purchasedProducts`
4. **Raid date reset** — uses local date, not UTC
5. **Balcony unlock** — rating **≥ 1200** (not strictly greater)

## Known Limitations

- Electron/Steam builds use mock IAP and ads unless platform SDK is configured
- Season pass premium purchase via season pass panel uses same IAP flow as shop
- Stairwell region unlock text shows multiple OR conditions; all paths should be tested separately
