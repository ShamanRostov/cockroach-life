from __future__ import annotations

import re

from trader.config import BEARISH_MARKERS, BLUE_CHIPS, BULLISH_MARKERS

# Секторные якоря применяются только при российском/рыночном контексте
SECTOR_TICKERS: dict[str, list[str]] = {
    "нефть": ["LKOH", "ROSN", "TATN", "SNGS", "GAZP"],
    "oil": ["LKOH", "ROSN", "TATN", "SNGS"],
    "brent": ["LKOH", "ROSN", "TATN", "SNGS"],
    "urals": ["LKOH", "ROSN", "TATN", "SNGS"],
    "газ": ["GAZP", "NVTK"],
    "банк": ["SBER", "VTBR", "T"],
    "золото": ["PLZL"],
    "сталь": ["CHMF", "NLMK", "MAGN"],
    "никель": ["GMKN"],
    "алмаз": ["ALRS"],
}

RU_CONTEXT = [
    "russia",
    "russian",
    "moscow",
    "moex",
    "micex",
    "росси",
    "москв",
    "рубл",
    "ммвб",
    "ммоб",
    "санкц",
    "urals",
    "кремл",
    "цб рф",
    "цб рф",
    "банк россии",
]

# Доп. маркеры движения commodity/рынка
EXTRA_BULLISH = [
    "surge",
    "surges",
    "surged",
    "jump",
    "jumps",
    "jumped",
    "climb",
    "climbs",
    "climbed",
    "rally",
    "rallies",
    "rallied",
    "soar",
    "soars",
    "soared",
    "подорожал",
    "подорожала",
    "подорожали",
]
EXTRA_BEARISH = [
    "tumble",
    "tumbles",
    "tumbled",
    "crash",
    "crashes",
    "crashed",
    "slide",
    "slides",
    "slid",
    "sink",
    "sinks",
    "sank",
    "selloff",
    "sell-off",
    "обвалил",
    "подешевел",
    "подешевела",
    "подешевели",
    "упала",
]

COMMODITY_WORDS = ["oil", "brent", "urals", "нефть", "газ", "gas", "gold", "золото", "nickel", "никель"]


def _contains_marker(text: str, marker: str) -> bool:
    m = re.escape(marker.lower())
    if re.search(r"[а-яё]", marker.lower()):
        if len(marker) <= 4:
            pattern = rf"(?<![а-яёa-z0-9_]){m}(?![а-яёa-z0-9_])"
        else:
            pattern = rf"(?<![а-яёa-z0-9_]){m}[а-яё]{{0,5}}(?![а-яёa-z0-9_])"
    else:
        pattern = rf"(?<!\w){m}(?!\w)"
    return re.search(pattern, text, flags=re.IGNORECASE) is not None


def _has_ru_context(text: str) -> bool:
    low = text.lower()
    return any(k in low for k in RU_CONTEXT)


def detect_tickers(text: str) -> list[str]:
    low = text.lower()
    hit: set[str] = set()
    for ticker, meta in BLUE_CHIPS.items():
        if any(_contains_marker(low, k) for k in meta["keywords"]):
            hit.add(ticker)
    if not hit and _has_ru_context(low):
        for needle, tickers in SECTOR_TICKERS.items():
            if _contains_marker(low, needle):
                hit.update(tickers)
    return sorted(hit)


def _count_markers(text: str, markers: list[str]) -> int:
    return sum(1 for m in markers if _contains_marker(text, m))


def sentiment_label(text: str) -> str:
    low = text.lower()
    bull_m = list(BULLISH_MARKERS) + EXTRA_BULLISH
    bear_m = list(BEARISH_MARKERS) + EXTRA_BEARISH

    # Для commodity-заголовков считаем маркеры рядом с oil/brent — меньше шума "stocks surge"
    if any(_contains_marker(low, w) for w in COMMODITY_WORDS):
        # грубо: берём окно вокруг commodity-слова
        parts = re.split(r"[.!?;]| - ", low)
        commodity_bits = [p for p in parts if any(w in p for w in COMMODITY_WORDS)]
        focus = " ".join(commodity_bits) if commodity_bits else low
        bull = _count_markers(focus, bull_m)
        bear = _count_markers(focus, bear_m)
    else:
        bull = _count_markers(low, bull_m)
        bear = _count_markers(low, bear_m)

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
    # Технический шум биржи / HR — не торговые сигналы
    low = text.lower()
    noise_prefixes = (
        "о порядке",
        "о проведении",
        "о дополнительных условиях",
        "дополнительные условия",
        "информация о коэффициенте",
        "вакансия",
    )
    if low.strip().startswith(noise_prefixes) or "размещении облигаций" in low or "биржевых облигаций" in low:
        return {
            "tickers": [],
            "sentiment": "neutral",
            "expected_direction": None,
            "signal_key": None,
        }
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
