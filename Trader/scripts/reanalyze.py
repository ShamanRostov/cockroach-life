from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from trader.analysis.dependency import discover_dependencies, save_dependencies
from trader.data.news import collect_live_news, load_news, merge_and_save_news
from trader.forecast.hourly import generate_hourly_forecast


def main() -> None:
    parser = argparse.ArgumentParser(description="Re-analyze dependencies and refresh forecast")
    parser.add_argument("--refresh-rss", action="store_true", help="Pull live RSS before analyze")
    parser.add_argument("--min-samples", type=int, default=None)
    parser.add_argument("--min-hit-rate", type=float, default=None)
    args = parser.parse_args()

    if args.refresh_rss:
        fresh = collect_live_news()
        if not fresh.empty:
            merge_and_save_news(fresh)
            print(f"rss collected: {len(fresh)}")

    news = load_news()
    print(f"news archive: {len(news)}")

    deps = discover_dependencies(min_hit_rate=args.min_hit_rate, min_samples=args.min_samples)
    save_dependencies(deps)
    if deps.empty:
        print("no dependency rules yet")
        return

    valid = deps[deps["valid"]]
    print(f"rules={len(deps)} valid={len(valid)}")
    cols = [c for c in ["signal_key", "hit_rate", "wilson_lower", "samples", "valid"] if c in deps.columns]
    print(deps[cols].head(25).to_string(index=False))

    coverage_path = Path("data/analysis/ticker_coverage.json")
    if coverage_path.exists():
        print(f"coverage: {coverage_path}")

    forecast = generate_hourly_forecast(refresh_news=False)
    print(f"forecast recommendations: {len(forecast.get('recommendations', []))}")


if __name__ == "__main__":
    main()
