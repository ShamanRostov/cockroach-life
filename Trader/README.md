# Trader

Онлайн-мониторинг новостей (РФ + зарубежье) и **почасовой прогноз** по голубым фишкам ММВБ: long / short только если историческая зависимость подтверждена.

## Логика

1. Собираем цены голубых фишек ММВБ за ≈ **6 месяцев** (ISS MOEX, часовые свечи).
2. Собираем новости: live RSS + архив GDELT (~6 месяцев).
3. Для каждой новости определяем тикер(ы) и тональность → ожидаемое направление (`up` / `down`).
4. Сравниваем с фактическим движением цены на горизонте (по умолчанию **4 часа**).
5. **Правильная зависимость**: совпадение ≥ **70%** при достаточной выборке → правило считается валидным.
6. Каждый час: свежие новости → рекомендации **только по валидным правилам**.

> Не является индивидуальной инвестиционной рекомендацией.

## Быстрый старт

```bash
cd Trader
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

# 1) цены 6м + live-новости + анализ + первый прогноз
python scripts/bootstrap.py

# 2) (опционально, долго из‑за GDELT rate limit) архив новостей 6м
python scripts/backfill_news_history.py --days 182 --step 14

# 3) пересчёт зависимостей и прогноз
python scripts/bootstrap.py --skip-prices

# 4) UI + API
python scripts/run_server.py
# http://127.0.0.1:8787

# 5) почасовой цикл
python scripts/run_scheduler.py
```

## API

| Метод | Путь | Назначение |
|-------|------|------------|
| GET | `/` | Дашборд |
| GET | `/api/forecast` | Последний прогноз |
| POST | `/api/forecast/run` | Пересчитать сейчас |
| POST | `/api/pipeline/prices` | Обновить цены |
| POST | `/api/pipeline/news` | Собрать RSS |
| POST | `/api/pipeline/analyze` | Найти зависимости ≥70% |
| GET | `/api/rules` | Валидные правила |

## Порог зависимости

Задаётся в `.env`:

```
DEPENDENCY_MIN_HIT_RATE=0.70
REACTION_HORIZON_HOURS=4
MIN_SAMPLES_FOR_RULE=5
MIN_MOVE_PCT=0.002
```

Критерии правила:
- `hit_rate ≥ 70%`
- `samples ≥ MIN_SAMPLES_FOR_RULE` (цель поднять до 8–10 после добора архива)
- `strong_valid`: дополнительно Wilson lower bound ≥ 70%

Пока архив directional-событий короткий, валидных правил может быть мало — это ожидаемо. После `backfill_news_history.py` и `reanalyze.py` правила появятся, если сигнал реально повторяем.

См. также: [docs/ROADMAP.md](docs/ROADMAP.md), [docs/STATUS.md](docs/STATUS.md).
