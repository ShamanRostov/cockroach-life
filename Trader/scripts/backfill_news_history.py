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
        "--mode",
        choices=["sectors", "tickers"],
        default="sectors",
        help="sectors = broad coverage (default); tickers = per-ticker queries",
    )
    parser.add_argument(
        "--tickers",
        type=str,
        default="SBER,GAZP,LKOH,ROSN,NVTK,GMKN,VTBR,MOEX,TATN,SNGS,YDEX,PLZL",
        help="Comma-separated tickers (only for --mode tickers)",
    )
    parser.add_argument("--pause", type=float, default=6.0, help="Pause between GDELT requests")
    args = parser.parse_args()
    tickers = [t.strip().upper() for t in args.tickers.split(",") if t.strip()]
    df = backfill_news_history(
        lookback_days=args.days,
        week_step=args.step,
        tickers=tickers,
        mode=args.mode,
        pause_sec=args.pause,
    )
    print(f"stored historical news rows this run: {len(df)}")


if __name__ == "__main__":
    main()
