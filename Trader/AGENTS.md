# Правила для агентов — Trader

- Workspace: **Trader** (пока внутри `cockroach-life`)
- Цель: онлайн-мониторинг новостей (РФ + зарубежье) → почасовой прогноз по голубым фишкам ММВБ → long/short
- Валидная зависимость: совпадение ожидаемого и фактического движения цены ≥ **70%** на истории ~6 месяцев
- После изменений всегда: `git add` → `git commit` → `git push` (см. `.cursor/rules/always-git.mdc`)
- **Модели:** под задачу, не одну на всё (см. `.cursor/rules/model-selection.mdc`)
  - методология / quant → Opus / GPT terra (high+)
  - код → Composer 2.5 / Sonnet
  - быстрый поиск → Composer fast / Gemini Flash
  - UI → Muse Spark
- Не коммитить секреты, `.env` и каталог `data/`
- Это исследовательский инструмент, не инвест-рекомендация клиенту
