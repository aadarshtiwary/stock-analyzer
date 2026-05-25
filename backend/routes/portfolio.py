from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
import logging

from core.database import get_db
from models.portfolio_models import Portfolio, PortfolioHolding
from models.portfolio_schemas import CreatePortfolioRequest, PortfolioAnalysis, HoldingInput
from services.portfolio import PortfolioAnalyzer

router = APIRouter()
logger = logging.getLogger(__name__)
analyzer = PortfolioAnalyzer()


@router.post("/portfolio", response_model=dict)
async def create_portfolio(
    request: CreatePortfolioRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create a new portfolio with holdings."""
    portfolio = Portfolio(name=request.name)
    db.add(portfolio)
    await db.flush()

    for h in request.holdings:
        holding = PortfolioHolding(
            portfolio_id=portfolio.id,
            ticker=h.ticker.upper(),
            company_name=h.company_name,
            quantity=h.quantity,
            avg_buy_price=h.avg_buy_price,
        )
        db.add(holding)

    await db.flush()
    return {"id": portfolio.id, "name": portfolio.name, "message": "Portfolio created"}


@router.get("/portfolio/{portfolio_id}", response_model=PortfolioAnalysis)
async def analyze_portfolio(
    portfolio_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Analyze an existing portfolio."""
    result = await db.execute(
        select(Portfolio)
        .options(selectinload(Portfolio.holdings))
        .where(Portfolio.id == portfolio_id)
    )
    portfolio = result.scalar_one_or_none()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    holdings_input = [
        HoldingInput(
            ticker=h.ticker,
            company_name=h.company_name,
            quantity=h.quantity,
            avg_buy_price=h.avg_buy_price,
        )
        for h in portfolio.holdings
    ]

    return await analyzer.analyze(portfolio_id, portfolio.name, holdings_input)


@router.post("/portfolio/analyze", response_model=PortfolioAnalysis)
async def analyze_portfolio_direct(request: CreatePortfolioRequest):
    """Analyze a portfolio without saving it (ad-hoc analysis)."""
    import uuid
    return await analyzer.analyze(
        portfolio_id=str(uuid.uuid4()),
        portfolio_name=request.name,
        holdings_input=request.holdings,
    )


@router.get("/portfolios")
async def list_portfolios(db: AsyncSession = Depends(get_db)):
    """List all portfolios."""
    result = await db.execute(
        select(Portfolio).options(selectinload(Portfolio.holdings))
    )
    portfolios = result.scalars().all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "created_at": p.created_at,
            "holding_count": len(p.holdings),
        }
        for p in portfolios
    ]


@router.post("/portfolio/{portfolio_id}/holding")
async def add_holding(
    portfolio_id: str,
    holding: HoldingInput,
    db: AsyncSession = Depends(get_db),
):
    """Add a holding to an existing portfolio."""
    result = await db.execute(select(Portfolio).where(Portfolio.id == portfolio_id))
    portfolio = result.scalar_one_or_none()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    h = PortfolioHolding(
        portfolio_id=portfolio_id,
        ticker=holding.ticker.upper(),
        company_name=holding.company_name,
        quantity=holding.quantity,
        avg_buy_price=holding.avg_buy_price,
    )
    db.add(h)
    return {"message": f"{holding.ticker} added to portfolio"}
