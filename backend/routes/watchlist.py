from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from datetime import datetime
import logging

from core.database import get_db
from models.schemas import WatchlistItemResponse, AddWatchlistRequest
from models.db_models import WatchlistItem

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/watchlist", response_model=list[WatchlistItemResponse])
async def get_watchlist(db: AsyncSession = Depends(get_db)):
    """Get all watchlist items."""
    result = await db.execute(
        select(WatchlistItem).order_by(WatchlistItem.added_at.desc())
    )
    items = result.scalars().all()
    return items


@router.post("/watchlist/add", response_model=WatchlistItemResponse)
async def add_to_watchlist(
    request: AddWatchlistRequest,
    db: AsyncSession = Depends(get_db),
):
    """Add a stock to the watchlist."""
    ticker = request.ticker.upper().strip()

    # Check if already exists
    result = await db.execute(
        select(WatchlistItem).where(WatchlistItem.ticker == ticker)
    )
    existing = result.scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"{ticker} is already in your watchlist"
        )

    item = WatchlistItem(
        ticker=ticker,
        notes=request.notes,
    )
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return item


@router.delete("/watchlist/{ticker}")
async def remove_from_watchlist(
    ticker: str,
    db: AsyncSession = Depends(get_db),
):
    """Remove a stock from watchlist."""
    ticker = ticker.upper()
    await db.execute(
        delete(WatchlistItem).where(WatchlistItem.ticker == ticker)
    )
    return {"message": f"{ticker} removed from watchlist"}


@router.patch("/watchlist/{ticker}/score")
async def update_watchlist_score(
    ticker: str,
    score: float,
    verdict: str,
    db: AsyncSession = Depends(get_db),
):
    """Update last known score for a watchlist item."""
    ticker = ticker.upper()
    result = await db.execute(
        select(WatchlistItem).where(WatchlistItem.ticker == ticker)
    )
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(status_code=404, detail="Not in watchlist")

    item.last_score = score
    item.last_verdict = verdict
    item.last_analyzed = datetime.utcnow()
    return {"message": "Updated"}
