from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from trader.analysis.sentiment import tag_news_row
from trader.config import settings
from trader.data.moex import load_prices, price_direction
from trader.data.news import load_news


def _explode_tagged(news: pd.DataFrame) -> pd.DataFrame:
    rows: list[dict] = []
    for _, n in news.iterrows():
        tags = tag_news_row(str(n.get("title", "")), str(n.get("summary", "")))
        if not tags["tickers"] or not tags["expected_direction"]:
            continue
        for ticker in tags["tickers"]:
            rows.append(
                {
                    "news_id": n["id"],
                    "published_at": n["published_at"],
                    "source": n.get("source"),
                    "region": n.get("region"),
                    "title": n.get("title"),
                    "ticker": ticker,
                    "sentiment": tags["sentiment"],
                    "expected_direction": tags["expected_direction"],
                    "signal_key": f"{ticker}|{tags['sentiment']}",
                }
            )
    return pd.DataFrame(rows)


def build_event_outcomes(horizon_hours: int | None = None) -> pd.DataFrame:
    """Событие новости → факт направления цены на горизонте."""
    horizon = horizon_hours or settings.reaction_horizon_hours
    news = load_news()
    prices = load_prices()
    if news.empty or prices.empty:
        return pd.DataFrame()
    events = _explode_tagged(news)
    if events.empty:
        return pd.DataFrame()
    outcomes: list[dict] = []
    for _, e in events.iterrows():
        direction = price_direction(
            prices,
            e["ticker"],
            pd.Timestamp(e["published_at"]).to_pydatetime().replace(tzinfo=None),
            horizon,
        )
        if direction is None or direction == "flat":
            continue
        outcomes.append(
            {
                **e.to_dict(),
                "actual_direction": direction,
                "hit": direction == e["expected_direction"],
                "horizon_hours": horizon,
            }
        )
    return pd.DataFrame(outcomes)


def discover_dependencies(
    min_hit_rate: float | None = None,
    min_samples: int | None = None,
) -> pd.DataFrame:
    """
    Правильная зависимость: в >= min_hit_rate случаев поведение акций
    совпало с ожидаемым направлением сигнала.
    """
    thr = min_hit_rate if min_hit_rate is not None else settings.dependency_min_hit_rate
    n_min = min_samples if min_samples is not None else settings.min_samples_for_rule
    outcomes = build_event_outcomes()
    if outcomes.empty:
        return pd.DataFrame()
    grouped = (
        outcomes.groupby(["signal_key", "ticker", "sentiment", "expected_direction"], as_index=False)
        .agg(
            samples=("hit", "count"),
            hits=("hit", "sum"),
        )
    )
    grouped["hit_rate"] = grouped["hits"] / grouped["samples"]
    grouped["valid"] = (grouped["hit_rate"] >= thr) & (grouped["samples"] >= n_min)
    grouped["threshold"] = thr
    return grouped.sort_values(["valid", "hit_rate", "samples"], ascending=[False, False, False])


def save_dependencies(deps: pd.DataFrame) -> Path:
    out = settings.data_dir / "analysis"
    out.mkdir(parents=True, exist_ok=True)
    path = out / "dependencies.parquet"
    deps.to_parquet(path, index=False)
    valid = deps[deps["valid"]] if not deps.empty else deps
    summary = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "total_rules": int(len(deps)),
        "valid_rules": int(len(valid)),
        "min_hit_rate": settings.dependency_min_hit_rate,
        "min_samples": settings.min_samples_for_rule,
    }
    (out / "dependencies_meta.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    if not valid.empty:
        (out / "valid_rules.json").write_text(
            valid.to_json(orient="records", force_ascii=False, indent=2),
            encoding="utf-8",
        )
    else:
        (out / "valid_rules.json").write_text("[]", encoding="utf-8")
    return path


def load_valid_rules() -> list[dict]:
    path = settings.data_dir / "analysis" / "valid_rules.json"
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))