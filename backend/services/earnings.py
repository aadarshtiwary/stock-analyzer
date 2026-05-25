"""
Earnings tracker: fetches upcoming and recent earnings dates,
estimates vs actuals, and surprise analysis.
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Optional
import yfinance as yf

logger = logging.getLogger(__name__)


class EarningsTracker:
    """Tracks earnings dates, estimates, and historical surprises."""

    async def get_earnings_data(self, ticker: str) -> dict:
        """Fetch earnings calendar and history for a ticker."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._fetch_earnings, ticker)

    def _fetch_earnings(self, ticker: str) -> dict:
        try:
            stock = yf.Ticker(ticker)
            info = stock.info or {}

            # Next earnings date
            next_earnings_ts = info.get("earningsTimestamp") or info.get("earningsTimestampStart")
            next_earnings = None
            if next_earnings_ts:
                next_earnings = datetime.fromtimestamp(next_earnings_ts).strftime("%Y-%m-%d")

            # EPS estimates
            eps_current = info.get("epsCurrentYear")
            eps_forward = info.get("forwardEps")
            eps_trailing = info.get("trailingEps")

            # Revenue estimates
            rev_estimate = info.get("revenueEstimate")

            # Earnings history (quarterly)
            earnings_history = []
            try:
                calendar = stock.calendar
                if calendar is not None and not calendar.empty:
                    for col in calendar.columns:
                        earnings_history.append({
                            "date": str(col),
                            "earnings_avg": calendar.loc["Earnings Average", col] if "Earnings Average" in calendar.index else None,
                            "earnings_low": calendar.loc["Earnings Low", col] if "Earnings Low" in calendar.index else None,
                            "earnings_high": calendar.loc["Earnings High", col] if "Earnings High" in calendar.index else None,
                            "revenue_avg": calendar.loc["Revenue Average", col] if "Revenue Average" in calendar.index else None,
                        })
            except Exception:
                pass

            # Analyst recommendations
            recommendations = []
            try:
                rec = stock.recommendations
                if rec is not None and not rec.empty:
                    latest = rec.tail(5)
                    for _, row in latest.iterrows():
                        recommendations.append({
                            "firm": row.get("Firm", ""),
                            "to_grade": row.get("To Grade", ""),
                            "from_grade": row.get("From Grade", ""),
                            "action": row.get("Action", ""),
                        })
            except Exception:
                pass

            # Price targets
            target_high = info.get("targetHighPrice")
            target_low = info.get("targetLowPrice")
            target_mean = info.get("targetMeanPrice")
            target_median = info.get("targetMedianPrice")
            analyst_count = info.get("numberOfAnalystOpinions")
            recommendation_key = info.get("recommendationKey", "").upper()

            return {
                "ticker": ticker,
                "next_earnings_date": next_earnings,
                "eps": {
                    "trailing": eps_trailing,
                    "current_year_estimate": eps_current,
                    "forward": eps_forward,
                },
                "revenue_estimate": rev_estimate,
                "earnings_calendar": earnings_history[:3],
                "analyst_consensus": recommendation_key,
                "analyst_count": analyst_count,
                "price_targets": {
                    "high": target_high,
                    "low": target_low,
                    "mean": target_mean,
                    "median": target_median,
                    "current_price": info.get("currentPrice"),
                },
                "upside_pct": round(
                    ((target_mean - info.get("currentPrice", 0)) / info.get("currentPrice", 1) * 100), 1
                ) if target_mean and info.get("currentPrice") else None,
                "analyst_recommendations": recommendations[:5],
            }
        except Exception as e:
            logger.error(f"Earnings fetch error {ticker}: {e}")
            return {"ticker": ticker, "error": str(e)}
