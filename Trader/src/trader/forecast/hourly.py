from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from trader.analysis.dependency import load_valid_rules
from trader.analysis.sentiment import tag_news_row
from trader.config import BLUE_CHIPS, settings
from trader.data.news import collect_live_news, load_news, merge_and_save_news


def _position_side(expected_direction: str) -> str:
    return "long" if expected_direction == "up" else "short"


def generate_hourly_forecast(*, refresh_news: bool = True) -> dict:
    """
    Онлайн-прогноз: свежие новости → только сигналы по зависимостям
    с hit_rate >= 70% (valid rules).
    """
    if refresh_news:
        fresh = collect_live_news()
        if not fresh.empty:
            merge_and_save_news(fresh)

    news = load_news()
    if news.empty:
        return _empty_forecast("Нет новостей")

    cutoff = pd.Timestamp.now(tz="UTC") - pd.Timedelta(hours=2)
    recent = news[news["published_at"] >= cutoff].copy()
    if recent.empty:
        recent = news.tail(40).copy()

    rules = {r["signal_key"]: r for r in load_valid_rules()}
    recommendations: list[dict] = []
    seen: set[str] = set()

    for _, n in recent.iterrows():
        tags = tag_news_row(str(n.get("title", "")), str(n.get("summary", "")))
        if not tags["tickers"] or not tags["expected_direction"]:
            continue
        for ticker in tags["tickers"]:
            key = f"{ticker}|{tags['sentiment']}"
            rule = rules.get(key)
            if not rule:
                continue
            dedupe = f"{ticker}|{tags['expected_direction']}"
            if dedupe in seen:
                continue
            seen.add(dedupe)
            sample_count = int(rule.get("samples", rule.get("samples", 0)))
            hit_rate = float(rule["hit_rate"])
            recommendations.append(
                {
                    "ticker": ticker,
                    "name": BLUE_CHIPS.get(ticker, {}).get("name", ticker),
                    "side": _position_side(tags["expected_direction"]),
                    "expected_direction": tags["expected_direction"],
                    "sentiment": tags["sentiment"],
                    "hit_rate": round(hit_rate, 4),
                    "samples": sample_count,
                    "threshold_met": True,
                    "news_title": n.get("title"),
                    "news_source": n.get("source"),
                    "news_link": n.get("link"),
                    "news_published_at": str(n.get("published_at")),
                    "rationale": (
                        f"Сигнал {key}: исторически направление совпало "
                        f"в {hit_rate * 100:.1f}% из {sample_count} случаев "
                        f"(порог {settings.dependency_min_hit_rate * 100:.0f}%)."
                    ),
                }
            )

    # Один тикер — одна сторона: лучший hit_rate, затем большая выборка
    best: dict[str, dict] = {}
    for rec in recommendations:
        prev = best.get(rec["ticker"])
        if prev is None or (rec["hit_rate"], rec["samples"]) > (prev["hit_rate"], prev["samples"]):
            best[rec["ticker"]] = rec
    recommendations = sorted(best.values(), key=lambda x: (-x["hit_rate"], -x["samples"]))

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "horizon_hours": settings.reaction_horizon_hours,
        "min_hit_rate": settings.dependency_min_hit_rate,
        "valid_rules": len(rules),
        "news_considered": int(len(recent)),
        "recommendations": recommendations,
        "disclaimer": (
            "Не является индивидуальной инвестиционной рекомендацией. "
            "Прогноз исследовательский: только сигналы с подтверждённой "
            f"зависимостью ≥{settings.dependency_min_hit_rate * 100:.0f}% на истории."
        ),
    }
    _save_forecast(payload)
    return payload


def _empty_forecast(reason: str) -> dict:
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "horizon_hours": settings.reaction_horizon_hours,
        "min_hit_rate": settings.dependency_min_hit_rate,
        "valid_rules": len(load_valid_rules()),
        "news_considered": 0,
        "recommendations": [],
        "reason": reason,
        "disclaimer": "Не является индивидуальной инвестиционной рекомендацией.",
    }
    _save_forecast(payload)
    return payload


def _save_forecast(payload: dict) -> Path:
    out = settings.data_dir / "forecasts"
    out.mkdir(parents=True, exist_ok=True)
    latest = out / "latest.json"
    latest.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    (out / f"forecast_{stamp}.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return latest


def load_latest_forecast() -> dict | None:
    path = settings.data_dir / "forecasts" / "latest.json"
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))
