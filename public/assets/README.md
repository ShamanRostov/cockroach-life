# Game assets (PNG only)

- **No procedural/code-generated graphics** — all art is PNG in this folder.
- **No baked text on images** — all UI labels use `i18n` (RU/EN). Sprites and backgrounds are text-free.
- **Transparency** — run `npm run process:assets` after replacing source art (removes white backgrounds, trims, resizes).
- **Source art cache** — raw AI exports live in Cursor assets folder; `deploy-assets.ps1` copies them here, then `process-assets.mjs` processes.

## Folders

| Folder | Contents |
|--------|----------|
| `ui/` | Panels, buttons, HUD chrome |
| `backgrounds/` | Full-screen scene backgrounds (1280×720) |
| `sprites/` | Icons, hazards, particles (transparent) |
| `buildings/` | Nest rooms `building-{type}-1` … `5` (256×256 top-down, transparent) |
| `characters/` | Cockroach walk frames `cockroach-0` … `7` (64×40) |

## Pipeline

```bash
npm run deploy:assets   # copy + process
npm run audit:graphics  # screenshot QA
```
