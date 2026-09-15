# Trader

Каркас нового проекта **Trader**.

Сейчас лежит в репозитории `cockroach-life` (отдельный GitHub-репозиторий создать из этого агента нельзя — нет прав `createRepository`). Когда будет `github.com/ShamanRostov/Trader`, перенесите эту папку туда и подключите Cloud Agent к новому репо.

## Открыть workspace

- Cursor → **File → Open Workspace from File** → `Trader/Trader.code-workspace`
- или **Open Folder** → папка `Trader`

## Git (обязательно)

Правило в `.cursor/rules/always-git.mdc` и в корне репозитория: после изменений сразу

```bash
git add -A
git commit -m "описание"
git push
```
