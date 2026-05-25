# StockSage API Reference

Base URL: `http://localhost:8000/api` (dev) · `https://your-api.railway.app/api` (prod)

All endpoints return JSON. Error responses include `{"detail": "..."}`.

---

## Analysis

### `GET /analyze/{ticker}`
Analyze a stock. Returns score, verdict, metrics, and AI insights.

**Parameters**
| Param | Type | Default | Description |
|---|---|---|---|
| `ticker` | path | required | NSE: `INFY.NS`, BSE: `INFY.BO`, US: `AAPL` |
| `skip_ai` | query | `false` | Skip GPT analysis (faster, cheaper) |
| `force_refresh` | query | `false` | Bypass 5-minute cache |

**Response `200`**
```json
{
  "ticker": "INFY.NS",
  "company_name": "Infosys Limited",
  "score": 7.5,
  "verdict": "BUY",
  "metrics": {
    "current_price": 1847.35,
    "pe_ratio": 24.1,
    "roe": 32.1,
    "debt_to_equity": 0.08,
    "revenue_growth": 14.2,
    "rsi": 58.4,
    "dma_50": 1762.0,
    "dma_200": 1706.0
  },
  "metric_results": [
    { "name": "roe", "display_value": "32.1%", "threshold": "> 15%", "passed": true, "score_contribution": 2.0 }
  ],
  "ai_analysis": {
    "summary": "...",
    "strengths": ["Strong ROE", "Low debt"],
    "weaknesses": ["Premium valuation"],
    "risk_level": "Low",
    "recommendation": "...",
    "time_horizon": "Medium-term (3-12 months)",
    "target_price_range": "₹1,950–₹2,100"
  },
  "analyzed_at": "2025-01-15T10:30:00Z",
  "data_quality": "High"
}
```

**Errors**
- `404` — Ticker not found or no price data
- `429` — Rate limit exceeded (20 req/min for analyze)
- `500` — Fetch or analysis failure

---

## Watchlist

### `GET /watchlist`
Returns all watchlist items sorted by most recently added.

### `POST /watchlist/add`
Add a stock to watchlist.
```json
{ "ticker": "INFY.NS", "notes": "Looking for entry at 200 DMA" }
```

### `DELETE /watchlist/{ticker}`
Remove a stock from watchlist.

### `PATCH /watchlist/{ticker}/score`
Update last known score. Query params: `score=7.5&verdict=BUY`

---

## Portfolio

### `POST /portfolio/analyze`
Analyze a portfolio without saving. Returns full P&L, diversification, and AI suggestions.
```json
{
  "name": "My Portfolio",
  "holdings": [
    { "ticker": "INFY.NS", "quantity": 50, "avg_buy_price": 1750.0 },
    { "ticker": "HDFCBANK.NS", "quantity": 30, "avg_buy_price": 1620.0 }
  ]
}
```

### `POST /portfolio`
Create a named portfolio (persisted to DB).

### `GET /portfolio/{id}`
Analyze a saved portfolio by ID.

### `GET /portfolios`
List all saved portfolios.

### `POST /portfolio/{id}/holding`
Add a holding to an existing portfolio.

---

## Market Data

### `GET /news/{ticker}`
Get recent news headlines and AI sentiment analysis.

Query params: `days=7` (1–30)

Response:
```json
{
  "sentiment": "Bullish",
  "score": 0.72,
  "key_themes": ["earnings beat", "margin expansion"],
  "summary": "Positive coverage focused on strong quarterly results.",
  "headline_count": 12,
  "headlines": [{ "headline": "...", "source": "Reuters", "url": "..." }]
}
```

### `GET /earnings/{ticker}`
Get earnings calendar, EPS estimates, and analyst price targets.

### `GET /heatmap/sectors`
NSE sector-level scoring heatmap (avg score across representative stocks).

---

## Top Stocks & Scanning

### `GET /top-stocks`
BUY-rated stocks from analyses in the last 24 hours, sorted by score.
Query: `limit=10`

### `POST /scan/trigger`
Trigger autonomous agent scan of NSE universe in background.
Optional body: `["INFY.NS", "TCS.NS", ...]` to scan a custom list.

---

## Alerts

### `GET /alerts`
Get triggered alert history. Query: `ticker=INFY.NS` to filter.

Response array:
```json
[{
  "id": "uuid",
  "ticker": "INFY.NS",
  "alert_type": "rsi_overbought",
  "condition": "RSI > 70",
  "threshold_value": 70.0,
  "current_value": 78.4,
  "triggered_at": "2025-01-15T09:15:00Z"
}]
```

**Alert types:**
- `rsi_overbought` — RSI crossed above 70
- `rsi_oversold` — RSI dropped below 30
- `price_below_200dma` — Price fell below 200-day moving average

---

## Cache Management

### `DELETE /cache/{ticker}`
Invalidate all cached data for a ticker (analysis, AI, news).

---

## WebSocket

### `WS /ws/price/{ticker}`
Subscribe to live price stream. Broadcasts every ~15 seconds.

```javascript
const ws = new WebSocket("ws://localhost:8000/ws/price/INFY.NS");
ws.onmessage = (e) => {
  const { ticker, price, change_pct, volume } = JSON.parse(e.data);
};
// Keep alive
setInterval(() => ws.send("ping"), 30000);
```

---

## Health

### `GET /health`
Server health + cache stats.
```json
{
  "status": "ok",
  "service": "Stock Analyzer API",
  "cache": { "stock": 12, "ai": 5, "heatmap": 1, "news": 8 }
}
```

---

## Rate Limits

| Endpoint group | Limit |
|---|---|
| `/analyze/*` | 20 requests/minute per IP |
| All other endpoints | 60 requests/minute per IP |

Rate limit exceeded → `HTTP 429` with `retry_after: 60`

---

## Supported Exchanges

| Exchange | Suffix | Example |
|---|---|---|
| NSE (India) | `.NS` | `RELIANCE.NS` |
| BSE (India) | `.BO` | `RELIANCE.BO` |
| NYSE/NASDAQ | none | `AAPL`, `TSLA` |

> **Note:** Promoter holding data is NSE-specific and may not be available via yfinance.
> For complete Indian market data, consider integrating the NSE India unofficial API or Screener.in.
