"""
Simple in-process rate limiter using token bucket algorithm.
Limits requests per IP to prevent API abuse.
"""
import time
import asyncio
from collections import defaultdict
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
import logging

logger = logging.getLogger(__name__)


class RateLimiter:
    """Token bucket rate limiter."""

    def __init__(self, requests_per_minute: int = 30):
        self.rpm = requests_per_minute
        self.tokens_per_second = requests_per_minute / 60.0
        self._buckets: dict[str, tuple[float, float]] = {}  # ip -> (tokens, last_refill)
        self._lock = asyncio.Lock()

    async def is_allowed(self, client_ip: str) -> bool:
        async with self._lock:
            now = time.monotonic()
            if client_ip not in self._buckets:
                self._buckets[client_ip] = (self.rpm, now)
                return True

            tokens, last_refill = self._buckets[client_ip]
            elapsed = now - last_refill
            tokens = min(self.rpm, tokens + elapsed * self.tokens_per_second)

            if tokens >= 1:
                self._buckets[client_ip] = (tokens - 1, now)
                return True
            else:
                self._buckets[client_ip] = (tokens, now)
                return False

    async def cleanup(self):
        """Remove stale entries older than 10 minutes."""
        async with self._lock:
            now = time.monotonic()
            stale = [ip for ip, (_, ts) in self._buckets.items() if now - ts > 600]
            for ip in stale:
                del self._buckets[ip]


# Separate limiters for different endpoint types
analyze_limiter = RateLimiter(requests_per_minute=20)   # AI analysis — heavier
general_limiter = RateLimiter(requests_per_minute=60)   # General API calls


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"

        # Apply tighter limit to analyze endpoints
        if "/analyze/" in request.url.path:
            allowed = await analyze_limiter.is_allowed(client_ip)
            limit_type = "analyze"
        else:
            allowed = await general_limiter.is_allowed(client_ip)
            limit_type = "general"

        if not allowed:
            logger.warning(f"Rate limit exceeded: {client_ip} on {request.url.path}")
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "Rate limit exceeded",
                    "message": f"Too many requests. Limit: {analyze_limiter.rpm if limit_type == 'analyze' else general_limiter.rpm} req/min",
                    "retry_after": 60,
                },
            )

        response = await call_next(request)
        return response
