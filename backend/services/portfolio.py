import asyncio
import logging
from typing import List
from datetime import datetime

from services.stock_data import StockDataService
from services.scoring import ScoringEngine
from models.portfolio_schemas import (
    HoldingAnalysis, SectorAllocation, PortfolioAnalysis, HoldingInput
)

logger = logging.getLogger(__name__)

data_service = StockDataService()
scoring_engine = ScoringEngine()


class PortfolioAnalyzer:
    """Analyzes a portfolio for diversification, P&L, and AI suggestions."""

    async def analyze(
        self,
        portfolio_id: str,
        portfolio_name: str,
        holdings_input: List[HoldingInput],
    ) -> PortfolioAnalysis:

        # Fetch live data for all holdings concurrently
        tasks = [self._analyze_holding(h) for h in holdings_input]
        holding_analyses: List[HoldingAnalysis] = await asyncio.gather(*tasks)

        # Total values
        total_invested = sum(h.invested_value for h in holding_analyses)
        total_current = sum(h.current_value or h.invested_value for h in holding_analyses)
        total_pnl = total_current - total_invested
        total_pnl_pct = (total_pnl / total_invested * 100) if total_invested > 0 else 0

        # Assign portfolio weights
        for h in holding_analyses:
            h.weight_pct = round(
                ((h.current_value or h.invested_value) / total_current * 100)
                if total_current > 0 else 0,
                1,
            )

        # Sector allocation
        sector_map: dict[str, dict] = {}
        for h in holding_analyses:
            sector = h.sector or "Unknown"
            val = h.current_value or h.invested_value
            if sector not in sector_map:
                sector_map[sector] = {"value": 0, "count": 0}
            sector_map[sector]["value"] += val
            sector_map[sector]["count"] += 1

        sector_allocation = [
            SectorAllocation(
                sector=sec,
                weight_pct=round(data["value"] / total_current * 100, 1) if total_current > 0 else 0,
                total_value=round(data["value"], 2),
                holding_count=data["count"],
            )
            for sec, data in sorted(sector_map.items(), key=lambda x: -x[1]["value"])
        ]

        # Diversification score
        diversification_score = self._calc_diversification(holding_analyses, sector_allocation)

        # Average stock score
        scored = [h.score for h in holding_analyses if h.score is not None]
        avg_score = round(sum(scored) / len(scored), 1) if scored else 0.0

        # Top / under performers by P&L %
        sorted_by_pnl = sorted(
            [h for h in holding_analyses if h.pnl_pct is not None],
            key=lambda x: x.pnl_pct,
            reverse=True,
        )
        top_performers = [h.ticker for h in sorted_by_pnl[:3]]
        underperformers = [h.ticker for h in sorted_by_pnl[-3:] if h.pnl_pct and h.pnl_pct < 0]

        # Concentration risk
        if sector_allocation:
            max_sector_weight = sector_allocation[0].weight_pct
        else:
            max_sector_weight = 0

        if max_sector_weight > 50:
            concentration_risk = "High"
        elif max_sector_weight > 30:
            concentration_risk = "Medium"
        else:
            concentration_risk = "Low"

        # AI suggestions (rule-based for now, can be enhanced with OpenAI)
        ai_suggestions = self._generate_suggestions(
            holding_analyses, sector_allocation, diversification_score, avg_score
        )

        return PortfolioAnalysis(
            portfolio_id=portfolio_id,
            portfolio_name=portfolio_name,
            total_invested=round(total_invested, 2),
            total_current_value=round(total_current, 2),
            total_pnl=round(total_pnl, 2),
            total_pnl_pct=round(total_pnl_pct, 2),
            diversification_score=diversification_score,
            avg_stock_score=avg_score,
            holdings=holding_analyses,
            sector_allocation=sector_allocation,
            top_performers=top_performers,
            underperformers=underperformers,
            ai_suggestions=ai_suggestions,
            concentration_risk=concentration_risk,
            analyzed_at=datetime.utcnow(),
        )

    async def _analyze_holding(self, h: HoldingInput) -> HoldingAnalysis:
        try:
            metrics = await data_service.fetch_all(h.ticker)
            score, verdict, _ = scoring_engine.evaluate(metrics)
            current_price = metrics.current_price
            current_value = (current_price * h.quantity) if current_price else None
            invested_value = h.avg_buy_price * h.quantity
            pnl = (current_value - invested_value) if current_value else None
            pnl_pct = (pnl / invested_value * 100) if pnl is not None and invested_value > 0 else None

            return HoldingAnalysis(
                ticker=h.ticker,
                company_name=metrics.company_name or h.company_name or h.ticker,
                quantity=h.quantity,
                avg_buy_price=h.avg_buy_price,
                current_price=current_price,
                current_value=round(current_value, 2) if current_value else None,
                invested_value=round(invested_value, 2),
                pnl=round(pnl, 2) if pnl else None,
                pnl_pct=round(pnl_pct, 2) if pnl_pct else None,
                sector=metrics.sector,
                score=score,
                verdict=verdict,
                weight_pct=None,  # set after totals calculated
            )
        except Exception as e:
            logger.error(f"Portfolio holding error {h.ticker}: {e}")
            invested_value = h.avg_buy_price * h.quantity
            return HoldingAnalysis(
                ticker=h.ticker,
                company_name=h.company_name or h.ticker,
                quantity=h.quantity,
                avg_buy_price=h.avg_buy_price,
                current_price=None,
                current_value=None,
                invested_value=round(invested_value, 2),
                pnl=None,
                pnl_pct=None,
                sector=None,
                score=None,
                verdict=None,
                weight_pct=None,
            )

    def _calc_diversification(
        self,
        holdings: List[HoldingAnalysis],
        sectors: List[SectorAllocation],
    ) -> float:
        score = 10.0

        # Penalize concentration in single stock
        if holdings:
            weights = [h.weight_pct or 0 for h in holdings]
            max_weight = max(weights) if weights else 0
            if max_weight > 30:
                score -= 2.0
            elif max_weight > 20:
                score -= 1.0

        # Penalize sector concentration
        if sectors:
            top_sector_weight = sectors[0].weight_pct
            if top_sector_weight > 50:
                score -= 2.5
            elif top_sector_weight > 35:
                score -= 1.5
            elif top_sector_weight > 25:
                score -= 0.5

        # Reward for number of sectors
        n_sectors = len(sectors)
        if n_sectors >= 5:
            pass  # no penalty
        elif n_sectors >= 3:
            score -= 0.5
        elif n_sectors == 2:
            score -= 1.5
        else:
            score -= 3.0

        # Reward for number of stocks
        n_stocks = len(holdings)
        if n_stocks < 5:
            score -= 2.0
        elif n_stocks < 8:
            score -= 1.0

        return round(max(0.0, min(10.0, score)), 1)

    def _generate_suggestions(
        self,
        holdings: List[HoldingAnalysis],
        sectors: List[SectorAllocation],
        diversification_score: float,
        avg_score: float,
    ) -> List[str]:
        suggestions = []

        if diversification_score < 5:
            suggestions.append("Portfolio is highly concentrated. Consider spreading across more sectors and stocks to reduce risk.")

        if sectors and sectors[0].weight_pct > 40:
            suggestions.append(f"Over-exposed to {sectors[0].sector} ({sectors[0].weight_pct:.0f}% of portfolio). Consider rebalancing.")

        avoid_holdings = [h for h in holdings if h.verdict == "AVOID"]
        if avoid_holdings:
            tickers = ", ".join(h.ticker for h in avoid_holdings[:3])
            suggestions.append(f"Consider reviewing: {tickers} — currently flagged as AVOID based on fundamentals.")

        buy_holdings = [h for h in holdings if h.verdict == "BUY" and h.weight_pct and h.weight_pct < 5]
        if buy_holdings:
            tickers = ", ".join(h.ticker for h in buy_holdings[:2])
            suggestions.append(f"Strong stocks {tickers} are underweighted. Consider increasing allocation.")

        if avg_score < 5:
            suggestions.append("Overall portfolio quality score is below average. Consider rotating into higher-quality stocks.")

        n_sectors = len(sectors)
        sector_names = [s.sector for s in sectors]
        missing = []
        for s in ["Consumer Defensive", "Healthcare", "Technology", "Financial Services"]:
            if s not in sector_names:
                missing.append(s)
        if missing:
            suggestions.append(f"Portfolio lacks exposure to: {', '.join(missing[:2])}. Diversifying across these may reduce volatility.")

        if not suggestions:
            suggestions.append("Portfolio appears well-diversified. Continue monitoring and rebalance quarterly.")

        return suggestions[:5]
