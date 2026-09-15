from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from trader.analysis.dependency import discover_dependencies, save_dependencies
from trader.data.moex import backfill_blue_chips
from trader.data.news import collect_live_news, merge_and_save_news
from trader.forecast.hourly import generate_hourly_forecast


def main() -> None:
    parser = argparse.ArgumentParser(description="Trader bootstrap pipeline")
    parser.add_argument("--skip-prices", action="store_true")
    parser.add_argument("--skip-news", action="store_true")
    parser.add_argument("--skip-analyze", action="store_true")
    parser.add_argument("--skip-forecast", action="store_true")
    args = parser.parse_args()

    if not args.skip_prices:
        print("=== MOEX prices (≈6 months) ===")
        backfill_blue_chips()

    if not args.skip_news:
        print("=== Live news RSS ===")
        fresh = collect_live_news()
        if not fresh.empty:
            merge_and_save_news(fresh)
            print(f"news stored: {len(fresh)}")
        else:
            print("news: empty")

    if not args.skip_analyze:
        print("=== Dependency discovery (≥70%) ===")
        deps = discover_dependencies()
        save_dependencies(deps)
        if deps.empty:
            print("No overlapping news×price events yet.")
            print(
                "Hint: live RSS covers recent headlines; keep collecting news while "
                "prices already span ~6 months. Re-run analyze as the news archive grows."
            )
        else:
            valid = deps[deps["valid"]]
            print(f"rules={len(deps)} valid={len(valid)}")
            if not valid.empty:
                print(valid[["signal_key", "hit_rate", "samples"]].to_string(index=False))

    if not args.skip_forecast:
        print("=== Hourly forecast ===")
        payload = generate_hourly_forecast()
        print(f"recommendations={len(payload.get('recommendations', []))}")


if __name__ == "__main__":
    main()