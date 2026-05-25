import json
import logging
from openai import AsyncOpenAI
from models.schemas import StockMetrics, MetricResult, AIAnalysis
from core.config import settings

logger = logging.getLogger(__name__)


class AIInsightAgent:
    """Uses OpenAI to generate investor-friendly stock insights.
    Falls back to rule-based analysis if no API key is configured."""

    SYSTEM_PROMPT = """You are an expert equity research analyst specializing in Indian stock markets (NSE/BSE).
Your role is to provide concise, actionable, investor-friendly analysis.
Always respond in valid JSON format. Be direct, data-driven, and honest about risks.
Avoid jargon. Write for a retail investor who understands basics but not deep finance.
Never give absolute buy/sell advice — frame as analysis and observations."""

    async def analyze(
        self,
        ticker: str,
        score: float,
        verdict: str,
        metrics: StockMetrics,
        metric_results: list[MetricResult],
    ) -> AIAnalysis:
        """Generate AI analysis. Falls back to rule-based if OpenAI unavailable."""
        if not settings.has_openai:
            logger.info(f"No OpenAI key — using rule-based analysis for {ticker}")
            return self._fallback_analysis(ticker, score, verdict, metrics, metric_results)

        passed = [r.name for r in metric_results if r.passed]
        failed = [r.name for r in metric_results if not r.passed and r.value is not None]
        metrics_summary = self._build_metrics_summary(metrics)
        metric_results_summary = self._build_results_summary(metric_results)

        prompt = f"""Analyze the following stock data and generate a comprehensive investment analysis.

STOCK: {ticker}
COMPANY: {metrics.company_name}
SECTOR: {metrics.sector or 'Unknown'}
SCORE: {score}/10
PRELIMINARY VERDICT: {verdict}

KEY METRICS:
{metrics_summary}

THRESHOLD EVALUATION (Pass/Fail):
{metric_results_summary}

PASSED CRITERIA: {', '.join(passed) if passed else 'None'}
FAILED CRITERIA: {', '.join(failed) if failed else 'None'}

Generate analysis in this EXACT JSON format:
{{
  "summary": "2-3 sentence overview of the company and current investment case",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "valuation_analysis": "2-3 sentences on current valuation",
  "momentum_analysis": "2-3 sentences on technical momentum",
  "risk_level": "Low|Medium|High",
  "risk_factors": ["risk 1", "risk 2", "risk 3"],
  "recommendation": "2-3 sentence actionable summary",
  "time_horizon": "Short-term (0-3 months)|Medium-term (3-12 months)|Long-term (1-3 years)",
  "target_price_range": "₹X–₹Y or null"
}}"""

        try:
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            response = await client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": self.SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                response_format={"type": "json_object"},
                max_tokens=800,
            )
            data = json.loads(response.choices[0].message.content)
            return AIAnalysis(**data)

        except Exception as e:
            logger.error(f"OpenAI call failed for {ticker}: {e}")
            return self._fallback_analysis(ticker, score, verdict, metrics, metric_results)

    def _build_metrics_summary(self, metrics: StockMetrics) -> str:
        lines = []
        if metrics.current_price: lines.append(f"Current Price: ₹{metrics.current_price:,.2f}")
        if metrics.market_cap_cr: lines.append(f"Market Cap: ₹{metrics.market_cap_cr:,.0f} Cr")
        if metrics.pe_ratio:      lines.append(f"P/E Ratio: {metrics.pe_ratio:.1f}x")
        if metrics.pb_ratio:      lines.append(f"P/B Ratio: {metrics.pb_ratio:.1f}x")
        if metrics.roe:           lines.append(f"ROE: {metrics.roe:.1f}%")
        if metrics.debt_to_equity is not None: lines.append(f"Debt/Equity: {metrics.debt_to_equity:.2f}x")
        if metrics.revenue_growth: lines.append(f"Revenue Growth: {metrics.revenue_growth:.1f}%")
        if metrics.profit_growth:  lines.append(f"Profit Growth: {metrics.profit_growth:.1f}%")
        if metrics.rsi:            lines.append(f"RSI: {metrics.rsi:.1f}")
        if metrics.dma_50:         lines.append(f"50 DMA: ₹{metrics.dma_50:.2f}")
        if metrics.dma_200:        lines.append(f"200 DMA: ₹{metrics.dma_200:.2f}")
        return "\n".join(lines) if lines else "Limited data available"

    def _build_results_summary(self, results: list[MetricResult]) -> str:
        lines = []
        for r in results:
            status = "✓ PASS" if r.passed else "✗ FAIL"
            lines.append(f"{r.name}: {r.display_value} (threshold: {r.threshold}) — {status}")
        return "\n".join(lines)

    def _fallback_analysis(
        self,
        ticker: str,
        score: float,
        verdict: str,
        metrics: StockMetrics,
        results: list[MetricResult],
    ) -> AIAnalysis:
        """
        Fully rule-based analysis — no API call needed.
        Works without OpenAI key.
        """
        passed = [r for r in results if r.passed]
        failed = [r for r in results if not r.passed and r.display_value != "N/A"]

        # Build strengths from passing metrics
        strength_map = {
            "roe": f"Strong return on equity ({metrics.roe:.1f}%)" if metrics.roe else None,
            "roce": f"Healthy ROCE above threshold" if metrics.roce else None,
            "debt_to_equity": f"Low debt levels ({metrics.debt_to_equity:.2f}x D/E)" if metrics.debt_to_equity is not None else None,
            "revenue_growth": f"Solid revenue growth of {metrics.revenue_growth:.1f}% YoY" if metrics.revenue_growth else None,
            "profit_growth": f"Strong profit growth of {metrics.profit_growth:.1f}% YoY" if metrics.profit_growth else None,
            "rsi": f"RSI at {metrics.rsi:.1f} — healthy momentum zone" if metrics.rsi else None,
            "price_vs_200dma": "Trading above 200 DMA — long-term uptrend intact" if (metrics.current_price and metrics.dma_200 and metrics.current_price > metrics.dma_200) else None,
            "promoter_holding": f"High promoter confidence ({metrics.promoter_holding:.1f}%)" if metrics.promoter_holding else None,
        }
        weakness_map = {
            "roe": f"ROE below threshold at {metrics.roe:.1f}%" if metrics.roe else "ROE data unavailable",
            "debt_to_equity": f"High debt load ({metrics.debt_to_equity:.2f}x D/E)" if metrics.debt_to_equity is not None else "Debt data unavailable",
            "revenue_growth": f"Weak revenue growth ({metrics.revenue_growth:.1f}%)" if metrics.revenue_growth else "Revenue growth data unavailable",
            "rsi": f"RSI at {metrics.rsi:.1f} — outside ideal 50–70 zone" if metrics.rsi else None,
            "price_vs_200dma": "Trading below 200 DMA — caution on long-term trend" if (metrics.current_price and metrics.dma_200 and metrics.current_price < metrics.dma_200) else None,
        }

        strengths = [strength_map[r.name] for r in passed if r.name in strength_map and strength_map[r.name]][:3]
        weaknesses = [weakness_map[r.name] for r in failed if r.name in weakness_map and weakness_map[r.name]][:3]

        if not strengths:
            strengths = ["Insufficient data for full strength analysis"]
        if not weaknesses:
            weaknesses = ["No major red flags detected in available data"]

        # Valuation
        if metrics.pe_ratio:
            if metrics.pe_ratio < 15:
                val = f"P/E of {metrics.pe_ratio:.1f}x looks attractively valued relative to market averages."
            elif metrics.pe_ratio < 30:
                val = f"P/E of {metrics.pe_ratio:.1f}x appears fairly valued for a quality company."
            else:
                val = f"P/E of {metrics.pe_ratio:.1f}x is elevated — the market is pricing in high growth expectations."
        else:
            val = "Valuation data unavailable. Check P/E and P/B ratios before investing."

        # Momentum
        if metrics.rsi and metrics.current_price and metrics.dma_200:
            trend = "above" if metrics.current_price > metrics.dma_200 else "below"
            mom = f"Price is {trend} the 200 DMA with RSI at {metrics.rsi:.1f}."
            if metrics.rsi >= 50 and metrics.rsi <= 70 and trend == "above":
                mom += " Momentum is constructive without being overbought."
            elif metrics.rsi > 70:
                mom += " RSI suggests near-term overbought conditions — wait for a pullback."
            elif metrics.rsi < 40:
                mom += " RSI suggests oversold conditions — possible mean reversion candidate."
        else:
            mom = "Technical data partially unavailable. Use TradingView chart for detailed momentum analysis."

        # Risk
        if metrics.debt_to_equity is not None and metrics.debt_to_equity > 1.5:
            risk_level = "High"
            risk_factors = [
                f"High debt load at {metrics.debt_to_equity:.2f}x D/E ratio",
                "Rising interest rates could pressure margins",
                "Leverage amplifies downside in business slowdowns",
            ]
        elif score < 5:
            risk_level = "High"
            risk_factors = [
                "Multiple fundamental criteria not met",
                "Weak financial performance relative to thresholds",
                "Consider waiting for improvement in key metrics",
            ]
        elif score >= 7.5:
            risk_level = "Low"
            risk_factors = [
                "Broader market volatility remains a risk",
                "Sector-specific headwinds could impact performance",
                "Monitor quarterly results for any deterioration",
            ]
        else:
            risk_level = "Medium"
            risk_factors = [
                "Some financial metrics below ideal thresholds",
                "Market and sector risks apply",
                "Monitor key metrics before adding to position",
            ]

        # Recommendation
        if verdict == "BUY":
            rec = f"{metrics.company_name or ticker} scores {score}/10 and meets most quality criteria. Suitable for medium-term investors with a 12-month horizon. Consider entering in tranches rather than all at once."
        elif verdict == "WATCH":
            rec = f"{metrics.company_name or ticker} scores {score}/10 — promising but not fully meeting all thresholds. Add to watchlist and wait for improvement in weaker metrics before committing capital."
        else:
            rec = f"{metrics.company_name or ticker} scores {score}/10 and fails several key criteria. Avoid new positions at current levels. Revisit if fundamentals improve over coming quarters."

        return AIAnalysis(
            summary=f"{metrics.company_name or ticker} is a {metrics.sector or 'listed'} company scoring {score}/10 in our analysis. {len(passed)} of {len(results)} criteria passed.",
            strengths=strengths,
            weaknesses=weaknesses,
            valuation_analysis=val,
            momentum_analysis=mom,
            risk_level=risk_level,
            risk_factors=risk_factors,
            recommendation=rec,
            time_horizon="Medium-term (3-12 months)",
            target_price_range=None,
        )
