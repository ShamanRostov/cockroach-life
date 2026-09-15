from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from trader.analysis.dependency import discover_dependencies, load_valid_rules, save_dependencies
from trader.config import BLUE_CHIPS, settings
from trader.data.moex import backfill_blue_chips, load_prices
from trader.data.news import collect_live_news, load_news, merge_and_save_news
from trader.forecast.hourly import generate_hourly_forecast, load_latest_forecast

ROOT = Path(__file__).resolve().parents[3]  # .../Trader
WEB = ROOT / "web"

app = FastAPI(
    title="Trader",
    description="Мониторинг новостей и почасовой прогноз по голубым фишкам ММВБ",
    version="0.1.0",
)
app.mount("/static", StaticFiles(directory=str(WEB / "static")), name="static")
templates = Jinja2Templates(directory=str(WEB / "templates"))


@app.get("/", response_class=HTMLResponse)
def dashboard(request: Request):
    forecast = load_latest_forecast()
    rules = load_valid_rules()
    news = load_news()
    return templates.TemplateResponse(
        request,
        "index.html",
        {
            "forecast": forecast,
            "rules": rules,
            "news_count": int(len(news)) if not news.empty else 0,
            "tickers": BLUE_CHIPS,
            "min_hit_rate": settings.dependency_min_hit_rate,
        },
    )


@app.get("/api/health")
def health():
    return {"ok": True, "service": "trader", "version": "0.1.0"}


@app.get("/api/forecast")
def api_forecast():
    data = load_latest_forecast()
    if not data:
        return JSONResponse({"error": "forecast_not_ready"}, status_code=404)
    return data


@app.post("/api/forecast/run")
def api_forecast_run():
    return generate_hourly_forecast()


@app.get("/api/rules")
def api_rules():
    return {
        "min_hit_rate": settings.dependency_min_hit_rate,
        "valid": load_valid_rules(),
    }


@app.post("/api/pipeline/news")
def api_collect_news():
    fresh = collect_live_news()
    if fresh.empty:
        return {"collected": 0}
    path = merge_and_save_news(fresh)
    return {"collected": int(len(fresh)), "store": str(path)}


@app.post("/api/pipeline/prices")
def api_collect_prices():
    path = backfill_blue_chips()
    prices = load_prices()
    return {"bars": int(len(prices)), "store": str(path)}


@app.post("/api/pipeline/analyze")
def api_analyze():
    deps = discover_dependencies()
    path = save_dependencies(deps)
    valid = deps[deps["valid"]] if not deps.empty else deps
    return {
        "total_rules": int(len(deps)),
        "valid_rules": int(len(valid)),
        "store": str(path),
        "valid": valid.to_dict(orient="records") if not valid.empty else [],
    }


@app.get("/api/tickers")
def api_tickers():
    return BLUE_CHIPS