from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, JSON, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from core.database import Base
import uuid


def gen_uuid():
    return str(uuid.uuid4())


class WatchlistItem(Base):
    __tablename__ = "watchlist"

    id = Column(String, primary_key=True, default=gen_uuid)
    ticker = Column(String(20), nullable=False, index=True)
    company_name = Column(String(200))
    added_at = Column(DateTime(timezone=True), server_default=func.now())
    last_score = Column(Float, nullable=True)
    last_verdict = Column(String(20), nullable=True)
    last_analyzed = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    alerts_enabled = Column(Boolean, default=True)


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(String, primary_key=True, default=gen_uuid)
    ticker = Column(String(20), nullable=False, index=True)
    analyzed_at = Column(DateTime(timezone=True), server_default=func.now())
    score = Column(Float)
    verdict = Column(String(20))
    metrics = Column(JSON)
    metric_results = Column(JSON)
    ai_analysis = Column(JSON)
    raw_data = Column(JSON)


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String, primary_key=True, default=gen_uuid)
    ticker = Column(String(20), nullable=False)
    alert_type = Column(String(50))  # rsi_high, price_below_200dma, pe_expansion
    condition = Column(String(200))
    threshold_value = Column(Float)
    current_value = Column(Float)
    triggered_at = Column(DateTime(timezone=True), server_default=func.now())
    notified_email = Column(Boolean, default=False)
    notified_telegram = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
