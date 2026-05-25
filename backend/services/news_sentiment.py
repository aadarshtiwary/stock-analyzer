import aiohttp
import logging
from typing import List, Optional
from datetime import datetime, timedelta
import json

from core.config import settings

logger = logging.getLogger(__name__)


class NewsSentimentService:
    """Fetches recent news headlines and analyzes sentiment via OpenAI."""

    FINNHUB_BASE = "https://finnhub.io/api/v1"

    async def get_news_sentiment(
        self, ticker: str, days: int = 7
    ) -> dict:
        """Fetch news and return sentiment analysis."""
        headlines = await self._fetch_headlines(ticker, days)
        if not headlines:
            return {
                "sentiment": "Neutral",
                "score": 0.5,
                "headline_count": 0,
                "headlines": [],
                "summary": "No recent news found for this ticker.",
            }

        sentiment_data = await self._analyze_sentiment(ticker, headlines)
        return sentiment_data

    async def _fetch_headlines(
        self, ticker: str, days: int = 7
    ) -> List[dict]:
        """Fetch news from Finnhub API."""
        api_key = settings.FINNHUB_API_KEY
        if not api_key:
            logger.warning("FINNHUB_API_KEY not configured, skipping news fetch")
            return []

        # Clean ticker for Finnhub (remove exchange suffix)
        clean_ticker = ticker.replace(".NS", "").replace(".BO", "")

        today = datetime.utcnow()
        from_date = (today - timedelta(days=days)).strftime("%Y-%m-%d")
        to_date = today.strftime("%Y-%m-%d")

        url = f"{self.FINNHUB_BASE}/company-news"
        params = {
            "symbol": clean_ticker,
            "from": from_date,
            "to": to_date,
            "token": api_key,
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                    if resp.status == 200:
                        news = await resp.json()
                        return [
                            {
                                "headline": item.get("headline", ""),
                                "source": item.get("source", ""),
                                "published_at": item.get("datetime", 0),
                                "url": item.get("url", ""),
                                "summary": item.get("summary", "")[:200],
                            }
                            for item in news[:15]
                            if item.get("headline")
                        ]
                    else:
                        logger.warning(f"Finnhub returned {resp.status} for {ticker}")
                        return []
        except Exception as e:
            logger.error(f"News fetch error for {ticker}: {e}")
            return []

    async def _analyze_sentiment(
        self, ticker: str, headlines: List[dict]
    ) -> dict:
        """Use OpenAI to analyze sentiment of headlines."""
        if not settings.OPENAI_API_KEY:
            return self._rule_based_sentiment(headlines)

        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

        headline_text = "\n".join(
            f"- {h['headline']} ({h['source']})"
            for h in headlines[:10]
        )

        prompt = f"""Analyze the sentiment of these recent news headlines for {ticker}.

Headlines:
{headline_text}

Respond ONLY with JSON:
{{
  "sentiment": "Bullish|Bearish|Neutral",
  "score": 0.0-1.0,
  "key_themes": ["theme1", "theme2"],
  "summary": "2-sentence summary of news sentiment",
  "notable_events": ["event1", "event2"]
}}"""

        try:
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                response_format={"type": "json_object"},
                max_tokens=300,
            )
            data = json.loads(response.choices[0].message.content)
            data["headline_count"] = len(headlines)
            data["headlines"] = headlines[:5]
            return data
        except Exception as e:
            logger.error(f"Sentiment analysis failed: {e}")
            return self._rule_based_sentiment(headlines)

    def _rule_based_sentiment(self, headlines: List[dict]) -> dict:
        """Simple keyword-based sentiment as fallback."""
        positive_words = {"profit", "growth", "strong", "beat", "record", "rise", "gain", "surge", "buy", "upgrade"}
        negative_words = {"loss", "decline", "miss", "weak", "cut", "fall", "drop", "debt", "risk", "downgrade"}

        pos_count = 0
        neg_count = 0
        for h in headlines:
            text = h["headline"].lower()
            pos_count += sum(1 for w in positive_words if w in text)
            neg_count += sum(1 for w in negative_words if w in text)

        total = pos_count + neg_count
        if total == 0:
            score = 0.5
            sentiment = "Neutral"
        elif pos_count > neg_count:
            score = min(0.5 + (pos_count - neg_count) / total * 0.5, 0.95)
            sentiment = "Bullish"
        else:
            score = max(0.5 - (neg_count - pos_count) / total * 0.5, 0.05)
            sentiment = "Bearish"

        return {
            "sentiment": sentiment,
            "score": round(score, 2),
            "key_themes": [],
            "summary": f"Based on {len(headlines)} headlines, sentiment appears {sentiment.lower()}.",
            "notable_events": [],
            "headline_count": len(headlines),
            "headlines": headlines[:5],
        }
