from __future__ import annotations

import time
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
import pandas as pd

from trader.config import BLUE_CHIPS
from trader.data.news import _uid, merge_and_save_news

GDELT_DOC = "https://api.gdeltproject.org/api/v2/doc/doc"


def _fmt(dt: datetime) -> str:
    return dt.strftime("%Y%m%d%H%M%S")


def fetch_gdelt_window(
    query: str,
    start: datetime,
    end: datetime,
    maxrecords: int = 50,
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
        timeout=45.0,
        follow_redirects=True,
    ) as client:
        r = client.get(GDELT_DOC, params=params)
        if r.status_code == 429:
            time.sleep(8)
            r = client.get(GDELT_DOC, params=params)
        if r.status_code != 200:
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
                "summary": a.get("seendate") or "",
                "link": url,
                "published_at": published.isoformat(),
            }
        )
    return rows


def backfill_news_history(
    lookback_days: int = 182,
    week_step: int = 14,
    tickers: list[str] | None = None,
) -> pd.DataFrame:
    """
    Архив новостей ~6 месяцев через GDELT (с паузами из‑за rate limit).
    Нужен для поиска зависимостей на той же глубине, что и цены.
    """
    selected = tickers or list(BLUE_CHIPS.keys())[:8]
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=lookback_days)
    all_rows: list[dict[str, Any]] = []

    cursor = start
    while cursor < end:
        window_end = min(cursor + timedelta(days=week_step), end)
        for ticker in selected:
            name = BLUE_CHIPS[ticker]["name"]
            # RU + EN ключи
            keys = BLUE_CHIPS[ticker]["keywords"][:2]
            query = " OR ".join([f'"{k}"' if " " in k else k for k in keys])
            print(f"[gdelt] {ticker} {cursor.date()}→{window_end.date()} ({name})", flush=True)
            rows = fetch_gdelt_window(query, cursor, window_end)
            print(f"  -> {len(rows)}", flush=True)
            all_rows.extend(rows)
            time.sleep(5.5)  # GDELT: не чаще ~1 запроса / 5 сек
        cursor = window_end

    if not all_rows:
        return pd.DataFrame()
    df = pd.DataFrame(all_rows)
    df["published_at"] = pd.to_datetime(df["published_at"], utc=True)
    df = df.drop_duplicates(subset=["id"]).sort_values("published_at").reset_index(drop=True)
    merge_and_save_news(df)
    return df