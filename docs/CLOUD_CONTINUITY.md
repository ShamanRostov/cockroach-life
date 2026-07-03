# Облачная непрерывность — если ноутбук отключится

Проект настроен так, чтобы работа **не зависела только от локального ПК**.

---

## Что уже сделано локально (сохранено на диске)

- Версия **v0.3.0** — полный релизный MVP
- Git-репозиторий инициализирован (все файлы в коммите)
- CI-пайплайн `.github/workflows/ci.yml` — сборка в облаке GitHub Actions
- Скрипты: `npm run build`, `build:yandex`, `screenshots`

**Даже если Cursor закроется** — код остаётся в `C:\UnityProject\Сockroach life`.

---

## Шаг 1: Залить на GitHub (5 минут, один раз)

Без GitHub облачные агенты Cursor **не смогут** продолжить работу.

```powershell
cd "C:\UnityProject\Сockroach life"

# Создайте репозиторий на github.com (пустой, без README)
# Затем:
git remote add origin https://github.com/ВАШ_ЛОГИН/cockroach-life.git
git branch -M main
git push -u origin main
```

После push CI автоматически:
- соберёт `dist/` на каждый push
- переснимет скриншоты ночью (cron 03:00 UTC)
- артефакты скачиваются в Actions → Artifacts

---

## Шаг 2: Cursor Cloud Agent (работа без ноутбука)

1. Откройте [cursor.com/dashboard → Cloud Agents](https://cursor.com/dashboard?tab=cloud-agents)
2. **New Cloud Agent**
3. Выберите репозиторий `cockroach-life`
4. Вставьте промпт из файла **`docs/CLOUD_AGENT_PROMPT.md`**
5. Запустите — агент работает на серверах Cursor, ноутбук можно выключить

Cloud Agent умеет: коммиты, PR, сборку, доработку кода.

---

## Шаг 3: Cursor Automation (по расписанию)

Если нужен агент **каждый день** без вашего участия:

1. Cursor → **Automations** → New
2. Триггер: **On a schedule** → Every day at 9:00
3. Репозиторий: `cockroach-life`, ветка `main`
4. Промпт: содержимое `docs/CLOUD_AGENT_PROMPT.md`
5. Включите **Cloud compute**

Агент будет проверять билд, метрики, дорабатывать контент.

---

## Локальная автопроверка (ноутбук включён, Cursor закрыт)

```powershell
cd "C:\UnityProject\Сockroach life"
powershell -File scripts/nightly-verify.ps1
```

Лог: `logs/verify-YYYY-MM-DD.log`

---

## Публикация без ноутбука (после push на GitHub)

1. Actions → последний успешный workflow
2. Скачать артефакт **dist-web**
3. Загрузить в [Яндекс Игры Console](https://games.yandex.ru/console)
4. Тексты и картинки — из `store-assets/`

---

## Контакты / что делать в понедельник

| Задача | Файл |
|--------|------|
| Полный статус проекта | `docs/MONDAY_HANDOFF.md` |
| Чеклист релиза | `docs/RELEASE_CHECKLIST.md` |
| Промпт для Cloud Agent | `docs/CLOUD_AGENT_PROMPT.md` |

---

## Ограничения

- **Яндекс Console** — модерацию и IAP настраивает только владелец аккаунта (вручную)
- **Steam / операторы** — нужны договоры с платформами
- Cloud Agent **не публикует** в сторы без ваших ключей API
