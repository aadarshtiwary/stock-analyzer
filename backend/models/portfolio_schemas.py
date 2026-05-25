from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class HoldingInput(BaseModel):
    ticker: str
    quantity: float
    avg_buy_price: float
    company_name: Optional[str] = None


class CreatePortfolioRequest(BaseModel):
    name: str
    holdings: List[HoldingInput] = []


class HoldingAnalysis(BaseModel):
    ticker: str
    company_name: Optional[str]
    quantity: float
    avg_buy_price: float
    current_price: Optional[float]
    current_value: Optional[float]
    invested_value: float
    pnl: Optional[float]
    pnl_pct: Optional[float]
    sector: Optional[str]
    score: Optional[float]
    verdict: Optional[str]
    weight_pct: Optional[float]  # % of portfolio


class SectorAllocation(BaseModel):
    sector: str
    weight_pct: float
    total_value: float
    holding_count: int


class PortfolioAnalysis(BaseModel):
    portfolio_id: str
    portfolio_name: str
    total_invested: float
    total_current_value: float
    total_pnl: float
    total_pnl_pct: float
    diversification_score: float  # 0–10
    avg_stock_score: float
    holdings: List[HoldingAnalysis]
    sector_allocation: List[SectorAllocation]
    top_performers: List[str]
    underperformers: List[str]
    ai_suggestions: List[str]
    concentration_risk: str  # Low / Medium / High
    analyzed_at: datetime
