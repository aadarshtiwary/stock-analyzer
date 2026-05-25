import asyncio
import logging
from datetime import datetime
from typing import List, Optional

from services.stock_data import StockDataService
from services.scoring import ScoringEngine
from agents.ai_insight import AIInsightAgent
from services.notifications import NotificationService
from data.nse_universe import FULL_NSE_UNIVERSE, LARGE_CAP, MID_CAP, SMALL_CAP

logger = logging.getLogger(__name__)

# Keep backward-compatible alias
NSE_UNIVERSE = LARGE_CAP  # default scan = large cap only (fast)


class AutonomousAgent:
    """Daily autonomous agent that scans stocks and identifies opportunities."""

    def __init__(self):
        self.data_service = StockDataService()
        self.scoring_engine = ScoringEngine()
        self.ai_agent = AIInsightAgent()
        self.notification_service = NotificationService()

    async def run_daily_scan(
        self,
        tickers: Optional[List[str]] = None,
        tier: str = "large",  # "large" | "mid" | "small" | "full"
    ) -> List[dict]:
        """Scan stocks and return top opportunities.

        Args:
            tickers: Explicit list of tickers (overrides tier)
            tier: Which universe to scan — "large" (49), "mid" (242), "small" (441), "full" (700+)
        """
        if tickers is None:
            tier_map = {
                "large": LARGE_CAP,
                "mid": MID_CAP,
                "small": SMALL_CAP,
                "full": FULL_NSE_UNIVERSE,
            }
            tickers = tier_map.get(tier, LARGE_CAP)

        logger.info(f"Starting autonomous scan of {len(tickers)} stocks...")
        results = []

        for ticker in tickers:
            try:
                result = await self._analyze_single(ticker)
                if result:
                    results.append(result)
                # Small delay to avoid rate limiting
                await asyncio.sleep(1)
            except Exception as e:
                logger.error(f"Scan failed for {ticker}: {e}")
                continue

        # Sort by score
        results.sort(key=lambda x: x["score"], reverse=True)

        # Get top opportunities
        top_opportunities = [r for r in results if r["verdict"] == "BUY"][:5]

        # Send notifications for top picks
        if top_opportunities:
            await self._send_opportunity_report(top_opportunities)

        logger.info(f"Scan complete. Found {len(top_opportunities)} BUY opportunities.")
        return results

    async def _analyze_single(self, ticker: str) -> dict:
        try:
            metrics = await self.data_service.fetch_all(ticker)
            score, verdict, metric_results = self.scoring_engine.evaluate(metrics)
            return {
                "ticker": ticker,
                "company_name": metrics.company_name,
                "score": score,
                "verdict": verdict,
                "current_price": metrics.current_price,
                "sector": metrics.sector,
                "rsi": metrics.rsi,
                "pe_ratio": metrics.pe_ratio,
                "analyzed_at": datetime.utcnow().isoformat(),
            }
        except Exception as e:
            logger.error(f"Error analyzing {ticker}: {e}")
            return None

    async def _send_opportunity_report(self, opportunities: List[dict]):
        """Send daily opportunity report via Telegram/email."""
        lines = ["📊 *Daily Stock Scan Report*\n"]
        lines.append(f"_Scanned at {datetime.now().strftime('%d %b %Y %H:%M IST')}_\n")
        lines.append("🟢 *Top BUY Opportunities:*\n")

        for i, stock in enumerate(opportunities, 1):
            lines.append(
                f"{i}. *{stock['ticker']}* — Score: {stock['score']}/10\n"
                f"   Price: ₹{stock['current_price']:,.2f} | Sector: {stock['sector'] or 'N/A'}"
            )

        message = "\n".join(lines)
        await self.notification_service.send_telegram(message)
