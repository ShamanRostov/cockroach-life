from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from trader.data.gdelt import backfill_news_history


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill ~6 months news via GDELT")
    parser.add_argument("--days", type=int, default=182)
    parser.add_argument("--step", type=int, default=14, help="Window size in days")
    parser.add_argument(
        "--tickers",
        type=str,
        default="SBER,GAZP,LKOH,ROSN,NVTK,GMKN,VTBR,MOEX",
        help="Comma-separated tickers",
    )
    args = parser.parse_args()
    tickers = [t.strip().upper() for t in args.tickers.split(",") if t.strip()]
    df = backfill_news_history(lookback_days=args.days, week_step=args.step, tickers=tickers)
    print(f"stored historical news rows this run: {len(df)}")


if __name__ == "__main__":
    main()