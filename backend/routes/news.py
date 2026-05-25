from fastapi import APIRouter, Query
from services.news_sentiment import NewsSentimentService

router = APIRouter()
service = NewsSentimentService()


@router.get("/news/{ticker}")
async def get_news_sentiment(
    ticker: str,
    days: int = Query(7, ge=1, le=30),
):
    """Get news headlines and sentiment analysis for a ticker."""
    ticker = ticker.upper()
    return await service.get_news_sentiment(ticker, days)
