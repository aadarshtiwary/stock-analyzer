#!/usr/bin/env bash
# ============================================================
# StockSage — Automated Local Setup Script
# Run:  chmod +x SETUP.sh && ./SETUP.sh
# ============================================================
set -e

BOLD="\033[1m"
GREEN="\033[32m"
CYAN="\033[36m"
YELLOW="\033[33m"
RED="\033[31m"
RESET="\033[0m"

log()    { echo -e "${GREEN}[✓]${RESET} $1"; }
info()   { echo -e "${CYAN}[→]${RESET} $1"; }
warn()   { echo -e "${YELLOW}[!]${RESET} $1"; }
err()    { echo -e "${RED}[✗]${RESET} $1"; exit 1; }
header() { echo -e "\n${BOLD}${CYAN}═══ $1 ═══${RESET}\n"; }

# ── Prerequisite checks ──────────────────────────────────────────────────────
header "Checking Prerequisites"

command -v python3 >/dev/null 2>&1 || err "Python 3.11+ required. Install from https://python.org"
command -v node    >/dev/null 2>&1 || err "Node.js 20+ required. Install from https://nodejs.org"
command -v npm     >/dev/null 2>&1 || err "npm required"

PYTHON_VER=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
NODE_VER=$(node --version | sed 's/v//')

log "Python $PYTHON_VER"
log "Node.js $NODE_VER"

# Check Docker (optional)
if command -v docker >/dev/null 2>&1; then
    log "Docker available (optional)"
    HAS_DOCKER=true
else
    warn "Docker not found — will set up without containers"
    HAS_DOCKER=false
fi

# ── Backend Setup ────────────────────────────────────────────────────────────
header "Setting Up Backend"

cd backend

# Create virtual environment
if [ ! -d "venv" ]; then
    info "Creating Python virtual environment..."
    python3 -m venv venv
    log "Virtual environment created"
else
    log "Virtual environment already exists"
fi

# Activate
source venv/bin/activate

# Install dependencies
info "Installing Python dependencies (this may take a minute)..."
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt
log "Python dependencies installed"

# Create .env if missing
if [ ! -f ".env" ]; then
    cp .env.example .env
    warn ".env created from template — PLEASE FILL IN YOUR API KEYS:"
    warn "  → backend/.env"
    echo ""
    echo "  Required keys:"
    echo "    OPENAI_API_KEY=sk-..."
    echo "    DATABASE_URL=postgresql+asyncpg://..."
    echo ""
    echo "  Optional:"
    echo "    ALPHA_VANTAGE_API_KEY=..."
    echo "    TELEGRAM_BOT_TOKEN=..."
    echo "    SENDGRID_API_KEY=..."
    echo ""
else
    log ".env already exists"
fi

deactivate
cd ..

# ── Frontend Setup ───────────────────────────────────────────────────────────
header "Setting Up Frontend"

cd frontend

info "Installing Node.js dependencies..."
npm install --silent
log "Node.js dependencies installed"

if [ ! -f ".env.local" ]; then
    cp .env.local.example .env.local
    log ".env.local created"
else
    log ".env.local already exists"
fi

cd ..

# ── Database Setup ───────────────────────────────────────────────────────────
header "Database"

if [ "$HAS_DOCKER" = true ]; then
    info "Starting PostgreSQL via Docker..."
    docker run -d \
        --name stocksage-postgres \
        -e POSTGRES_DB=stockanalyzer \
        -e POSTGRES_USER=stockuser \
        -e POSTGRES_PASSWORD=stockpassword \
        -p 5432:5432 \
        postgres:16-alpine \
        2>/dev/null || warn "PostgreSQL container may already be running"
    log "PostgreSQL running at localhost:5432"
    warn "Update backend/.env with: DATABASE_URL=postgresql+asyncpg://stockuser:stockpassword@localhost:5432/stockanalyzer"
else
    warn "No Docker — install PostgreSQL manually or use Supabase (https://supabase.com)"
    warn "Then update DATABASE_URL in backend/.env"
fi

# ── Run migrations ────────────────────────────────────────────────────────────
header "Running Migrations"

cd backend
source venv/bin/activate

info "Running Alembic migrations..."
if python -c "from core.config import settings; from sqlalchemy import create_engine" 2>/dev/null; then
    alembic upgrade head 2>/dev/null && log "Migrations applied" || warn "Migration failed — check DATABASE_URL in .env"
else
    warn "Skipping migrations — install dependencies and check .env first"
fi

deactivate
cd ..

# ── Final Instructions ────────────────────────────────────────────────────────
header "Setup Complete!"

echo -e "${BOLD}Next steps:${RESET}"
echo ""
echo -e "  1. Edit API keys:  ${CYAN}backend/.env${RESET}"
echo -e "     • OPENAI_API_KEY (required for AI insights)"
echo -e "     • DATABASE_URL   (required)"
echo ""
echo -e "  2. Start backend:  ${CYAN}cd backend && source venv/bin/activate && uvicorn main:app --reload${RESET}"
echo ""
echo -e "  3. Start frontend: ${CYAN}cd frontend && npm run dev${RESET}"
echo ""
echo -e "  4. Open browser:   ${GREEN}http://localhost:3000${RESET}"
echo -e "     API docs:       ${GREEN}http://localhost:8000/docs${RESET}"
echo ""
echo -e "  Or run both with Docker: ${CYAN}docker-compose up --build${RESET}"
echo ""
echo -e "${BOLD}Happy analyzing! 📈${RESET}"
echo ""
