# StockSage — Free Deployment Guide

Deploy StockSage for free using:
- **Vercel** — Frontend (Next.js) — Always free
- **Render** — Backend (FastAPI) — Free tier, 750 hrs/month
- **Supabase** — Database (PostgreSQL) — Free tier, 500MB

Total cost: **$0/month**

---

## Before you start

You need:
1. A [GitHub](https://github.com) account — free
2. A [Supabase](https://supabase.com) account — free
3. A [Render](https://render.com) account — free
4. A [Vercel](https://vercel.com) account — free
5. OpenAI API key — **optional** (app works without it using built-in analysis)

---

## Step 1 — Push to GitHub

First put your code on GitHub so Vercel and Render can deploy it.

```bash
cd stock-analyzer

# Initialise git
git init
git add .
git commit -m "Initial StockSage commit"

# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR-USERNAME/stock-analyzer.git
git branch -M main
git push -u origin main
```

---

## Step 2 — Supabase (Database)

1. Go to [supabase.com](https://supabase.com) → **Start your project** → Sign up free
2. Click **New project**
   - Name: `stocksage`
   - Database password: create a strong one and **save it**
   - Region: choose closest to you (e.g. South Asia for India)
3. Wait ~2 minutes for the project to be ready
4. Go to **Settings** (gear icon) → **Database** → **Connection string** tab
5. Select **URI** format and copy the string. It looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.abcdefgh.supabase.co:5432/postgres
   ```
6. **Change** `postgresql://` to `postgresql+asyncpg://` — save this for Step 3

> The free tier gives you 500MB storage and 2GB bandwidth — plenty for this app.

---

## Step 3 — Render (Backend API)

1. Go to [render.com](https://render.com) → **Get Started for Free** → Sign up with GitHub
2. Click **New** → **Web Service**
3. Connect your GitHub repo (`stock-analyzer`)
4. Configure the service:
   - **Name**: `stocksage-backend`
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free

5. Click **Advanced** → **Add Environment Variable** — add these:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | your Supabase URI from Step 2 |
| `ALLOWED_ORIGINS` | `["https://your-app.vercel.app","http://localhost:3000"]` (update after Step 4) |
| `OPENAI_API_KEY` | your key, or leave blank to use free rule-based analysis |
| `OPENAI_MODEL` | `gpt-4o-mini` |
| `FINNHUB_API_KEY` | optional — get free at finnhub.io |
| `KEEP_ALIVE` | `true` (prevents cold starts) |

6. Click **Create Web Service**
7. Render will build and deploy — takes 3-5 minutes
8. Copy your service URL: `https://stocksage-backend.onrender.com`
9. Test it: open `https://stocksage-backend.onrender.com/health` — should return `{"status":"ok"}`
10. View API docs: `https://stocksage-backend.onrender.com/docs`

> **Free tier note:** Render spins down free services after 15 minutes of inactivity. The first request after that takes ~30 seconds. The app shows a friendly "Waking up..." message during this. Setting `KEEP_ALIVE=true` pings every 10 minutes to reduce this.

---

## Step 4 — Vercel (Frontend)

1. Go to [vercel.com](https://vercel.com) → **Sign Up** → Continue with GitHub
2. Click **Add New** → **Project**
3. Import your `stock-analyzer` repository
4. Configure:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `frontend`
5. Under **Environment Variables**, add:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://stocksage-backend.onrender.com/api` |

6. Click **Deploy**
7. Wait ~2 minutes. Vercel gives you a URL like: `https://stocksage-abc123.vercel.app`

---

## Step 5 — Fix CORS

Now that you have your Vercel URL, go back to Render:
1. Open your `stocksage-backend` service → **Environment**
2. Update `ALLOWED_ORIGINS`:
   ```
   ["https://stocksage-abc123.vercel.app","http://localhost:3000"]
   ```
3. Render auto-redeploys with the new value

---

## Step 6 — Custom domain on Vercel (optional but free)

Vercel gives you a free `.vercel.app` domain. For a custom domain:
1. In Vercel → your project → **Settings** → **Domains**
2. Add your domain (e.g. `stocksage.yourdomain.com`)
3. Add the DNS records Vercel shows you to your domain registrar
4. SSL is automatic and free

---

## Your live app

| Resource | URL |
|----------|-----|
| App (share this) | `https://stocksage-abc123.vercel.app` |
| API | `https://stocksage-backend.onrender.com/api` |
| API docs | `https://stocksage-backend.onrender.com/docs` |
| Database | Supabase dashboard |

---

## Getting a free OpenAI key

The app works fine without OpenAI — it uses built-in rule-based analysis. But if you want AI-generated summaries:

1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up — new accounts get $5 free credit
3. Go to **API Keys** → **Create new secret key**
4. Add to Render environment: `OPENAI_API_KEY=sk-...`
5. Each stock analysis costs roughly **$0.002–0.005** with `gpt-4o-mini`

With the $5 free credit you get about **1000–2500 free analyses**.

---

## Free tier limits summary

| Service | Free limit | Will you hit it? |
|---------|-----------|-----------------|
| Vercel bandwidth | 100 GB/month | Unlikely |
| Vercel builds | Unlimited | No |
| Render hours | 750 hrs/month | No (one service = 744 hrs) |
| Render RAM | 512 MB | Fine for this app |
| Supabase DB | 500 MB | Fine (text data only) |
| Supabase bandwidth | 2 GB/month | Fine |
| yfinance | Unlimited | No limit |
| Finnhub | 60 calls/min | Fine |

---

## Updating the app

Any push to your GitHub `main` branch automatically redeploys both Vercel and Render:

```bash
git add .
git commit -m "my changes"
git push
```

---

## Troubleshooting

**Backend not responding:**
- Check Render logs: your service → **Logs** tab
- If cold start, wait 30 seconds and retry
- Verify `DATABASE_URL` is set correctly

**CORS error in browser:**
- Make sure `ALLOWED_ORIGINS` in Render includes your exact Vercel URL
- No trailing slash in the URL

**"No data found" for a ticker:**
- Add `.NS` for NSE stocks: `INFY.NS`, `RELIANCE.NS`
- Add `.BO` for BSE stocks: `500325.BO`

**Database errors:**
- Check Supabase connection string uses `postgresql+asyncpg://` not `postgresql://`
- Tables are auto-created on first startup — check Render logs for errors

**AI analysis missing:**
- This is normal without an OpenAI key — rule-based analysis is shown instead
- Add `OPENAI_API_KEY` to Render env variables to enable AI summaries
