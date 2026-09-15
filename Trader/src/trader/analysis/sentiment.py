from __future__ import annotations

import re

from trader.config import BEARISH_MARKERS, BLUE_CHIPS, BULLISH_MARKERS

# Секторные якоря: новость без имени эмитента, но с темой сектора
SECTOR_TICKERS: dict[str, list[str]] = {
    "нефть": ["LKOH", "ROSN", "TATN", "SNGS", "GAZP"],
    "oil": ["LKOH", "ROSN", "TATN", "SNGS"],
    "brent": ["LKOH", "ROSN", "TATN", "SNGS"],
    "газ": ["GAZP", "NVTK"],
    "gas": ["GAZP", "NVTK"],
    "банк": ["SBER", "VTBR", "T"],
    "bank": ["SBER", "VTBR", "T"],
    "золото": ["PLZL"],
    "gold": ["PLZL"],
    "сталь": ["CHMF", "NLMK", "MAGN"],
    "steel": ["CHMF", "NLMK", "MAGN"],
    "никель": ["GMKN"],
    "nickel": ["GMKN"],
    "алмаз": ["ALRS"],
    "diamond": ["ALRS"],
}


def _contains_marker(text: str, marker: str) -> bool:
    """
    Маркер как отдельное слово/фраза.
    Короткие корни (≤4 букв) — только точное слово (рост ≠ Ростов).
    Длинные — допускаем 1–3 буквы окончания (превысил/превысила).
    """
    m = re.escape(marker.lower())
    if re.search(r"[а-яё]", marker.lower()):
        if len(marker) <= 4:
            pattern = rf"(?<![а-яёa-z0-9_]){m}(?![а-яёa-z0-9_])"
        else:
            pattern = rf"(?<![а-яёa-z0-9_]){m}[а-яё]{{0,3}}(?![а-яёa-z0-9_])"
    else:
        pattern = rf"(?<!\w){m}(?!\w)"
    return re.search(pattern, text, flags=re.IGNORECASE) is not None


def detect_tickers(text: str) -> list[str]:
    low = text.lower()
    hit: set[str] = set()
    for ticker, meta in BLUE_CHIPS.items():
        if any(_contains_marker(low, k) for k in meta["keywords"]):
            hit.add(ticker)
    if not hit:
        for needle, tickers in SECTOR_TICKERS.items():
            if _contains_marker(low, needle):
                hit.update(tickers)
    return sorted(hit)


def sentiment_label(text: str) -> str:
    low = text.lower()
    bull = sum(1 for m in BULLISH_MARKERS if _contains_marker(low, m))
    bear = sum(1 for m in BEARISH_MARKERS if _contains_marker(low, m))
    if bull > bear and bull > 0:
        return "bullish"
    if bear > bull and bear > 0:
        return "bearish"
    if bull == bear and bull > 0:
        return "mixed"
    return "neutral"


def expected_direction(sentiment: str) -> str | None:
    if sentiment == "bullish":
        return "up"
    if sentiment == "bearish":
        return "down"
    return None


def tag_news_row(title: str, summary: str = "") -> dict:
    text = f"{title} {summary}"
    tickers = detect_tickers(text)
    sentiment = sentiment_label(text)
    return {
        "tickers": tickers,
        "sentiment": sentiment,
        "expected_direction": expected_direction(sentiment),
        "signal_key": (
            f"{','.join(tickers) or 'MARKET'}|{sentiment}"
            if tickers or sentiment != "neutral"
            else None
        ),
    }
