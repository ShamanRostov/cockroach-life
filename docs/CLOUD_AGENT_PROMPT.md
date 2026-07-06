# Cloud Agent — Cockroach Life (автономная работа)

Скопируй **весь блок ниже** в [Cursor Cloud Agent](https://cursor.com/agents) → New Agent → вставь промпт.

Репозиторий: `https://github.com/ShamanRostov/cockroach-life` (ветка `main`)

---

## Промпт для Cloud Agent

Ты — lead-разработчик **Cockroach Life** (TypeScript + Phaser 3, v0.4.1+).

### Контекст проекта

- Браузерная hybrid-casual игра: гнездо, аркады, налёты, разведение, season pass
- Платформы: **Яндекс Игры**, Web, Steam (Electron), операторы
- **Процедурная графика УДАЛЕНА** — только PNG в `public/assets/`
- i18n: **ru + en** — текст только в коде (`src/i18n`), **не на картинках**

### Критичные проблемы (приоритет 1)

1. **Графика**
   - Убрать белые подложки у всех спрайтов (таракан, здания, иконки)
   - Запускать `npm run deploy:assets` → `node scripts/process-assets.mjs`
   - Проверять `npm run audit:graphics` (скриншот `logs/nest-audit.png`)
   - Таракан: 64×40, scale ~0.55, прозрачный фон
   - Здания: 256×256 trimmed, `buildingDisplayScale` в AssetKeys.ts

2. **UI NestScene — без наложений**
   - Вёрстка в `src/game/ui/NestLayout.ts`
   - Панели не перекрывают HUD, баннер, сетку
   - Модалки: `ModalLayer.ts` — Close уничтожает ВСЕ объекты

3. **Аркады** — интереснее и красивее (PNG only)
   - SlipperDodge, SprayEscape, FoodHunt, CatChase, Hospital
   - Juice: shake, spark particles, score popups

### Задачи (приоритет 2)

4. Баланс: `src/game/systems/GameBalance.ts`, daily quests, пассивный доход
5. `npm run verify` — build + smoke + ui-test (7/7) должны проходить
6. `npm run build:yandex` — сборка для Яндекс Игр
7. Обновить CHANGELOG, версию в package.json
8. Push в `main` на GitHub после каждого логического блока

### Команды

```bash
npm install
npm run deploy:assets
npm run dev          # http://localhost:5173
npm run verify
npm run build:yandex
```

### Правила

- Минимальный diff, без over-engineering
- i18n ru+en синхронно
- **Никакой процедурной генерации графики**
- Не коммитить секреты
- Работай автономно до зелёного CI и играбельного состояния

### Успех

- Все тесты зелёные
- Нет белых квадратов у спрайтов
- UI читаемый, кнопки работают
- Готово к модерации Яндекс Игр

**Начни с:** `git pull`, `npm run deploy:assets`, `npm run verify`, скриншот NestScene, список оставшихся багов.
