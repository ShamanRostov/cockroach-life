from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


# Голубые фишки TQBR + ключевые слова для привязки новостей
BLUE_CHIPS: dict[str, dict] = {
    "SBER": {
        "name": "Сбербанк",
        "keywords": ["сбербанк", "сбер", "sberbank", "sber"],
    },
    "GAZP": {
        "name": "Газпром",
        "keywords": ["газпром", "gazprom"],
    },
    "LKOH": {
        "name": "Лукойл",
        "keywords": ["лукойл", "lukoil"],
    },
    "GMKN": {
        "name": "Норникель",
        "keywords": ["норникель", "норильский никель", "nornickel", "norilsk"],
    },
    "NVTK": {
        "name": "Новатэк",
        "keywords": ["новатэк", "novatek"],
    },
    "ROSN": {
        "name": "Роснефть",
        "keywords": ["роснефть", "rosneft"],
    },
    "MGNT": {
        "name": "Магнит",
        "keywords": ["магнит", "magnit"],
    },
    "VTBR": {
        "name": "ВТБ",
        "keywords": ["втб", "vtb"],
    },
    "TATN": {
        "name": "Татнефть",
        "keywords": ["татнефть", "tatneft"],
    },
    "PLZL": {
        "name": "Полюс",
        "keywords": ["полюс", "polyus"],
    },
    "MTSS": {
        "name": "МТС",
        "keywords": ["мтс", "mts"],
    },
    "ALRS": {
        "name": "АЛРОСА",
        "keywords": ["алроса", "alrosa"],
    },
    "CHMF": {
        "name": "Северсталь",
        "keywords": ["северсталь", "severstal"],
    },
    "NLMK": {
        "name": "НЛМК",
        "keywords": ["нлмк", "nlmk"],
    },
    "MOEX": {
        "name": "Московская биржа",
        "keywords": ["московская биржа", "ммвб", "moex", "micex"],
    },
    "YDEX": {
        "name": "Яндекс",
        "keywords": ["яндекс", "yandex"],
    },
    "T": {
        "name": "Т-Технологии",
        "keywords": ["тинькофф", "т-банк", "tinkoff", "t-bank"],
    },
    "SNGS": {
        "name": "Сургутнефтегаз",
        "keywords": ["сургутнефтегаз", "surgutneftegaz"],
    },
    "IRAO": {
        "name": "Интер РАО",
        "keywords": ["интер рао", "inter rao"],
    },
    "MAGN": {
        "name": "ММК",
        "keywords": ["ммк", "магнитогорский", "mmk"],
    },
}

# RSS: РФ + зарубежье
NEWS_FEEDS: list[dict[str, str]] = [
    {"id": "interfax", "region": "RU", "url": "https://www.interfax.ru/rss.asp"},
    {"id": "kommersant", "region": "RU", "url": "https://www.kommersant.ru/RSS/news.xml"},
    {"id": "vedomosti", "region": "RU", "url": "https://www.vedomosti.ru/rss/news"},
    {
        "id": "rbc",
        "region": "RU",
        "url": "https://rssexport.rbc.ru/rbcnews/news/30/full.rss",
    },
    {
        "id": "bbc_business",
        "region": "INTL",
        "url": "https://feeds.bbci.co.uk/news/business/rss.xml",
    },
    {
        "id": "google_moex",
        "region": "MIX",
        "url": (
            "https://news.google.com/rss/search?"
            "q=MOEX+OR+%D0%9C%D0%9C%D0%92%D0%91+OR+%D0%B0%D0%BA%D1%86%D0%B8%D0%B8"
            "&hl=ru&gl=RU&ceid=RU:ru"
        ),
    },
    {
        "id": "google_oil",
        "region": "INTL",
        "url": (
            "https://news.google.com/rss/search?"
            "q=oil+OR+brent+OR+%D0%BD%D0%B5%D1%84%D1%82%D1%8C&hl=en&gl=US&ceid=US:en"
        ),
    },
]

# Сигналы тональности (простые словари; расширяются по мере бэктеста)
BULLISH_MARKERS = [
    "рост",
    "роста",
    "росту",
    "ростом",
    "вырос",
    "выросла",
    "выросли",
    "растет",
    "растёт",
    "прибыль",
    "дивиденд",
    "рекорд",
    "увеличение",
    "укреплени",
    "позитив",
    "превысил",
    "выше",
    "подорожа",
    "удорожание",
    "upgrade",
    "beat",
    "rally",
    "surge",
    "soar",
    "gain",
    "rises",
    "rose",
    "higher",
    "санкции сняты",
    "ослабление санкций",
    "buyback",
    "обратный выкуп",
    "сделка",
    "инвестиц",
    "максимум",
    "максимумы",
    "потенциал",
    "рекоменд",
    "прогноз по цене",
]
BEARISH_MARKERS = [
    "падение",
    "падения",
    "падению",
    "упал",
    "упала",
    "упали",
    "снижени",
    "снижение",
    "снижения",
    "обвал",
    "обвала",
    "убыток",
    "штраф",
    "санкци",
    "риски",
    "угроз",
    "downgrade",
    "miss",
    "crash",
    "plunge",
    "fall",
    "falls",
    "fell",
    "lower",
    "slump",
    "арест",
    "расследован",
    "дефолт",
    "банкрот",
    "банкротства",
    "война",
    "атака",
    "запрет",
    "минимум",
    "минимумы",
    "распродаж",
]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    dependency_min_hit_rate: float = 0.70
    reaction_horizon_hours: int = 4
    forecast_interval_minutes: int = 60
    data_dir: Path = Path("./data")
    host: str = "0.0.0.0"
    port: int = 8787
    lookback_days: int = 182  # ~6 месяцев
    # После расширения архива новостей требуем более устойчивую выборку
    min_samples_for_rule: int = 5  # целевое ≥8–10 после добора архива; сейчас 5 для первых правил
    # Минимальное |Δprice| чтобы считать движение не «плоским шумом»
    min_move_pct: float = 0.002
    # Wilson lower — для метки strong_valid; базовый valid по hit_rate + samples
    use_wilson_lower_bound: bool = False
    wilson_for_strong: bool = True


settings = Settings()
settings.data_dir.mkdir(parents=True, exist_ok=True)