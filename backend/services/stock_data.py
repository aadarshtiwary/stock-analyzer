import yfinance as yf
import pandas as pd
import numpy as np
from typing import Optional, Dict, Any
import aiohttp
import asyncio
from datetime import datetime, timedelta
import logging
import requests

from models.schemas import StockMetrics

logger = logging.getLogger(__name__)


class StockDataService:
    """Fetches stock fundamentals, technicals, and metadata."""

    async def fetch_all(self, ticker: str) -> StockMetrics:
        """Fetch all metrics for a ticker."""
        loop = asyncio.get_event_loop()
        yf_data = await loop.run_in_executor(None, self._fetch_yfinance, ticker)
        technicals = await self._fetch_technicals(ticker, yf_data.get("history"))
        return self._build_metrics(ticker, yf_data, technicals)

    def _get_session(self):
        """Create a requests session that mimics a browser."""
        session = requests.Session()
        session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "*/*",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
        })
        return session

    def _fetch_yfinance(self, ticker: str) -> Dict[str, Any]:
        """Fetch fundamental data from yfinance with multiple fallback methods."""
        
        # Method 1 — try with custom session
        try:
            session = self._get_session()
            stock = yf.Ticker(ticker, session=session)
            
            # Try fast_info first (more reliable on cloud)
            info = {}
            try:
                fast = stock.fast_info
                info["currentPrice"] = getattr(fast, "last_price", None)
                info["previousClose"] = getattr(fast, "previous_close", None)
                info["marketCap"] = getattr(fast, "market_cap", None)
                info["currency"] = getattr(fast, "currency", "INR")
                info["exchange"] = getattr(fast, "exchange", None)
                logger.info(f"fast_info price for {ticker}: {info.get('currentPrice')}")
            except Exception as e:
                logger.warning(f"fast_info failed for {ticker}: {e}")

            # Try full info (sometimes blocked on cloud)
            try:
                full_info = stock.info or {}
                # Merge — full_info overrides fast_info where available
                for key, val in full_info.items():
                    if val is not None and val != 0:
                        info[key] = val
            except Exception as e:
                logger.warning(f"full info failed for {ticker}: {e}")

            # Get history
            hist = pd.DataFrame()
            hist_6m = pd.DataFrame()
            try:
                hist = stock.history(period="1y", auto_adjust=True)
                hist_6m = stock.history(period="6mo", auto_adjust=True)
            except Exception as e:
                logger.warning(f"history failed for {ticker}: {e}")

            # If we at least have a price, return what we have
            if info.get("currentPrice") or info.get("regularMarketPrice"):
                return {"info": info, "history": hist, "history_6m": hist_6m}

        except Exception as e:
            logger.error(f"Method 1 failed for {ticker}: {e}")

        # Method 2 — try without session
        try:
            stock = yf.Ticker(ticker)
            info = stock.info or {}
            hist = stock.history(period="1y")
            
            if info.get("currentPrice") or info.get("regularMarketPrice"):
                logger.info(f"Method 2 succeeded for {ticker}")
                return {"info": info, "history": hist, "history_6m": pd.DataFrame()}
        except Exception as e:
            logger.error(f"Method 2 failed for {ticker}: {e}")

        # Method 3 — try download instead of history
        try:
            session = self._get_session()
            stock = yf.Ticker(ticker, session=session)
            
            df = yf.download(
                ticker,
                period="1y",
                auto_adjust=True,
                progress=False,
                session=session,
            )
            
            info = {}
            try:
                fast = stock.fast_info
                info["currentPrice"] = getattr(fast, "last_price", None)
                info["previousClose"] = getattr(fast, "previous_close", None)
                info["marketCap"] = getattr(fast, "market_cap", None)
            except Exception:
                # Use last row of downloaded data as price
                if not df.empty:
                    info["currentPrice"] = float(df["Close"].iloc[-1])
                    info["previousClose"] = float(df["Close"].iloc[-2]) if len(df) > 1 else None

            if info.get("currentPrice"):
                logger.info(f"Method 3 (download) succeeded for {ticker}")
                return {"info": info, "history": df, "history_6m": df}

        except Exception as e:
            logger.error(f"Method 3 failed for {ticker}: {e}")

        logger.error(f"All methods failed for {ticker}")
        return {"info": {}, "history": pd.DataFrame(), "history_6m": pd.DataFrame()}

    async def _fetch_technicals(
        self, ticker: str, history: Optional[pd.DataFrame]
    ) -> Dict[str, Any]:
        """Calculate RSI, MACD, SMAs from historical data."""
        if history is None or history.empty:
            return {}

        try:
            # Handle multi-level columns from yf.download
            if isinstance(history.columns, pd.MultiIndex):
                history.columns = history.columns.get_level_values(0)

            close = history["Close"]
            if close.empty:
                return {}

            rsi = self._calculate_rsi(close, 14)
            macd_line, signal_line, histogram = self._calculate_macd(close)
            dma_50 = close.rolling(window=50).mean().iloc[-1] if len(close) >= 50 else None
            dma_200 = close.rolling(window=200).mean().iloc[-1] if len(close) >= 200 else None
            avg_volume = history["Volume"].rolling(window=20).mean().iloc[-1] if "Volume" in history.columns else None
            current_volume = history["Volume"].iloc[-1] if "Volume" in history.columns else None

            return {
                "rsi": float(rsi.iloc[-1]) if not pd.isna(rsi.iloc[-1]) else None,
                "macd": float(macd_line.iloc[-1]) if not pd.isna(macd_line.iloc[-1]) else None,
                "macd_signal": float(signal_line.iloc[-1]) if not pd.isna(signal_line.iloc[-1]) else None,
                "macd_histogram": float(histogram.iloc[-1]) if not pd.isna(histogram.iloc[-1]) else None,
                "dma_50": float(dma_50) if dma_50 and not pd.isna(dma_50) else None,
                "dma_200": float(dma_200) if dma_200 and not pd.isna(dma_200) else None,
                "current_volume": float(current_volume) if current_volume and not pd.isna(current_volume) else None,
                "avg_volume": float(avg_volume) if avg_volume and not pd.isna(avg_volume) else None,
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

    def _calculate_macd(self, close: pd.Series, fast=12, slow=26, signal=9):
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

        current_price = info.get("currentPrice") or info.get("regularMarketPrice")
        prev_close = info.get("previousClose") or info.get("regularMarketPreviousClose")
        price_change_pct = None
        if current_price and prev_close and prev_close != 0:
            price_change_pct = ((current_price - prev_close) / prev_close) * 100

        market_cap = info.get("marketCap")
        market_cap_cr = round(market_cap / 1e7, 2) if market_cap else None

        revenue_growth = info.get("revenueGrowth")
        if revenue_growth:
            revenue_growth = revenue_growth * 100

        earnings_growth = info.get("earningsGrowth")
        if earnings_growth:
            earnings_growth = earnings_growth * 100

        profit_growth = info.get("earningsQuarterlyGrowth")
        if profit_growth:
            profit_growth = profit_growth * 100

        volume = technicals.get("current_volume")
        avg_volume = technicals.get("avg_volume")
        volume_ratio = (volume / avg_volume) if volume and avg_volume and avg_volume > 0 else None

        return StockMetrics(
            current_price=current_price,
            prev_close=prev_close,
            price_change_pct=round(price_change_pct, 2) if price_change_pct else None,
            market_cap=market_cap,
            market_cap_cr=market_cap_cr,
            pe_ratio=info.get("trailingPE") or info.get("forwardPE"),
            pb_ratio=info.get("priceToBook"),
            sector_pe=None,
            pe_vs_sector=None,
            ev_ebitda=info.get("enterpriseToEbitda"),
            dividend_yield=round(info.get("dividendYield", 0) * 100, 2) if info.get("dividendYield") else None,
            roe=round(info.get("returnOnEquity", 0) * 100, 2) if info.get("returnOnEquity") else None,
            roce=None,
            debt_to_equity=info.get("debtToEquity"),
            current_ratio=info.get("currentRatio"),
            promoter_holding=None,
            revenue_growth=round(revenue_growth, 2) if revenue_growth else None,
            profit_growth=round(profit_growth, 2) if profit_growth else None,
            earnings_growth_5y=round(earnings_growth, 2) if earnings_growth else None,
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
            company_name=info.get("longName") or info.get("shortName") or ticker,
            sector=info.get("sector"),
            industry=info.get("industry"),
            exchange=info.get("exchange"),
            currency=info.get("currency", "INR"),
        )