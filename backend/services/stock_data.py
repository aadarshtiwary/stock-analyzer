import yfinance as yf
import pandas as pd
import numpy as np
from typing import Optional, Dict, Any
import aiohttp
import asyncio
from datetime import datetime, timedelta
import logging

from core.config import settings
from models.schemas import StockMetrics

logger = logging.getLogger(__name__)


class StockDataService:
    """Fetches stock fundamentals, technicals, and metadata."""

    def __init__(self):
        self.av_key = settings.ALPHA_VANTAGE_API_KEY

    async def fetch_all(self, ticker: str) -> StockMetrics:
        """Fetch all metrics for a ticker, combining multiple sources."""
        # Run yfinance fetch in executor (it's sync)
        loop = asyncio.get_event_loop()
        yf_data = await loop.run_in_executor(None, self._fetch_yfinance, ticker)

        # Fetch technical indicators
        technicals = await self._fetch_technicals(ticker, yf_data.get("history"))

        # Merge all data
        return self._build_metrics(ticker, yf_data, technicals)

    def _fetch_yfinance(self, ticker: str) -> Dict[str, Any]:
    """Fetch fundamental data from yfinance."""
    try:
        # Fix for cloud servers — set session headers to avoid blocks
        import requests
        session = requests.Session()
        session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
        })

        stock = yf.Ticker(ticker, session=session)
        info = stock.info or {}

        # If info is empty or missing price, try fast_info
        if not info.get("currentPrice") and not info.get("regularMarketPrice"):
            try:
                fast = stock.fast_info
                if fast:
                    info["currentPrice"] = getattr(fast, "last_price", None)
                    info["previousClose"] = getattr(fast, "previous_close", None)
                    info["marketCap"] = getattr(fast, "market_cap", None)
            except Exception:
                pass

        # Historical price data
        hist = stock.history(period="1y")
        hist_6m = stock.history(period="6mo")

        return {
            "info": info,
            "history": hist,
            "history_6m": hist_6m,
        }
    except Exception as e:
        logger.error(f"yfinance error for {ticker}: {e}")
        return {"info": {}, "history": pd.DataFrame(), "history_6m": pd.DataFrame()}

    async def _fetch_technicals(
        self, ticker: str, history: Optional[pd.DataFrame]
    ) -> Dict[str, Any]:
        """Calculate RSI, MACD, SMAs from historical data."""
        if history is None or history.empty:
            return {}

        try:
            close = history["Close"]

            # RSI (14-period)
            rsi = self._calculate_rsi(close, 14)

            # MACD (12, 26, 9)
            macd_line, signal_line, histogram = self._calculate_macd(close)

            # Moving averages
            dma_50 = close.rolling(window=50).mean().iloc[-1] if len(close) >= 50 else None
            dma_200 = close.rolling(window=200).mean().iloc[-1] if len(close) >= 200 else None

            # Volume
            avg_volume = history["Volume"].rolling(window=20).mean().iloc[-1]
            current_volume = history["Volume"].iloc[-1]

            return {
                "rsi": float(rsi.iloc[-1]) if not pd.isna(rsi.iloc[-1]) else None,
                "macd": float(macd_line.iloc[-1]) if not pd.isna(macd_line.iloc[-1]) else None,
                "macd_signal": float(signal_line.iloc[-1]) if not pd.isna(signal_line.iloc[-1]) else None,
                "macd_histogram": float(histogram.iloc[-1]) if not pd.isna(histogram.iloc[-1]) else None,
                "dma_50": float(dma_50) if dma_50 and not pd.isna(dma_50) else None,
                "dma_200": float(dma_200) if dma_200 and not pd.isna(dma_200) else None,
                "current_volume": float(current_volume) if not pd.isna(current_volume) else None,
                "avg_volume": float(avg_volume) if not pd.isna(avg_volume) else None,
            }
        except Exception as e:
            logger.error(f"Technical calculation error for {ticker}: {e}")
            return {}

    def _calculate_rsi(self, close: pd.Series, period: int = 14) -> pd.Series:
        delta = close.diff()
        gain = delta.where(delta > 0, 0).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss.replace(0, np.nan)
        return 100 - (100 / (1 + rs))

    def _calculate_macd(
        self, close: pd.Series, fast=12, slow=26, signal=9
    ):
        ema_fast = close.ewm(span=fast, adjust=False).mean()
        ema_slow = close.ewm(span=slow, adjust=False).mean()
        macd_line = ema_fast - ema_slow
        signal_line = macd_line.ewm(span=signal, adjust=False).mean()
        histogram = macd_line - signal_line
        return macd_line, signal_line, histogram

    def _build_metrics(
        self,
        ticker: str,
        yf_data: Dict,
        technicals: Dict,
    ) -> StockMetrics:
        info = yf_data.get("info", {})
        hist = yf_data.get("history", pd.DataFrame())

        # Price data
        current_price = info.get("currentPrice") or info.get("regularMarketPrice")
        prev_close = info.get("previousClose") or info.get("regularMarketPreviousClose")
        price_change_pct = None
        if current_price and prev_close and prev_close != 0:
            price_change_pct = ((current_price - prev_close) / prev_close) * 100

        # Market cap
        market_cap = info.get("marketCap")
        market_cap_cr = round(market_cap / 1e7, 2) if market_cap else None  # Convert to Crores

        # Revenue growth (YoY)
        revenue_growth = info.get("revenueGrowth")
        if revenue_growth:
            revenue_growth = revenue_growth * 100

        earnings_growth = info.get("earningsGrowth")
        if earnings_growth:
            earnings_growth = earnings_growth * 100

        # Profit growth
        profit_growth = info.get("earningsQuarterlyGrowth")
        if profit_growth:
            profit_growth = profit_growth * 100

        # Volume ratio
        volume = technicals.get("current_volume")
        avg_volume = technicals.get("avg_volume")
        volume_ratio = (volume / avg_volume) if volume and avg_volume and avg_volume > 0 else None

        return StockMetrics(
            # Price
            current_price=current_price,
            prev_close=prev_close,
            price_change_pct=round(price_change_pct, 2) if price_change_pct else None,
            market_cap=market_cap,
            market_cap_cr=market_cap_cr,
            # Valuation
            pe_ratio=info.get("trailingPE") or info.get("forwardPE"),
            pb_ratio=info.get("priceToBook"),
            sector_pe=None,  # Requires sector-level data
            pe_vs_sector=None,
            ev_ebitda=info.get("enterpriseToEbitda"),
            dividend_yield=round(info.get("dividendYield", 0) * 100, 2) if info.get("dividendYield") else None,
            # Quality
            roe=round(info.get("returnOnEquity", 0) * 100, 2) if info.get("returnOnEquity") else None,
            roce=None,  # Not directly available from yfinance, estimated
            debt_to_equity=info.get("debtToEquity"),
            current_ratio=info.get("currentRatio"),
            promoter_holding=None,  # NSE-specific, requires separate API
            # Growth
            revenue_growth=round(revenue_growth, 2) if revenue_growth else None,
            profit_growth=round(profit_growth, 2) if profit_growth else None,
            earnings_growth_5y=round(earnings_growth, 2) if earnings_growth else None,
            # Technical
            rsi=round(technicals.get("rsi"), 2) if technicals.get("rsi") else None,
            macd=round(technicals.get("macd"), 4) if technicals.get("macd") else None,
            macd_signal=round(technicals.get("macd_signal"), 4) if technicals.get("macd_signal") else None,
            macd_histogram=round(technicals.get("macd_histogram"), 4) if technicals.get("macd_histogram") else None,
            dma_50=round(technicals.get("dma_50"), 2) if technicals.get("dma_50") else None,
            dma_200=round(technicals.get("dma_200"), 2) if technicals.get("dma_200") else None,
            volume=volume,
            avg_volume=avg_volume,
            volume_ratio=round(volume_ratio, 2) if volume_ratio else None,
            beta=info.get("beta"),
            # Company Info
            company_name=info.get("longName") or info.get("shortName") or ticker,
            sector=info.get("sector"),
            industry=info.get("industry"),
            exchange=info.get("exchange"),
            currency=info.get("currency", "INR"),
        )
