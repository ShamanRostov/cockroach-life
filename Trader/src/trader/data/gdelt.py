from __future__ import annotations

import time
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
import pandas as pd

from trader.config import BLUE_CHIPS
from trader.data.news import merge_and_save_news, _uid

GDELT_DOC = "https://api.gdeltproject.org/api/v2/doc/doc"

# Секторные запросы: меньше HTTP, шире покрытие по голубым фишкам
_LANG = "(sourcelang:english OR sourcelang:russian)"

SECTOR_QUERIES: list[dict[str, str]] = [
    {
        "id": "oil_gas",
        "query": (
            f'{_LANG} (Russia OR Russian OR Moscow OR MOEX) '
            f'(Lukoil OR Rosneft OR Gazprom OR Novatek OR Tatneft OR Surgutneftegaz '
            f'OR Brent OR Urals OR "oil prices" OR "Газпром" OR "Роснефть" OR "Лукойл" OR "нефть")'
        ),
    },
    {
        "id": "banks",
        "query": (
            f'{_LANG} (Russia OR Russian OR Moscow) '
            f'(Sberbank OR VTB OR Tinkoff OR "Сбербанк" OR "ВТБ" OR "Т-Банк" '
            f'OR "key rate" OR "ключевая ставка" OR CBR)'
        ),
    },
    {
        "id": "metals_mining",
        "query": (
            f'{_LANG} (Russia OR Russian OR Moscow) '
            f'(Nornickel OR Norilsk OR Severstal OR NLMK OR Polyus OR Alrosa '
            f'OR "Норникель" OR "Северсталь" OR "Полюс" OR "АЛРОСА")'
        ),
    },
    {
        "id": "tech_retail_market",
        "query": (
            f'{_LANG} (Russia OR Russian OR Moscow OR MOEX) '
            f'(Yandex OR Magnit OR "MTS Russia" OR MOEX OR "Московская биржа" OR "Яндекс" '
            f'OR "Магнит" OR "Inter RAO" OR "российский рынок акций")'
        ),
    },
    {
        "id": "sanctions_macro",
        "query": (
            f'{_LANG} ("Russia sanctions" OR "санкции против России" OR "рубль" '
            f'OR "российский рынок" OR "MOEX" OR "ЦБ РФ")'
        ),
    },
]


def _fmt(dt: datetime) -> str:
    return dt.strftime("%Y%m%d%H%M%S")


def fetch_gdelt_window(
    query: str,
    start: datetime,
    end: datetime,
    maxrecords: int = 75,
) -> list[dict[str, Any]]:
    params = {
        "query": query,
        "mode": "ArtList",
        "maxrecords": str(maxrecords),
        "format": "json",
        "startdatetime": _fmt(start),
        "enddatetime": _fmt(end),
        "sort": "DateDesc",
    }
    with httpx.Client(
        headers={"User-Agent": "Trader/0.1 research"},
        timeout=60.0,
        follow_redirects=True,
    ) as client:
        r = client.get(GDELT_DOC, params=params)
        if r.status_code == 429:
            print("  rate-limit, sleep 15s", flush=True)
            time.sleep(15)
            r = client.get(GDELT_DOC, params=params)
        if r.status_code == 429:
            print("  rate-limit again, sleep 30s", flush=True)
            time.sleep(30)
            r = client.get(GDELT_DOC, params=params)
        if r.status_code != 200:
            print(f"  HTTP {r.status_code}", flush=True)
            return []
        try:
            payload = r.json()
        except Exception:  # noqa: BLE001
            return []
    arts = payload.get("articles") or []
    rows: list[dict[str, Any]] = []
    for a in arts:
        title = (a.get("title") or "").strip()
        url = (a.get("url") or "").strip()
        if not title:
            continue
        seen = a.get("seendate") or a.get("date") or ""
        try:
            published = datetime.strptime(seen[:14], "%Y%m%d%H%M%S").replace(tzinfo=timezone.utc)
        except Exception:  # noqa: BLE001
            published = datetime.now(timezone.utc)
        rows.append(
            {
                "id": _uid("gdelt", url, title),
                "source": "gdelt",
                "region": "MIX",
                "title": title,
                "summary": a.get("sourcecountry") or a.get("language") or "",
                "link": url,
                "published_at": published.isoformat(),
            }
        )
    return rows


def backfill_news_history(
    lookback_days: int = 182,
    week_step: int = 14,
    tickers: list[str] | None = None,
    mode: str = "sectors",
    pause_sec: float = 6.0,
) -> pd.DataFrame:
    """
    Архив новостей ~6 месяцев через GDELT.

    mode=sectors — широкие секторные запросы (рекомендуется: быстрее и плотнее).
    mode=tickers — по тикерам (точнее, но медленнее из‑за rate limit).
    """
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=lookback_days)
    all_rows: list[dict[str, Any]] = []

    if mode == "tickers":
        selected = tickers or list(BLUE_CHIPS.keys())
        jobs = []
        for ticker in selected:
            keys = BLUE_CHIPS[ticker]["keywords"][:2]
            query = " OR ".join([f'"{k}"' if " " in k else k for k in keys])
            jobs.append((ticker, query))
    else:
        jobs = [(s["id"], s["query"]) for s in SECTOR_QUERIES]

    cursor = start
    while cursor < end:
        window_end = min(cursor + timedelta(days=week_step), end)
        for job_id, query in jobs:
            print(f"[gdelt] {job_id} {cursor.date()}→{window_end.date()}", flush=True)
            rows = fetch_gdelt_window(query, cursor, window_end)
            print(f"  -> {len(rows)}", flush=True)
            all_rows.extend(rows)
            time.sleep(pause_sec)
        cursor = window_end
        # промежуточное сохранение, чтобы не потерять прогресс
        if all_rows:
            chunk = pd.DataFrame(all_rows)
            chunk["published_at"] = pd.to_datetime(chunk["published_at"], utc=True)
            chunk = chunk.drop_duplicates(subset=["id"])
            merge_and_save_news(chunk)
            all_rows = chunk.to_dict(orient="records")

    if not all_rows:
        return pd.DataFrame()
    df = pd.DataFrame(all_rows)
    df["published_at"] = pd.to_datetime(df["published_at"], utc=True)
    df = df.drop_duplicates(subset=["id"]).sort_values("published_at").reset_index(drop=True)
    merge_and_save_news(df)
    return df
