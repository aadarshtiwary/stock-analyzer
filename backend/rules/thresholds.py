from dataclasses import dataclass
from typing import Optional, Tuple
from enum import Enum


class ThresholdType(str, Enum):
    GREATER_THAN = "gt"
    LESS_THAN = "lt"
    BETWEEN = "between"
    GREATER_THAN_METRIC = "gt_metric"  # Compare against another metric


@dataclass
class ThresholdRule:
    name: str
    display_name: str
    threshold_type: ThresholdType
    value: Optional[float] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    compare_to_metric: Optional[str] = None
    weight: float = 1.0
    max_score: float = 1.0
    description: str = ""
    unit: str = ""
    good_direction: str = "higher"  # higher or lower


# ─── THRESHOLD CONFIGURATION ──────────────────────────────────────────────────

THRESHOLD_RULES: list[ThresholdRule] = [
    # Profitability
    ThresholdRule(
        name="roe",
        display_name="Return on Equity (ROE)",
        threshold_type=ThresholdType.GREATER_THAN,
        value=15.0,
        weight=2.0,
        max_score=2.0,
        description="Measures how efficiently the company uses shareholder equity",
        unit="%",
        good_direction="higher",
    ),
    ThresholdRule(
        name="roce",
        display_name="Return on Capital Employed (ROCE)",
        threshold_type=ThresholdType.GREATER_THAN,
        value=15.0,
        weight=1.5,
        max_score=1.5,
        description="Measures profitability relative to total capital",
        unit="%",
        good_direction="higher",
    ),
    # Debt
    ThresholdRule(
        name="debt_to_equity",
        display_name="Debt to Equity",
        threshold_type=ThresholdType.LESS_THAN,
        value=0.5,
        weight=2.0,
        max_score=2.0,
        description="Lower is better; indicates financial stability",
        unit="x",
        good_direction="lower",
    ),
    # Growth
    ThresholdRule(
        name="revenue_growth",
        display_name="Revenue Growth (YoY)",
        threshold_type=ThresholdType.GREATER_THAN,
        value=10.0,
        weight=1.5,
        max_score=1.5,
        description="Year-over-year revenue growth",
        unit="%",
        good_direction="higher",
    ),
    ThresholdRule(
        name="profit_growth",
        display_name="Profit Growth (YoY)",
        threshold_type=ThresholdType.GREATER_THAN,
        value=10.0,
        weight=1.5,
        max_score=1.5,
        description="Year-over-year net profit growth",
        unit="%",
        good_direction="higher",
    ),
    # Governance
    ThresholdRule(
        name="promoter_holding",
        display_name="Promoter Holding",
        threshold_type=ThresholdType.GREATER_THAN,
        value=40.0,
        weight=1.0,
        max_score=1.0,
        description="Higher promoter holding indicates strong confidence",
        unit="%",
        good_direction="higher",
    ),
    # Technical
    ThresholdRule(
        name="rsi",
        display_name="RSI (14-day)",
        threshold_type=ThresholdType.BETWEEN,
        min_value=50.0,
        max_value=70.0,
        weight=1.5,
        max_score=1.5,
        description="RSI 50–70 indicates bullish but not overbought",
        unit="",
        good_direction="neutral",
    ),
    ThresholdRule(
        name="price_vs_200dma",
        display_name="Price vs 200 DMA",
        threshold_type=ThresholdType.GREATER_THAN_METRIC,
        compare_to_metric="dma_200",
        weight=1.5,
        max_score=1.5,
        description="Price above 200 DMA indicates long-term uptrend",
        unit="",
        good_direction="higher",
    ),
    # Valuation
    ThresholdRule(
        name="pb_ratio",
        display_name="Price to Book (P/B)",
        threshold_type=ThresholdType.LESS_THAN,
        value=5.0,
        weight=1.0,
        max_score=1.0,
        description="Lower P/B may indicate undervaluation",
        unit="x",
        good_direction="lower",
    ),
    ThresholdRule(
        name="current_ratio",
        display_name="Current Ratio",
        threshold_type=ThresholdType.GREATER_THAN,
        value=1.5,
        weight=0.5,
        max_score=0.5,
        description="Measures short-term liquidity",
        unit="x",
        good_direction="higher",
    ),
]

# Total max score
MAX_TOTAL_SCORE = sum(r.max_score for r in THRESHOLD_RULES)

# Map rule name to rule for quick lookup
RULES_BY_NAME = {r.name: r for r in THRESHOLD_RULES}
