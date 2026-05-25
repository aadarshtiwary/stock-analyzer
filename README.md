# 📈 StockSage — Agentic AI Stock Analyzer

A full-stack AI-powered stock analysis platform for Indian markets (NSE/BSE).
Analyzes any stock ticker, evaluates against 10+ quality thresholds, generates a score,
and delivers GPT-4o investor insights — all in seconds.

---

## ✨ Features

| Feature | Details |
|---|---|
| 🔍 Live Data Fetch | Yahoo Finance: price, PE, ROE, debt, growth, RSI, MACD, 50/200 DMA |
| 📊 Scoring Engine | 10-point threshold evaluation (ROE, debt, growth, RSI, trend) |
| 🤖 AI Insights | GPT-4o: strengths, weaknesses, valuation, momentum, recommendation |
| 📉 TradingView Chart | Interactive candlestick chart with RSI, MACD overlays |
| 🔖 Watchlist | Save stocks, refresh scores, track changes |
| 🚨 Alerts | Auto-generated on RSI overbought, price < 200 DMA, etc. |
| 🤖 Autonomous Agent | Daily scan of NSE universe, identifies BUY opportunities |
| 📲 Notifications | Telegram bot + email (SendGrid) alerts |

---

## 🏗️ Architecture

```
stock-analyzer/
├── backend/                   # FastAPI + Python
│   ├── agents/
│   │   ├── ai_insight.py      # OpenAI GPT-4o analysis agent
│   │   └── autonomous.py      # Daily autonomous scanning agent
│   ├── services/
│   │   ├── stock_data.py      # yfinance + technical indicator calculations
│   │   ├── scoring.py         # Threshold evaluation & scoring engine
│   │   └── notifications.py   # Telegram + SendGrid notifications
│   ├── rules/
│   │   └── thresholds.py      # Configurable threshold rules
│   ├── routes/
│   │   ├── analyze.py         # GET /analyze/{ticker}
│   │   ├── watchlist.py       # GET/POST/DELETE /watchlist
│   │   ├── top_stocks.py      # GET /top-stocks
│   │   └── alerts.py          # GET /alerts
│   ├── models/
│   │   ├── schemas.py         # Pydantic response models
│   │   └── db_models.py       # SQLAlchemy ORM models
│   └── core/
│       ├── config.py          # Environment-based settings
│       └── database.py        # Async PostgreSQL setup
│
└── frontend/                  # Next.js 14 + TypeScript + Tailwind
    ├── app/
    │   ├── page.tsx            # Homepage with search
    │   ├── analyze/[ticker]/   # Analysis dashboard
    │   ├── watchlist/          # Watchlist manager
    │   ├── top-stocks/         # Top-scored stocks
    │   └── alerts/             # Alert history
    ├── components/
    │   ├── dashboard/
    │   │   ├── ScoreRing.tsx   # Animated score visualization
    │   │   ├── VerdictBanner   # BUY/WATCH/AVOID banner
    │   │   ├── PriceHeader     # Company info + price
    │   │   ├── MetricCards     # 12 key metric cards
    │   │   ├── MetricsTable    # Pass/fail threshold table
    │   │   └── AIInsightPanel  # GPT-4o analysis display
    │   ├── charts/
    │   │   └── TradingViewChart # Embedded TradingView widget
    │   └── ui/
    │       ├── Navigation.tsx
    │       └── SkeletonLoader
    ├── services/api.ts         # Axios API client
    └── types/index.ts          # TypeScript interfaces
```

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 15+ (or Supabase account)
- OpenAI API key

---

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/stock-analyzer.git
cd stock-analyzer
```

---

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
```

Edit `.env` and fill in:

```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/stockanalyzer
OPENAI_API_KEY=sk-...
```

```bash
# Start the backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

API docs available at: `http://localhost:8000/docs`

---

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

```bash
# Start the frontend
npm run dev
```

Open: `http://localhost:3000`

---

### 4. Docker Compose (All-in-One)

```bash
# From root directory
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
# Fill in your API keys in both files

docker-compose up --build
```

Services:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Postgres: localhost:5432

---

## 🔑 API Keys Setup

### OpenAI (Required for AI insights)
1. Go to https://platform.openai.com/api-keys
2. Create a new key
3. Add to backend `.env`: `OPENAI_API_KEY=sk-...`

### Telegram Alerts (Optional)
1. Create a bot via @BotFather on Telegram
2. Get the bot token
3. Start a conversation and get your chat ID via https://api.telegram.org/bot{TOKEN}/getUpdates
4. Add to `.env`:
   ```
   TELEGRAM_BOT_TOKEN=123456:ABC...
   TELEGRAM_CHAT_ID=-100...
   ```

