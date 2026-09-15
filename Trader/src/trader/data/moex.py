from __future__ import annotations

import time
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

import httpx
import pandas as pd

from trader.config import BLUE_CHIPS, settings

MOEX_CANDLES = (
    "https://iss.moex.com/iss/engines/stock/markets/shares/"
    "boards/TQBR/securities/{ticker}/candles.json"
)


def _candles_page(
    client: httpx.Client,
    ticker: str,
    start: date,
    end: date,
    interval: int,
    start_row: int,
) -> list[list[Any]]:
    url = MOEX_CANDLES.format(ticker=ticker)
    params = {
        "from": start.isoformat(),
        "till": end.isoformat(),
        "interval": interval,
        "iss.meta": "off",
        "iss.only": "candles",
        "start": start_row,
    }
    r = client.get(url, params=params, timeout=30.0)
    r.raise_for_status()
    payload = r.json()
    return payload.get("candles", {}).get("data") or []


def fetch_candles(
    ticker: str,
    start: date,
    end: date,
    interval: int = 60,
) -> pd.DataFrame:
    """Загрузка свечей TQBR с пагинацией ISS MOEX."""
    rows: list[list[Any]] = []
    columns = ["open", "close", "high", "low", "value", "volume", "begin", "end"]
    with httpx.Client(headers={"User-Agent": "Trader/0.1"}) as client:
        start_row = 0
        while True:
            chunk = _candles_page(client, ticker, start, end, interval, start_row)
            if not chunk:
                break
            rows.extend(chunk)
            if len(chunk) < 500:
                break
            start_row += len(chunk)
            time.sleep(0.15)
    if not rows:
        return pd.DataFrame(columns=[*columns, "ticker"])
    df = pd.DataFrame(rows, columns=columns)
    df["ticker"] = ticker
    df["begin"] = pd.to_datetime(df["begin"])
    df["end"] = pd.to_datetime(df["end"])
    for col in ("open", "close", "high", "low", "value", "volume"):
        df[col] = pd.to_numeric(df[col], errors="coerce")
    return df.sort_values("begin").drop_duplicates(subset=["begin"]).reset_index(drop=True)


def backfill_blue_chips(
    lookback_days: int | None = None,
    interval: int = 60,
) -> Path:
    """Сохранить ~6 месяцев часовых свечей по голубым фишкам."""
    days = lookback_days or settings.lookback_days
    end = date.today()
    start = end - timedelta(days=days)
    out_dir = settings.data_dir / "prices"
    out_dir.mkdir(parents=True, exist_ok=True)
    frames: list[pd.DataFrame] = []
    for ticker in BLUE_CHIPS:
        try:
            df = fetch_candles(ticker, start, end, interval=interval)
            if df.empty:
                continue
            path = out_dir / f"{ticker}.parquet"
            df.to_parquet(path, index=False)
            frames.append(df)
            print(f"[moex] {ticker}: {len(df)} bars")
        except Exception as exc:  # noqa: BLE001 — сбор продолжаем по тикерам
            print(f"[moex] {ticker} FAILED: {exc}")
        time.sleep(0.2)
    if frames:
        all_df = pd.concat(frames, ignore_index=True)
        all_path = out_dir / "all_blue_chips.parquet"
        all_df.to_parquet(all_path, index=False)
        return all_path
    raise RuntimeError("Не удалось загрузить ни одной свечи MOEX")


def load_prices(ticker: str | None = None) -> pd.DataFrame:
    out_dir = settings.data_dir / "prices"
    if ticker:
        path = out_dir / f"{ticker}.parquet"
        if not path.exists():
            return pd.DataFrame()
        return pd.read_parquet(path)
    all_path = out_dir / "all_blue_chips.parquet"
    if all_path.exists():
        return pd.read_parquet(all_path)
    parts = list(out_dir.glob("*.parquet"))
    if not parts:
        return pd.DataFrame()
    return pd.concat([pd.read_parquet(p) for p in parts if p.name != "all_blue_chips.parquet"], ignore_index=True)


def price_direction(
    prices: pd.DataFrame,
    ticker: str,
    at: datetime,
    horizon_hours: int,
) -> str | None:
    """Направление close→close через horizon_hours: up / down / flat.

    Если новость пришла вне сессии, якоримся к ближайшему следующему бару
    и к первому бару не раньше чем через horizon_hours после якоря.
    """
    tdf = prices[prices["ticker"] == ticker].sort_values("begin")
    if tdf.empty:
        return None
    # Свечи MOEX без таймзоны (МСК); новости часто UTC — сравниваем naive.
    at_ts = pd.Timestamp(at)
    if at_ts.tzinfo is not None:
        at_ts = at_ts.tz_convert("Europe/Moscow").tz_localize(None)
    begins = pd.to_datetime(tdf["begin"])
    base = tdf[begins <= at_ts].tail(1)
    if base.empty:
        base = tdf[begins >= at_ts].head(1)
    if base.empty:
        return None
    base_ts = pd.Timestamp(base.iloc[0]["begin"])
    target_ts = max(at_ts, base_ts) + pd.Timedelta(hours=horizon_hours)
    future = tdf[begins >= target_ts].head(1)
    if future.empty:
        return None
    c0 = float(base.iloc[0]["close"])
    c1 = float(future.iloc[0]["close"])
    if c0 == 0:
        return None
    chg = (c1 - c0) / c0
    thr = float(settings.min_move_pct)
    if chg > thr:
        return "up"
    if chg < -thr:
        return "down"
    return "flat"