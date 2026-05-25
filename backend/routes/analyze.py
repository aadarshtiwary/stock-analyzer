from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
import logging

from core.database import get_db
from core.cache import stock_cache, ai_cache, cache_key
from models.schemas import AnalysisResponse, Verdict
from models.db_models import AnalysisResult, Alert
from services.stock_data import StockDataService
from services.scoring import ScoringEngine
from agents.ai_insight import AIInsightAgent
from services.notifications import NotificationService

router = APIRouter()
logger = logging.getLogger(__name__)

data_service = StockDataService()
scoring_engine = ScoringEngine()
ai_agent = AIInsightAgent()
notif_service = NotificationService()


@router.get("/analyze/{ticker}", response_model=AnalysisResponse)
async def analyze_stock(
    ticker: str,
    db: AsyncSession = Depends(get_db),
    skip_ai: bool = Query(False, description="Skip AI analysis for faster response"),
    force_refresh: bool = Query(False, description="Bypass cache and fetch fresh data"),
):
    """
    Analyze a stock by ticker symbol.
    Example: /api/analyze/INFY.NS
    """
    ticker = ticker.upper().strip()

    # ── Cache check ──────────────────────────────────────────────────────────
    if not force_refresh:
        cached = await stock_cache.get(cache_key("analysis", ticker))
        if cached:
            logger.info(f"Cache HIT for {ticker}")
            return cached

    try:
        # 1. Fetch data
        logger.info(f"Fetching data for {ticker}")
        metrics = await data_service.fetch_all(ticker)

        if not metrics.current_price:
            raise HTTPException(
                status_code=404,
                detail=f"No data found for ticker '{ticker}'. Check the symbol (e.g., INFY.NS for NSE)",
            )

        # 2. Score
        score, verdict, metric_results = scoring_engine.evaluate(metrics)

        # 3. AI Analysis (cached separately — GPT is expensive)
        ai_key = cache_key("ai", ticker)
        ai_analysis = None if skip_ai else await ai_cache.get(ai_key)

        if not ai_analysis and not skip_ai:
            ai_analysis = await ai_agent.analyze(ticker, score, verdict, metrics, metric_results)
            await ai_cache.set(ai_key, ai_analysis, ttl=1800)  # 30 min
        elif skip_ai:
            ai_analysis = ai_agent._fallback_analysis(ticker, score, verdict, metrics, metric_results)

        # 4. Save to DB
        analysis_record = AnalysisResult(
            ticker=ticker,
            score=score,
            verdict=verdict,
            metrics=metrics.model_dump(),
            metric_results=[r.model_dump() for r in metric_results],
            ai_analysis=ai_analysis.model_dump(),
            raw_data={},
        )
        db.add(analysis_record)

        # 5. Check for threshold breaches → alerts
        await _check_and_create_alerts(ticker, metrics, db)

        # Determine data quality
        filled = sum(1 for v in metrics.model_dump().values() if v is not None and v != 0)
        total_fields = len(metrics.model_dump())
        data_quality = (
            "High" if filled / total_fields > 0.7
            else "Medium" if filled / total_fields > 0.4
            else "Low"
        )

        response = AnalysisResponse(
            ticker=ticker,
            company_name=metrics.company_name or ticker,
            score=score,
            verdict=Verdict(verdict),
            metrics=metrics,
            metric_results=metric_results,
            ai_analysis=ai_analysis,
            analyzed_at=datetime.utcnow(),
            data_quality=data_quality,
        )

        # Cache full response for 5 min
        await stock_cache.set(cache_key("analysis", ticker), response, ttl=300)

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Analysis failed for {ticker}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


async def _check_and_create_alerts(ticker, metrics, db):
    """Create alert records if threshold breaches detected."""
    alerts = []

    if metrics.rsi and metrics.rsi > 70:
        alerts.append(Alert(
            ticker=ticker,
            alert_type="rsi_overbought",
            condition=f"RSI > 70",
            threshold_value=70,
            current_value=metrics.rsi,
        ))

    if metrics.rsi and metrics.rsi < 30:
        alerts.append(Alert(
            ticker=ticker,
            alert_type="rsi_oversold",
            condition=f"RSI < 30",
            threshold_value=30,
            current_value=metrics.rsi,
        ))

    if metrics.current_price and metrics.dma_200:
        if metrics.current_price < metrics.dma_200:
            alerts.append(Alert(
                ticker=ticker,
                alert_type="price_below_200dma",
                condition=f"Price < 200 DMA",
                threshold_value=metrics.dma_200,
                current_value=metrics.current_price,
            ))

    for alert in alerts:
        db.add(alert)
        logger.info(f"Alert created: {ticker} — {alert.alert_type}")
