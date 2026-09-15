from __future__ import annotations

import argparse
from pathlib import Path
import sys

# Allow `python scripts/...` from Trader/
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from apscheduler.schedulers.blocking import BlockingScheduler

from trader.config import settings
from trader.forecast.hourly import generate_hourly_forecast


def main() -> None:
    parser = argparse.ArgumentParser(description="Hourly Trader forecast scheduler")
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run a single forecast and exit",
    )
    args = parser.parse_args()
    if args.once:
        payload = generate_hourly_forecast()
        print(
            f"forecast ok: {len(payload.get('recommendations', []))} recommendations, "
            f"{payload.get('valid_rules', 0)} valid rules"
        )
        return

    scheduler = BlockingScheduler()
    minutes = settings.forecast_interval_minutes

    def job() -> None:
        payload = generate_hourly_forecast()
        print(
            f"[{payload['generated_at']}] recs={len(payload.get('recommendations', []))} "
            f"rules={payload.get('valid_rules', 0)}"
        )

    scheduler.add_job(job, "interval", minutes=minutes, id="hourly_forecast")
    print(f"Scheduler started: every {minutes} minutes")
    job()
    scheduler.start()


if __name__ == "__main__":
    main()