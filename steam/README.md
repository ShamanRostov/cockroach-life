# Steam / Steamworks Integration

Placeholder for Steam desktop distribution. Replace `steam_appid.txt` with your real App ID from Steamworks.

## Prerequisites

1. [Steamworks partner account](https://partner.steamgames.com/) and approved app.
2. Electron build from `../electron/` (optional wrapper).
3. Steamworks SDK (native bindings) — not included in this repo.

## Setup checklist

- [ ] Register app in Steamworks → note App ID → update `steam_appid.txt`
- [ ] Configure depots (Windows / Linux / macOS) with Electron `out/` artifacts
- [ ] Wire `SteamPlatform` in `src/platforms/SteamPlatform.ts` to Steamworks APIs
- [ ] Enable Steam Cloud for save sync (match `SaveSystem` JSON format)
- [ ] Configure achievements / leaderboards in Steamworks admin
- [ ] Test with Steam client running and valid `steam_appid.txt` in game folder

## Local test (Steam overlay)

```bash
# From repo root
npm run build
npm run electron:dev
```

Place your real App ID in `steam/steam_appid.txt` and copy it next to the executable when testing Steam API integration.

## Resources

- [Steamworks Documentation](https://partner.steamgames.com/doc/home)
- [Electron + Steamworks](https://partner.steamgames.com/doc/features/overlay)
