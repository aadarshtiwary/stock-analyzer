from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
import logging
from typing import Optional, List

from core.database import get_db
from models.db_models import AnalysisResult, Alert
from agents.autonomous import AutonomousAgent
from data.nse_universe import FULL_NSE_UNIVERSE, LARGE_CAP, MID_CAP, SMALL_CAP

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/top-stocks")
async def get_top_stocks(
    limit: int = Query(10, ge=1, le=50),
    verdict: Optional[str] = Query(None, description="Filter by BUY/WATCH/AVOID"),
    db: AsyncSession = Depends(get_db),
):
    """Get top-scored stocks from recent analyses."""
    cutoff = datetime.utcnow() - timedelta(hours=24)
    query = (
        select(AnalysisResult)
        .where(AnalysisResult.analyzed_at >= cutoff)
        .order_by(AnalysisResult.score.desc())
        .limit(limit)
    )
    if verdict:
        query = query.where(AnalysisResult.verdict == verdict.upper())
    result = await db.execute(query)
    items = result.scalars().all()
    return [
        {
            "ticker": item.ticker,
            "score": item.score,
            "verdict": item.verdict,
            "analyzed_at": item.analyzed_at,
            "current_price": item.metrics.get("current_price") if item.metrics else None,
            "sector": item.metrics.get("sector") if item.metrics else None,
            "company_name": item.metrics.get("company_name") if item.metrics else item.ticker,
        }
        for item in items
    ]


@router.get("/universe")
async def get_universe(
    tier: str = Query("large", description="large | mid | small | full"),
):
    """Get the list of NSE tickers in each scanning tier."""
    tier_map = {
        "large": LARGE_CAP,
        "mid": MID_CAP,
        "small": SMALL_CAP,
        "full": FULL_NSE_UNIVERSE,
    }
    tickers = tier_map.get(tier, LARGE_CAP)
    return {
        "tier": tier,
        "count": len(tickers),
        "tickers": tickers,
        "available_tiers": {
            "large": len(LARGE_CAP),
            "mid": len(MID_CAP),
            "small": len(SMALL_CAP),
            "full": len(FULL_NSE_UNIVERSE),
        },
    }


@router.post("/scan/trigger")
async def trigger_scan(
    background_tasks: BackgroundTasks,
    tickers: Optional[List[str]] = None,
    tier: str = Query("large", description="large | mid | small | full"),
):
    """Trigger autonomous agent scan in background.

    - tier=large  → 49 stocks (Nifty 50), fastest
    - tier=mid    → 242 stocks (Nifty Next 50 + Midcap 150)
    - tier=small  → 441 stocks (Smallcap sample)
    - tier=full   → 700+ all tiers combined
    """
    agent = AutonomousAgent()
    scan_list = tickers or None
    background_tasks.add_task(agent.run_daily_scan, scan_list, tier)
    tier_counts = {"large": 49, "mid": 242, "small": 441, "full": 719}
    count = len(tickers) if tickers else tier_counts.get(tier, 49)
    return {
        "message": f"Scan triggered",
        "tier": tier if not tickers else "custom",
        "stocks": count,
        "note": "Results will appear in /top-stocks as analysis completes",
    }
