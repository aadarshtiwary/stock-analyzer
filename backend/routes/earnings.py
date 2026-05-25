from fastapi import APIRouter
from services.earnings import EarningsTracker
from core.cache import stock_cache, cache_key

router = APIRouter()
tracker = EarningsTracker()


@router.get("/earnings/{ticker}")
async def get_earnings(ticker: str):
    """Get earnings calendar, EPS estimates, and analyst price targets."""
    ticker = ticker.upper()
    ck = cache_key("earnings", ticker)
    cached = await stock_cache.get(ck)
    if cached:
        return cached
    data = await tracker.get_earnings_data(ticker)
    await stock_cache.set(ck, data, ttl=1800)  # 30 min cache
    return data
