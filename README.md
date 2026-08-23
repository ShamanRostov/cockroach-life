# 🪳 Жизнь таракана

Браузерная игра: строй гнездо, управляй экономикой и выживай в аркадных мини-играх.

## Стек

- **TypeScript** + **Phaser 3** + **Vite**
- Сохранения в `localStorage`
- Готово к интеграции с Яндекс Играми (SDK-заглушка)

## Локализация

Игра поддерживает **русский** и **английский**. Языки полностью разделены — все тексты в отдельных файлах:

```
src/i18n/locales/
  ru.ts   — русский
  en.ts   — английский
```

Переключение: **Меню → 🌐 Язык**. Выбор сохраняется в браузере.  
Графика не содержит текста — только код и locale-файлы.

Чтобы добавить язык: создайте `src/i18n/locales/xx.ts` по образцу `en.ts` и добавьте код в `SUPPORTED_LOCALES` в `src/i18n/index.ts`.

## Открыть дома в Cursor

Клон: `git clone https://github.com/ShamanRostov/cockroach-life.git` → открыть папку в Cursor.  
Пошагово: **[docs/HOME_CURSOR.md](docs/HOME_CURSOR.md)**

## Запуск

**Windows (проще всего):** дважды кликните `start.bat` — установит зависимости и откроет браузер.

**Или вручную:**

```bash
npm install
npm run dev
```

Игра откроется на **http://localhost:5173** (если порт занят — Vite выберет 5174).

> **Важно:** не открывайте `index.html` напрямую из папки — нужен dev-сервер Vite.

## Сборка

```bash
npm run build
npm run preview
```

Папка `dist/` — готовый билд для веб-хостинга и порталов.

## Геймплей

### Мета-игра (Гнездо)
- Изометрическое строительство комнат: кухня, спальня, кладовая, питомник, лазарет
- Экономика: еда, деньги, здоровье
- Пассивный доход от построек
- Клик по сетке — строить, кнопка «Улучшить» — апгрейд

### Аркады
| Мини-игра | Управление | Награда |
|-----------|------------|---------|
| 👟 Уворот от тапка | ← → / A D | Счёт, рекорды |
| ☠️ Дихлофос | WASD, укрытия | +еда, +деньги |
| 🍞 Поиск еды | WASD | +40 еды |
| 🏥 Больница | Пробел (тайминг) | +30 HP |

## Структура проекта

```
src/
├── game/
│   ├── scenes/       # Игровые сцены
│   ├── systems/      # Экономика, строительство, сохранения
│   ├── ui/           # HUD, кнопки
│   └── utils/        # Изометрия, генерация текстур
├── platforms/        # SDK площадок
└── main.ts           # Точка входа
```

## Платформы (roadmap)

- [x] Web / браузер
- [x] Яндекс Игры (SDK) — см. `yandex-games.config.json`
- [x] CrazyGames (SDK v3) — см. `docs/CRAZYGAMES.md`, `npm run build:crazygames`
- [x] Steam (Electron) — см. `steam/README.md`
- [x] Билайн / Мегафон (HTML5-порталы) — см. `docs/OPERATOR_PORTALS.md`

## Store assets & publishing

Marketing copy, icons, banners, and platform metadata live in **[store-assets/](store-assets/)**.

| Resource | Path |
|----------|------|
| Publishing guide | [store-assets/ASSETS_README.md](store-assets/ASSETS_README.md) |
| Yandex / Steam / Play copy | [store-assets/descriptions/](store-assets/descriptions/) |
| Structured promo JSON | [store-assets/promo/copy.json](store-assets/promo/copy.json) |
| Screenshot brief | [store-assets/screenshots/SCREENSHOTS.md](store-assets/screenshots/SCREENSHOTS.md) |
| Yandex Console template | [yandex-games.config.json](yandex-games.config.json) |
| Build & deploy | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) |

**Quick publish:** edit copy in `store-assets/`, export PNG from SVG icons/banners (see ASSETS_README), capture 6 screenshots per SCREENSHOTS.md, then `npm run build:yandex` and upload to [Yandex Games Console](https://games.yandex.ru/console).
