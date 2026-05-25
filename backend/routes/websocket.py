"""
WebSocket endpoint for live price streaming.
Broadcasts real-time price updates to connected clients.
"""
import asyncio
import json
import logging
from typing import Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import yfinance as yf

router = APIRouter()
logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections and ticker subscriptions."""

    def __init__(self):
        # Map ticker -> set of connected websockets
        self.subscriptions: Dict[str, Set[WebSocket]] = {}
        self._tasks: Dict[str, asyncio.Task] = {}

    async def connect(self, websocket: WebSocket, ticker: str):
        await websocket.accept()
        ticker = ticker.upper()
        if ticker not in self.subscriptions:
            self.subscriptions[ticker] = set()
        self.subscriptions[ticker].add(websocket)
        logger.info(f"WS connected: {ticker} ({len(self.subscriptions[ticker])} clients)")

        # Start polling task if not already running
        if ticker not in self._tasks or self._tasks[ticker].done():
            self._tasks[ticker] = asyncio.create_task(self._poll_price(ticker))

    def disconnect(self, websocket: WebSocket, ticker: str):
        ticker = ticker.upper()
        if ticker in self.subscriptions:
            self.subscriptions[ticker].discard(websocket)
            if not self.subscriptions[ticker]:
                del self.subscriptions[ticker]
                # Cancel polling if no listeners
                if ticker in self._tasks:
                    self._tasks[ticker].cancel()
                    del self._tasks[ticker]
        logger.info(f"WS disconnected: {ticker}")

    async def broadcast(self, ticker: str, data: dict):
        """Send data to all clients subscribed to a ticker."""
        if ticker not in self.subscriptions:
            return
        dead = set()
        for ws in self.subscriptions[ticker].copy():
            try:
                await ws.send_text(json.dumps(data))
            except Exception:
                dead.add(ws)
        # Clean up dead connections
        for ws in dead:
            self.subscriptions[ticker].discard(ws)

    async def _poll_price(self, ticker: str):
        """Poll yfinance every 15 seconds and broadcast to subscribers."""
        while ticker in self.subscriptions and self.subscriptions[ticker]:
            try:
                loop = asyncio.get_event_loop()
                data = await loop.run_in_executor(None, _fetch_price, ticker)
                if data:
                    await self.broadcast(ticker, data)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Price poll error {ticker}: {e}")
            await asyncio.sleep(15)


def _fetch_price(ticker: str) -> dict:
    """Sync yfinance fetch — runs in executor."""
    try:
        stock = yf.Ticker(ticker)
        info = stock.info or {}
        price = info.get("currentPrice") or info.get("regularMarketPrice")
        prev = info.get("previousClose") or info.get("regularMarketPreviousClose")
        change_pct = ((price - prev) / prev * 100) if price and prev and prev != 0 else None
        return {
            "ticker": ticker,
            "price": price,
            "prev_close": prev,
            "change_pct": round(change_pct, 2) if change_pct else None,
            "volume": info.get("regularMarketVolume"),
            "timestamp": asyncio.get_event_loop().time(),
        }
    except Exception as e:
        logger.error(f"WS price fetch error {ticker}: {e}")
        return {}


manager = ConnectionManager()


@router.websocket("/ws/price/{ticker}")
async def price_websocket(websocket: WebSocket, ticker: str):
    """
    Connect to live price stream for a ticker.

    Client receives JSON every ~15 seconds:
    {
      "ticker": "INFY.NS",
      "price": 1847.35,
      "prev_close": 1821.00,
      "change_pct": 1.44,
      "volume": 2453210,
      "timestamp": 1234567.89
    }
    """
    ticker = ticker.upper()
    await manager.connect(websocket, ticker)
    try:
        while True:
            # Keep connection alive; client can send "ping"
            msg = await websocket.receive_text()
            if msg == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        manager.disconnect(websocket, ticker)
    except Exception as e:
        logger.error(f"WS error {ticker}: {e}")
        manager.disconnect(websocket, ticker)
