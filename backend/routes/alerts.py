from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from core.database import get_db
from models.db_models import Alert

router = APIRouter()


@router.get("/alerts")
async def get_alerts(
    ticker: str = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """Get recent alerts, optionally filtered by ticker."""
    query = select(Alert).order_by(Alert.triggered_at.desc()).limit(limit)
    if ticker:
        query = query.where(Alert.ticker == ticker.upper())
    result = await db.execute(query)
    items = result.scalars().all()
    return [
        {
            "id": a.id,
            "ticker": a.ticker,
            "alert_type": a.alert_type,
            "condition": a.condition,
            "threshold_value": a.threshold_value,
            "current_value": a.current_value,
            "triggered_at": a.triggered_at,
        }
        for a in items
    ]
