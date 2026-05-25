from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class Verdict(str, Enum):
    BUY = "BUY"
    WATCH = "WATCH"
    AVOID = "AVOID"


class MetricResult(BaseModel):
    name: str
    value: Optional[float]
    threshold: str
    passed: bool
    weight: float
    score_contribution: float
    display_value: str
    unit: str = ""


class StockMetrics(BaseModel):
    # Price
    current_price: Optional[float] = None
    prev_close: Optional[float] = None
    price_change_pct: Optional[float] = None
    market_cap: Optional[float] = None
    market_cap_cr: Optional[float] = None

    # Valuation
    pe_ratio: Optional[float] = None
    pb_ratio: Optional[float] = None
    sector_pe: Optional[float] = None
    pe_vs_sector: Optional[float] = None
    ev_ebitda: Optional[float] = None
    dividend_yield: Optional[float] = None

    # Quality
    roe: Optional[float] = None
    roce: Optional[float] = None
    debt_to_equity: Optional[float] = None
    current_ratio: Optional[float] = None
    promoter_holding: Optional[float] = None

    # Growth
    revenue_growth: Optional[float] = None
    profit_growth: Optional[float] = None
    earnings_growth_5y: Optional[float] = None

    # Technical
    rsi: Optional[float] = None
    macd: Optional[float] = None
    macd_signal: Optional[float] = None
    macd_histogram: Optional[float] = None
    dma_50: Optional[float] = None
    dma_200: Optional[float] = None
    volume: Optional[float] = None
    avg_volume: Optional[float] = None
    volume_ratio: Optional[float] = None
    beta: Optional[float] = None

    # Company Info
    company_name: Optional[str] = None
    sector: Optional[str] = None
    industry: Optional[str] = None
    exchange: Optional[str] = None
    currency: Optional[str] = "INR"


class AIAnalysis(BaseModel):
    summary: str
    strengths: List[str]
    weaknesses: List[str]
    valuation_analysis: str
    momentum_analysis: str
    risk_level: str
    risk_factors: List[str]
    recommendation: str
    time_horizon: str
    target_price_range: Optional[str]


class AnalysisResponse(BaseModel):
    ticker: str
    company_name: str
    score: float
    verdict: Verdict
    metrics: StockMetrics
    metric_results: List[MetricResult]
    ai_analysis: AIAnalysis
    analyzed_at: datetime
    data_quality: str


class WatchlistItemResponse(BaseModel):
    id: str
    ticker: str
    company_name: Optional[str]
    added_at: datetime
    last_score: Optional[float]
    last_verdict: Optional[str]
    last_analyzed: Optional[datetime]
    notes: Optional[str]
    alerts_enabled: bool


class AddWatchlistRequest(BaseModel):
    ticker: str
    notes: Optional[str] = None


class AlertConfig(BaseModel):
    ticker: str
    alert_type: str
    threshold_value: float
    email: Optional[str] = None
    telegram_chat_id: Optional[str] = None


class TopStockItem(BaseModel):
    ticker: str
    company_name: str
    score: float
    verdict: Verdict
    current_price: float
    price_change_pct: float
    sector: str
    key_strength: str
