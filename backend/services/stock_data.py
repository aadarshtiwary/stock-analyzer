import asyncio
import logging
import aiohttp
import pandas as pd
import numpy as np
from typing import Dict, Any, Optional
from models.schemas import StockMetrics
from core.config import settings

logger = logging.getLogger(__name__)

AV_BASE = "https://www.alphavantage.co/query"
FMP_BASE = "https://financialmodelingprep.com/api/v3"


class StockDataService:
    """Fetches stock data from Alpha Vantage + Financial Modeling Prep."""

    async def fetch_all(self, ticker: str) -> StockMetrics:
        """Fetch all metrics combining multiple free APIs."""
        # Clean ticker for different APIs
        av_ticker = ticker.replace(".NS", ".BSE").replace(".BO", ".BSE")
        fmp_ticker = ticker.replace(".NS", "").replace(".BO", "")

        # Fetch all data concurrently
        price_data, fundamentals, technicals = await asyncio.gather(
            self._fetch_price(ticker, av_ticker),
            self._fetch_fundamentals(fmp_ticker),
            self._fetch_technicals_av(av_ticker),
            return_exceptions=True,
        )

        if isinstance(price_data, Exception):
            price_data = {}
        if isinstance(fundamentals, Exception):
            fundamentals = {}
        if isinstance(technicals, Exception):
            technicals = {}

        return self._build_metrics(ticker, price_data, fundamentals, technicals)

    async def _fetch_price(self, ticker: str, av_ticker: str) -> Dict:
        """Fetch current price from Alpha Vantage."""
        if not settings.ALPHA_VANTAGE_API_KEY:
            return await self._fetch_price_fmp(ticker)

        params = {
            "function": "GLOBAL_QUOTE",
            "symbol": av_ticker,
            "apikey": settings.ALPHA_VANTAGE_API_KEY,
        }
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(AV_BASE, params=params, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                    data = await resp.json()
                    quote = data.get("Global Quote", {})
                    if quote.get("05. price"):
                        price = float(quote["05. price"])
                        prev = float(quote.get("08. previous close", 0))
                        change_pct = float(quote.get("10. change percent", "0%").replace("%", ""))
                        volume = int(quote.get("06. volume", 0))
                        logger.info(f"Alpha Vantage price for {ticker}: {price}")
                        return {
                            "current_price": price,
                            "prev_close": prev,
                            "price_change_pct": change_pct,
                            "volume": volume,
                        }
        except Exception as e:
            logger.warning(f"Alpha Vantage price failed for {ticker}: {e}")

        # Fallback to FMP
        return await self._fetch_price_fmp(ticker)

    async def _fetch_price_fmp(self, ticker: str) -> Dict:
        """Fetch price from Financial Modeling Prep."""
        if not settings.FMP_API_KEY:
            return {}

        clean = ticker.replace(".NS", "").replace(".BO", "")
        url = f"{FMP_BASE}/quote/{clean}"
        params = {"apikey": settings.FMP_API_KEY}

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                    data = await resp.json()
                    if data and isinstance(data, list) and len(data) > 0:
                        q = data[0]
                        logger.info(f"FMP price for {ticker}: {q.get('price')}")
                        return {
                            "current_price": q.get("price"),
                            "prev_close": q.get("previousClose"),
                            "price_change_pct": q.get("changesPercentage"),
                            "volume": q.get("volume"),
                            "avg_volume": q.get("avgVolume"),
                            "market_cap": q.get("marketCap"),
                            "pe_ratio": q.get("pe"),
                            "eps": q.get("eps"),
                            "company_name": q.get("name"),
                            "exchange": q.get("exchange"),
                        }
        except Exception as e:
            logger.warning(f"FMP price failed for {ticker}: {e}")
        return {}

    async def _fetch_fundamentals(self, ticker: str) -> Dict:
        """Fetch fundamentals from Financial Modeling Prep."""
        if not settings.FMP_API_KEY:
            return {}

        clean = ticker.replace(".NS", "").replace(".BO", "")
        results = {}

        try:
            async with aiohttp.ClientSession() as session:
                # Key metrics
                url = f"{FMP_BASE}/key-metrics/{clean}"
                async with session.get(url, params={"apikey": settings.FMP_API_KEY, "limit": 1}, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                    data = await resp.json()
                    if data and isinstance(data, list) and len(data) > 0:
                        m = data[0]
                        results.update({
                            "pe_ratio": m.get("peRatio"),
                            "pb_ratio": m.get("pbRatio"),
                            "roe": round(m.get("roe", 0) * 100, 2) if m.get("roe") else None,
                            "debt_to_equity": m.get("debtToEquity"),
                            "current_ratio": m.get("currentRatio"),
                            "revenue_per_share": m.get("revenuePerShare"),
                            "market_cap": m.get("marketCap"),
                        })

                # Company profile
                url2 = f"{FMP_BASE}/profile/{clean}"
                async with session.get(url2, params={"apikey": settings.FMP_API_KEY}, timeout=aiohttp.ClientTimeout(total=15)) as resp2:
                    data2 = await resp2.json()
                    if data2 and isinstance(data2, list) and len(data2) > 0:
                        p = data2[0]
                        results.update({
                            "company_name": p.get("companyName"),
                            "sector": p.get("sector"),
                            "industry": p.get("industry"),
                            "beta": p.get("beta"),
                            "dividend_yield": round(p.get("lastDiv", 0) * 100, 2) if p.get("lastDiv") else None,
                            "description": p.get("description", "")[:200],
                        })

                # Income growth
                url3 = f"{FMP_BASE}/income-statement-growth/{clean}"
                async with session.get(url3, params={"apikey": settings.FMP_API_KEY, "limit": 1}, timeout=aiohttp.ClientTimeout(total=15)) as resp3:
                    data3 = await resp3.json()
                    if data3 and isinstance(data3, list) and len(data3) > 0:
                        g = data3[0]
                        results.update({
                            "revenue_growth": round(g.get("growthRevenue", 0) * 100, 2) if g.get("growthRevenue") else None,
                            "profit_growth": round(g.get("growthNetIncome", 0) * 100, 2) if g.get("growthNetIncome") else None,
                        })

        except Exception as e:
            logger.warning(f"FMP fundamentals failed for {ticker}: {e}")

        return results

    async def _fetch_technicals_av(self, av_ticker: str) -> Dict:
        """Fetch RSI and moving averages from Alpha Vantage."""
        if not settings.ALPHA_VANTAGE_API_KEY:
            return {}

        results = {}
        try:
            async with aiohttp.ClientSession() as session:
                # RSI
                rsi_params = {
                    "function": "RSI",
                    "symbol": av_ticker,
                    "interval": "daily",
                    "time_period": 14,
                    "series_type": "close",
                    "apikey": settings.ALPHA_VANTAGE_API_KEY,
                }
                async with session.get(AV_BASE, params=rsi_params, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                    data = await resp.json()
                    rsi_data = data.get("Technical Analysis: RSI", {})
                    if rsi_data:
                        latest_date = list(rsi_data.keys())[0]
                        results["rsi"] = float(rsi_data[latest_date]["RSI"])

                # 50 and 200 day SMA
                for period, key in [(50, "dma_50"), (200, "dma_200")]:
                    sma_params = {
                        "function": "SMA",
                        "symbol": av_ticker,
                        "interval": "daily",
                        "time_period": period,
                        "series_type": "close",
                        "apikey": settings.ALPHA_VANTAGE_API_KEY,
                    }
                    async with session.get(AV_BASE, params=sma_params, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                        data = await resp.json()
                        sma_data = data.get("Technical Analysis: SMA", {})
                        if sma_data:
                            latest = list(sma_data.keys())[0]
                            results[key] = float(sma_data[latest]["SMA"])

        except Exception as e:
            logger.warning(f"Alpha Vantage technicals failed: {e}")

        return results

    def _build_metrics(
        self,
        ticker: str,
        price: Dict,
        fundamentals: Dict,
        technicals: Dict,
    ) -> StockMetrics:
        current_price = price.get("current_price")
        prev_close = price.get("prev_close")
        market_cap = price.get("market_cap") or fundamentals.get("market_cap")
        market_cap_cr = round(market_cap / 1e7, 2) if market_cap else None

        volume = price.get("volume")
        avg_volume = price.get("avg_volume")
        volume_ratio = (volume / avg_volume) if volume and avg_volume and avg_volume > 0 else None

        return StockMetrics(
            current_price=current_price,
            prev_close=prev_close,
            price_change_pct=price.get("price_change_pct"),
            market_cap=market_cap,
            market_cap_cr=market_cap_cr,
            pe_ratio=price.get("pe_ratio") or fundamentals.get("pe_ratio"),
            pb_ratio=fundamentals.get("pb_ratio"),
            sector_pe=None,
            pe_vs_sector=None,
            ev_ebitda=None,
            dividend_yield=fundamentals.get("dividend_yield"),
            roe=fundamentals.get("roe"),
            roce=None,
            debt_to_equity=fundamentals.get("debt_to_equity"),
            current_ratio=fundamentals.get("current_ratio"),
            promoter_holding=None,
            revenue_growth=fundamentals.get("revenue_growth"),
            profit_growth=fundamentals.get("profit_growth"),
            earnings_growth_5y=None,
            rsi=round(technicals.get("rsi"), 2) if technicals.get("rsi") else None,
            macd=None,
            macd_signal=None,
            macd_histogram=None,
            dma_50=round(technicals.get("dma_50"), 2) if technicals.get("dma_50") else None,
            dma_200=round(technicals.get("dma_200"), 2) if technicals.get("dma_200") else None,
            volume=volume,
            avg_volume=avg_volume,
            volume_ratio=round(volume_ratio, 2) if volume_ratio else None,
            beta=fundamentals.get("beta"),
            company_name=price.get("company_name") or fundamentals.get("company_name") or ticker,
            sector=fundamentals.get("sector"),
            industry=fundamentals.get("industry"),
            exchange=price.get("exchange"),
            currency="INR",
        )