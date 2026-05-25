from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import uvicorn

from routes import analyze, watchlist, top_stocks, alerts, portfolio, news, heatmap
from routes.websocket import router as ws_router
from routes import earnings as earnings_route
from core.database import init_db
from core.config import settings
from core.rate_limit import RateLimitMiddleware
from core.cache import stock_cache, ai_cache, heatmap_cache, news_cache
from services.keep_alive import keep_alive_loop


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()

    # Start keep-alive background task (for Render free tier)
    task = asyncio.create_task(keep_alive_loop())

    yield

    # Shutdown
    task.cancel()
    await stock_cache.clear()
    await ai_cache.clear()


app = FastAPI(
    title="Stock Analyzer API",
    description="Agentic AI-powered stock analysis engine",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(RateLimitMiddleware)

app.include_router(analyze.router, prefix="/api", tags=["Analysis"])
app.include_router(watchlist.router, prefix="/api", tags=["Watchlist"])
app.include_router(top_stocks.router, prefix="/api", tags=["Top Stocks"])
app.include_router(alerts.router, prefix="/api", tags=["Alerts"])
app.include_router(portfolio.router, prefix="/api", tags=["Portfolio"])
app.include_router(news.router, prefix="/api", tags=["News & Sentiment"])
app.include_router(heatmap.router, prefix="/api", tags=["Heatmap"])
app.include_router(earnings_route.router, prefix="/api", tags=["Earnings"])
app.include_router(ws_router, tags=["WebSocket"])


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "Stock Analyzer API",
        "cache": {
            "stock": stock_cache.size(),
            "ai": ai_cache.size(),
            "heatmap": heatmap_cache.size(),
            "news": news_cache.size(),
        },
    }


@app.delete("/api/cache/{ticker}")
async def invalidate_cache(ticker: str):
    """Manually invalidate cache for a ticker (admin use)."""
    ticker = ticker.upper()
    from core.cache import cache_key
    await stock_cache.delete(cache_key("analysis", ticker))
    await ai_cache.delete(cache_key("ai", ticker))
    await news_cache.delete(cache_key("news", ticker))
    return {"message": f"Cache cleared for {ticker}"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
