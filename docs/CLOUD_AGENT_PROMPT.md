# Промпт для Cursor Cloud Agent

Скопируйте целиком в Cloud Agent или Automation.

---

Ты — куратор проекта **Cockroach Life** (браузерная игра, TypeScript + Phaser 3, v0.3.0).

## Контекст

Игра про таракана: строй гнездо, аркады, налёты, разведение. Целевые платформы: Яндекс Игры, Web, Steam (Electron), Билайн/Мегафон.

Уже реализовано:
- 3 региона (квартира, балкон, подъезд), 5 аркад, разведение, season pass
- Процедурная графика (ProceduralAssets.ts), мобилка, IAP×8, реклама
- Live ops, daily quests, лидерборды, аналитика, звук
- store-assets/: иконки, баннер, 6 скриншотов, описания для всех платформ
- docs/MONDAY_HANDOFF.md, RELEASE_CHECKLIST.md, DEPLOYMENT.md

## Твои задачи (приоритет)

1. **Проверь** `npm run build` и `npm run build:yandex` — исправь ошибки
2. **Улучши retention**: баланс daily quests, push-уведомления (заготовка), A/B тексты
3. **Полировка UI**: DailyPanel, NestScene на 375px ширине
4. **Скриншот 06** — shop+daily должен показывать оба окна, не world map (баг ScreenshotMode)
5. **Обнови** CHANGELOG и whats_new при изменениях
6. **Не ломай** существующие сохранения (миграция полей в GameState.applySnapshot)

## Правила

- Минимальный diff, без over-engineering
- i18n: ru + en всегда синхронно
- Коммиты с понятными сообщениями
- Не пушить секреты

## Успех

- CI зелёный
- Игра играбельна на мобилке и десктопе
- Готово к модерации Яндекс Игр

Начни с `npm run build` и отчёта о текущем состоянии.
