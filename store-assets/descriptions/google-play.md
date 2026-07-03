# Google Play — Cockroach Life (WebView / TWA / APK wrapper)

## App title
**Cockroach Life — Nest & Raid Sim**

## Short description (≤80 chars)
Build a roach nest, raid neighbors, dodge slippers — survival sim + arcades!

## Full description

**Cockroach Life** brings the full browser game to your phone: build a colony from junk, breed roaches, raid rivals, and survive arcade dangers — all optimized for touch.

You're a cockroach in Apartment 47. Construct an isometric nest (kitchen box, sock bedroom, egg-carton nursery), manage food and money, then scout the **world map** to raid 11 enemy districts in three-phase missions.

**Arcade modes** on the go: dodge the slipper with tap controls, escape bug spray, hunt crumbs, outrun the cat. Virtual joystick included.

**Breeding** adds Workers, Scouts, and Fighters. **Weekly events** and **daily quests** reward regular play. Compete on leaderboards when connected.

Works offline for core gameplay; cloud sync depends on wrapper configuration.

## Feature graphic text overlay
Build • Raid • Survive

## Tags
Simulation, Casual, Strategy, Arcade, Offline play (core), Single player

## Content rating questionnaire notes
- Cartoon violence: None / Mild (comedic slipper, spray)
- No user-generated content
- In-app purchases: resource packs, remove ads
- Contains ads (optional IAP to remove)

## Store listing assets
| Asset | Size | File |
|-------|------|------|
| App icon | 512×512 | `store-assets/icons/icon-512.png` |
| Feature graphic | 1024×500 | Export from `store-assets/banners/cover.svg` |
| Phone screenshots | 1080×1920 or 16:9 | See `store-assets/screenshots/SCREENSHOTS.md` |
| Tablet screenshots | Optional | Landscape captures from game |

## Technical notes for APK wrapper
- **Entry URL:** `file:///android_asset/index.html` or hosted CDN
- **WebView:** Android System WebView 90+; enable hardware acceleration
- **Orientation:** Landscape preferred (game default)
- **Permissions:** INTERNET (ads, IAP, leaderboards); optional BILLING
- **Safe area:** Game uses `MobileUILayout` — test notched devices
- **Back button:** Map to in-game ESC / menu

## What's new (template)
- World map raids and breeding system
- Weekly live events and daily quest streaks
- Touch joystick and mobile UI scaling
- Russian and English languages