### SendGrid Email Alerts (Optional)
1. Create account at https://sendgrid.com
2. Create an API key with "Mail Send" permission
3. Verify a sender email
4. Add to `.env`:
   ```
   SENDGRID_API_KEY=SG...
   ALERT_FROM_EMAIL=alerts@yourdomain.com
   ```

### Alpha Vantage (Optional, for additional data)
1. Get free key at https://www.alphavantage.co/support/#api-key
2. Add: `ALPHA_VANTAGE_API_KEY=your_key`

---

## 📡 API Reference

### Analyze a Stock
```http
GET /api/analyze/{ticker}
```
Example: `GET /api/analyze/INFY.NS`

Response:
```json
{
  "ticker": "INFY.NS",
  "company_name": "Infosys Limited",
  "score": 7.5,
  "verdict": "BUY",
  "metrics": { "current_price": 1850.4, "roe": 32.1, "pe_ratio": 24.5, ... },
  "metric_results": [{ "name": "roe", "passed": true, "display_value": "32.1%", ... }],
  "ai_analysis": { "summary": "...", "strengths": [...], ... },
  "data_quality": "High"
}
```

### Watchlist
```http
GET    /api/watchlist              # Get all
POST   /api/watchlist/add          # Add: { "ticker": "INFY.NS" }
DELETE /api/watchlist/{ticker}     # Remove
```

### Top Stocks
```http
GET  /api/top-stocks               # BUY-rated stocks from last 24h
POST /api/scan/trigger             # Trigger autonomous scan
```

### Alerts
```http
GET /api/alerts                    # All alerts
GET /api/alerts?ticker=INFY.NS    # Filtered by ticker
```

---

## 📊 Scoring Thresholds

| Metric | Threshold | Score |
|--------|-----------|-------|
| ROE | > 15% | 2.0 |
| ROCE | > 15% | 1.5 |
| Debt/Equity | < 0.5x | 2.0 |
| Revenue Growth | > 10% YoY | 1.5 |
| Profit Growth | > 10% YoY | 1.5 |
| Promoter Holding | > 40% | 1.0 |
| RSI | 50–70 | 1.5 |
| Price vs 200 DMA | Above | 1.5 |
| P/B Ratio | < 5x | 1.0 |
| Current Ratio | > 1.5x | 0.5 |
| **Total** | | **15.5 → normalized to 10** |

**Verdict logic:**
- Score ≥ 7.5 → **BUY**
- Score 5.0–7.4 → **WATCH**
- Score < 5.0 → **AVOID**
- Override: Debt/Equity > 2.0 → **AVOID** (hard fail)

---

## 🌐 Supported Tickers

| Exchange | Suffix | Example |
|----------|--------|---------|
| NSE India | `.NS` | `RELIANCE.NS` |
| BSE India | `.BO` | `RELIANCE.BO` |
| US stocks | none | `AAPL`, `TSLA` |

---

## ☁️ Production Deployment

### Frontend → Vercel

```bash
# Install Vercel CLI
npm i -g vercel

cd frontend
vercel

# Set environment variable in Vercel dashboard:
# NEXT_PUBLIC_API_URL = https://your-backend.railway.app/api
```

### Backend → Railway

1. Connect GitHub repo at https://railway.app
2. Select the `backend/` directory
3. Add environment variables (all keys from `.env`)
4. Railway auto-detects Python and deploys

### Database → Supabase

1. Create project at https://supabase.com
2. Copy the connection string (PostgreSQL format)
3. Use: `DATABASE_URL=postgresql+asyncpg://postgres:[password]@db.[ref].supabase.co:5432/postgres`
4. Tables are auto-created on first startup

---

## 🔄 Autonomous Daily Scan

To schedule daily scans, add a cron job (Railway supports cron services):

```bash
# Run scan every day at 7:30 AM IST (2:00 UTC)
curl -X POST https://your-backend.railway.app/api/scan/trigger
```

Or use Railway's built-in scheduler pointing to:
`POST /api/scan/trigger`

---

## 🛠️ Customizing Thresholds

Edit `backend/rules/thresholds.py` to change evaluation criteria:

```python
ThresholdRule(
    name="roe",
    display_name="Return on Equity (ROE)",
    threshold_type=ThresholdType.GREATER_THAN,
    value=20.0,   # ← Change threshold here
    weight=2.0,
    max_score=2.0,
)
```

---

## 🔒 Disclaimer

> StockSage is an educational tool. All analysis is AI-generated and based on publicly available data.
> **This is not financial advice.** Always consult a SEBI-registered investment advisor before making investment decisions.

---

## 📝 License

MIT License — free to use, modify, and distribute.
