# CrazyGames — publish checklist

## Build

```bash
npm run build:crazygames
```

Outputs `dist/` with CrazyGames SDK loader enabled (`VITE_LOAD_CRAZYGAMES_SDK=true`).

Local test without uploading:

```bash
npm run build:crazygames && npm run preview
# open http://localhost:4173/?platform=crazygames&useLocalSdk=true
```

## SDK integration (already in code)

| Hook | Where |
|------|--------|
| `SDK.init()` | `CrazyGamesPlatform.init` |
| `loadingStart` / `loadingStop` | Boot → `gameReady` |
| `gameplayStart` / `gameplayStop` | Nest enter / leave |
| Midgame ads | After every 3rd arcade (`MonetizationService`) |
| Rewarded ads | Shop bonuses (double loot, energy, instant build) |
| Cloud save | `SDK.data` with localStorage fallback |
| `happytime` | Successful raid, tutorial complete |

## Submission notes

- Initial download should stay **≤ 50 MB** (≤ 20 MB for mobile homepage). Procedural floor + PNG sprites keep size small.
- Land in Menu → Play quickly; first `gameplayStart` fires when Nest becomes playable.
- Ads only through CrazyGames SDK (no third-party ad networks).
- PEGI-12 humor / no real violence — cockroach comedy sim.
- Cover + screenshots: `store-assets/screenshots/` (run `npm run screenshots` after build).

## Developer portal

1. https://developer.crazygames.com/ — create game
2. Upload zip of `dist/` contents
3. Category: **Hypercasual / Simulation**
4. After Basic Launch QA, enable Full Launch + monetization

## Related

- [docs/DEPLOYMENT.md](./DEPLOYMENT.md)
- [docs/RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md)
- Platform adapter: `src/platforms/CrazyGamesPlatform.ts`
