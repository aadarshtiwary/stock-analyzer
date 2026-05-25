"""
Simple in-memory cache with TTL.
Reduces duplicate yfinance/OpenAI calls within short windows.
Drop-in replacement: can swap for Redis by changing the backend.
"""
import time
import asyncio
import logging
from typing import Any, Optional
from collections import OrderedDict

logger = logging.getLogger(__name__)


class TTLCache:
    """Thread-safe in-memory LRU cache with per-entry TTL."""

    def __init__(self, maxsize: int = 256):
        self._store: OrderedDict[str, tuple[Any, float]] = OrderedDict()
        self._maxsize = maxsize
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[Any]:
        async with self._lock:
            if key not in self._store:
                return None
            value, expires_at = self._store[key]
            if time.monotonic() > expires_at:
                del self._store[key]
                return None
            # Move to end (LRU)
            self._store.move_to_end(key)
            return value

    async def set(self, key: str, value: Any, ttl: int = 300) -> None:
        """Cache a value with TTL in seconds (default 5 min)."""
        async with self._lock:
            expires_at = time.monotonic() + ttl
            if key in self._store:
                self._store.move_to_end(key)
            self._store[key] = (value, expires_at)
            # Evict oldest if over capacity
            if len(self._store) > self._maxsize:
                self._store.popitem(last=False)

    async def delete(self, key: str) -> None:
        async with self._lock:
            self._store.pop(key, None)

    async def clear(self) -> None:
        async with self._lock:
            self._store.clear()

    def size(self) -> int:
        return len(self._store)


# ── Singleton instances ─────────────────────────────────────────────────────

# Stock data: 5-minute TTL (prices refresh often)
stock_cache = TTLCache(maxsize=512)

# AI analysis: 30-minute TTL (expensive GPT calls)
ai_cache = TTLCache(maxsize=128)

# Sector heatmap: 15-minute TTL
heatmap_cache = TTLCache(maxsize=32)

# News sentiment: 10-minute TTL
news_cache = TTLCache(maxsize=128)


def cache_key(prefix: str, ticker: str) -> str:
    return f"{prefix}:{ticker.upper()}"
