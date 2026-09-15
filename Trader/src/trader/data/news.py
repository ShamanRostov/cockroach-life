from __future__ import annotations

import hashlib
import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import feedparser
import httpx
import pandas as pd

from trader.config import NEWS_FEEDS, settings


def _uid(source: str, link: str, title: str) -> str:
    raw = f"{source}|{link}|{title}".encode()
    return hashlib.sha1(raw).hexdigest()


def _parse_entry(source: str, region: str, entry: Any) -> dict[str, Any] | None:
    title = (getattr(entry, "title", None) or "").strip()
    if not title:
        return None
    link = (getattr(entry, "link", None) or "").strip()
    summary = (getattr(entry, "summary", None) or getattr(entry, "description", None) or "").strip()
    published = None
    if getattr(entry, "published_parsed", None):
        published = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
    elif getattr(entry, "updated_parsed", None):
        published = datetime(*entry.updated_parsed[:6], tzinfo=timezone.utc)
    else:
        published = datetime.now(timezone.utc)
    return {
        "id": _uid(source, link, title),
        "source": source,
        "region": region,
        "title": title,
        "summary": summary,
        "link": link,
        "published_at": published.isoformat(),
    }


def fetch_feed(feed: dict[str, str], timeout: float = 20.0) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    try:
        with httpx.Client(
            headers={"User-Agent": "Trader/0.1 (news monitor)"},
            follow_redirects=True,
            timeout=timeout,
        ) as client:
            r = client.get(feed["url"])
            r.raise_for_status()
            parsed = feedparser.parse(r.text)
    except Exception as exc:  # noqa: BLE001
        print(f"[news] {feed['id']} FAILED: {exc}")
        return items
    for entry in parsed.entries:
        row = _parse_entry(feed["id"], feed["region"], entry)
        if row:
            items.append(row)
    return items


def collect_live_news() -> pd.DataFrame:
    """Сбор свежих RSS (РФ + зарубежье)."""
    rows: list[dict[str, Any]] = []
    for feed in NEWS_FEEDS:
        chunk = fetch_feed(feed)
        print(f"[news] {feed['id']}: {len(chunk)}")
        rows.extend(chunk)
        time.sleep(0.3)
    if not rows:
        return pd.DataFrame()
    df = pd.DataFrame(rows)
    df["published_at"] = pd.to_datetime(df["published_at"], utc=True)
    df = df.drop_duplicates(subset=["id"]).sort_values("published_at")
    return df.reset_index(drop=True)


def news_store_path() -> Path:
    path = settings.data_dir / "news"
    path.mkdir(parents=True, exist_ok=True)
    return path / "news.parquet"


def merge_and_save_news(fresh: pd.DataFrame) -> Path:
    path = news_store_path()
    if path.exists() and not fresh.empty:
        old = pd.read_parquet(path)
        old["published_at"] = pd.to_datetime(old["published_at"], utc=True)
        df = pd.concat([old, fresh], ignore_index=True)
    elif path.exists():
        return path
    else:
        df = fresh
    if df.empty:
        raise RuntimeError("Нет новостей для сохранения")
    df = df.drop_duplicates(subset=["id"]).sort_values("published_at").reset_index(drop=True)
    df.to_parquet(path, index=False)
    meta = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "count": int(len(df)),
        "sources": sorted(df["source"].unique().tolist()),
    }
    (path.parent / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    return path


def load_news() -> pd.DataFrame:
    path = news_store_path()
    if not path.exists():
        return pd.DataFrame()
    df = pd.read_parquet(path)
    df["published_at"] = pd.to_datetime(df["published_at"], utc=True)
    return df