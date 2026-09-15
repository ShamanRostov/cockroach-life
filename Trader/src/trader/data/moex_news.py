from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Any

import httpx
import pandas as pd

from trader.data.news import _uid, merge_and_save_news

MOEX_NEWS = "https://iss.moex.com/iss/sitenews.json"


def fetch_moex_sitenews(max_pages: int = 40, page_size: int = 50) -> pd.DataFrame:
    """Лента новостей Московской биржи (пагинация ISS)."""
    rows: list[dict[str, Any]] = []
    with httpx.Client(headers={"User-Agent": "Trader/0.1"}, timeout=30.0) as client:
        start = 0
        for _ in range(max_pages):
            r = client.get(
                MOEX_NEWS,
                params={"iss.meta": "off", "start": start, "limit": page_size},
            )
            r.raise_for_status()
            data = (r.json().get("sitenews") or {}).get("data") or []
            if not data:
                break
            for item in data:
                # columns: id, tag, title, published_at, modified_at
                news_id, tag, title, published_at, _modified = item[:5]
                title = str(title or "").replace("&quot;", '"').strip()
                if not title:
                    continue
                try:
                    published = datetime.fromisoformat(str(published_at)).replace(tzinfo=timezone.utc)
                except Exception:  # noqa: BLE001
                    published = datetime.now(timezone.utc)
                rows.append(
                    {
                        "id": _uid("moex", str(news_id), title),
                        "source": "moex",
                        "region": "RU",
                        "title": title,
                        "summary": str(tag or ""),
                        "link": f"https://www.moex.com/n{news_id}",
                        "published_at": published.isoformat(),
                    }
                )
            if len(data) < page_size:
                break
            start += len(data)
            time.sleep(0.2)
    if not rows:
        return pd.DataFrame()
    df = pd.DataFrame(rows)
    df["published_at"] = pd.to_datetime(df["published_at"], utc=True)
    return df.drop_duplicates(subset=["id"]).sort_values("published_at").reset_index(drop=True)


def collect_and_store_moex_news(max_pages: int = 40) -> pd.DataFrame:
    df = fetch_moex_sitenews(max_pages=max_pages)
    if not df.empty:
        merge_and_save_news(df)
    return df
