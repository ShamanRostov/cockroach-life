# ИДЕНТИЧНОСТЬ ПРОЕКТА — ЧИТАТЬ ПЕРВЫМ

## Это репозиторий

| Поле | Значение |
|------|----------|
| **Имя** | Cockroach Life («Жизнь таракана») |
| **GitHub** | https://github.com/ShamanRostov/cockroach-life |
| **Актуальная рабочая ветка (август 2026)** | `cursor/nest-top-down-view-712e` |
| **PR со всей недавней работой** | https://github.com/ShamanRostov/cockroach-life/pull/5 |
| **Стек** | TypeScript + Phaser 3 + Vite (браузерная игра) |
| **НЕ Unity** | Папки `C:\UnityProject\...` — только старые локальные пути/имена |

## Что НЕ является этим проектом

| Ошибочный сигнал | Как правильно |
|------------------|---------------|
| Cloud Agent назван «Crazy games жанры…» | Это **имя чата**, не репозиторий. Код живёт только в `cockroach-life`. |
| Локальная папка `C:\UnityProject\Сockroach life` | Может быть **старым клоном**. Актуальный код — с GitHub (ветка выше). |
| `c-UnityProject-ockroach-life\assets` | Источник PNG для скриптов деплоя ассетов, **не** отдельная игра. |
| Исследование жанров Crazy Games | Отдельная **аналитическая** задача; не отдельный game-repo в этой среде. |

## Где лежит работа за последние дни (НЕ потеряна)

Всё запушено в ветку **`cursor/nest-top-down-view-712e`** / **PR #5** (~19 коммитов поверх `main`, +2600/−600 строк, 145 файлов), в том числе:

- top-down сетка гнезда вместо isometric
- 45 спрайтов зданий (9 типов × 5 уровней)
- туториал, экономика, контр-рейды, CrazyGames SDK
- зум/пан, HUD, demolish, unique rooms
- arcade-фиксы (квадраты на BG, подсказки, коллизии тапка)
- season pass / leaderboard / daily panel правки

Коммиты смотреть:  
`git log origin/main..origin/cursor/nest-top-down-view-712e --oneline`

## Как открыть АКТУАЛЬНЫЙ проект (жёсткое правило)

```powershell
cd C:\dev   # или любая НОВАЯ папка, не старый UnityProject
git clone https://github.com/ShamanRostov/cockroach-life.git
cd cockroach-life
git fetch origin
git checkout cursor/nest-top-down-view-712e
npm install
npm run dev
```

Браузер: http://localhost:5173 — **жёсткий refresh** (Ctrl+Shift+R).

Cloud Agent всегда создавать так:

1. Repo: **ShamanRostov/cockroach-life** (только он)
2. Branch: **`cursor/nest-top-down-view-712e`** (пока PR #5 не влит в `main`)
3. Имя агента: начинать с **`[cockroach-life]`** — например `[cockroach-life] HUD fonts`
4. **Не** открывать агента из старой папки UnityProject, если там другой checkout

## Разведение проектов навсегда

1. **Один GitHub-репо игры** = `cockroach-life`. Аналитику Crazy Games вести в другом чате/доке, не путать с game agent.
2. Локально держать **одну** папку: `C:\dev\cockroach-life` (клон с GitHub). Старый `UnityProject\Сockroach life` — архив/не трогать или удалить после бэкапа.
3. Перед работой: `git status` + `git branch` + `git log -1` — убедиться, что ветка `cursor/nest-top-down-view-712e` (или `main` после merge).
4. Ассеты править только внутри `public/assets/` этого репо и коммитить/пушить; локальный `...assets` без push = «пропало» для облака.

## Для агентов (обязательно)

Перед любыми правками проверить:

```bash
git remote -v   # должен быть ShamanRostov/cockroach-life
git branch --show-current
git log -1 --oneline
```

Если remote/ветка другие — **остановиться** и спросить пользователя, не править «чужой» снимок.
