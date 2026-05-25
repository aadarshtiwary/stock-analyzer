import asyncio
import logging
from typing import List, Dict
from services.stock_data import StockDataService
from services.scoring import ScoringEngine
from data.nse_universe import SECTOR_STOCKS

logger = logging.getLogger(__name__)

data_service = StockDataService()
scoring_engine = ScoringEngine()


async def build_sector_heatmap() -> List[dict]:
    """Build sector-level heatmap with avg score and price change."""
    results = []

    for sector, tickers in SECTOR_STOCKS.items():
        # Fetch a subset (2-3 stocks per sector for speed)
        sample = tickers[:3]
        sector_data = await asyncio.gather(
            *[_fetch_safe(t) for t in sample], return_exceptions=True
        )
        valid = [d for d in sector_data if isinstance(d, dict)]

        if not valid:
            continue

        avg_score = sum(d["score"] for d in valid) / len(valid)
        avg_change = sum(d.get("change_pct", 0) or 0 for d in valid) / len(valid)
        avg_pe = sum(d.get("pe", 0) or 0 for d in valid) / len(valid)

        results.append({
            "sector": sector,
            "avg_score": round(avg_score, 1),
            "avg_change_pct": round(avg_change, 2),
            "avg_pe": round(avg_pe, 1) if avg_pe > 0 else None,
            "stocks_analyzed": len(valid),
            "top_stock": valid[0]["ticker"] if valid else None,
            "sentiment": "Bullish" if avg_change > 0.5 else "Bearish" if avg_change < -0.5 else "Neutral",
        })

    return sorted(results, key=lambda x: -x["avg_score"])


async def _fetch_safe(ticker: str) -> dict:
    try:
        metrics = await data_service.fetch_all(ticker)
        score, _, _ = scoring_engine.evaluate(metrics)
        return {
            "ticker": ticker,
            "score": score,
            "change_pct": metrics.price_change_pct,
            "pe": metrics.pe_ratio,
        }
    except Exception as e:
        logger.error(f"Heatmap fetch error {ticker}: {e}")
        return {"ticker": ticker, "score": 5.0, "change_pct": None, "pe": None}
