# Разделение проектов — чеклист (чтобы больше не путать)

## Факт из истории агента `bc-01a029c1…` (22–24 авг 2026)

1. Чат **начался** с вопроса про жанры Crazy Games.
2. Сразу перешёл к разработке **Cockroach Life** в том же агенте.
3. Имя агента осталось «Crazy games жанры популярность», а репозиторий — `cockroach-life`.
4. Вся игровая работа **сохранена** в GitHub: ветка `cursor/nest-top-down-view-712e`, PR https://github.com/ShamanRostov/cockroach-life/pull/5
5. Ощущение «всё старое / всё пропало» = смотрели не ту ветку / кэш / старую локальную папку, а не потерю коммитов.

## Действия владельца (сделать один раз дома)

- [ ] Клонировать свежий `cockroach-life` в `C:\dev\cockroach-life` (не в старый UnityProject).
- [ ] `git checkout cursor/nest-top-down-view-712e`
- [ ] Открыть **эту** папку в Cursor (File → Open Folder).
- [ ] Старый `C:\UnityProject\Сockroach life` переименовать в `_ARCHIVE_cockroach_old` или удалить после проверки.
- [ ] Новый Cloud Agent всегда называть с префиксом `[cockroach-life] …`
- [ ] После merge PR #5 в `main` — работать уже от `main`.

## Действия агента (автоматически)

См. корневой файл **`PROJECT_IDENTITY.md`**.
