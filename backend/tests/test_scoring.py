"""
Basic tests for the StockSage backend.
Run with: pytest tests/ -v
"""
import pytest
from unittest.mock import MagicMock, patch
from services.scoring import ScoringEngine
from models.schemas import StockMetrics


@pytest.fixture
def engine():
    return ScoringEngine()


@pytest.fixture
def strong_metrics():
    return StockMetrics(
        current_price=1850.0,
        dma_200=1700.0,
        dma_50=1780.0,
        roe=25.0,
        roce=20.0,
        debt_to_equity=0.2,
        revenue_growth=15.0,
        profit_growth=12.0,
        promoter_holding=55.0,
        rsi=58.0,
        pb_ratio=3.5,
        current_ratio=2.0,
        company_name="Test Corp",
    )


@pytest.fixture
def weak_metrics():
    return StockMetrics(
        current_price=500.0,
        dma_200=700.0,
        dma_50=600.0,
        roe=5.0,
        debt_to_equity=2.5,
        revenue_growth=-3.0,
        profit_growth=-10.0,
        promoter_holding=25.0,
        rsi=78.0,
        pb_ratio=8.0,
        current_ratio=0.8,
        company_name="Weak Corp",
    )


class TestScoringEngine:
    def test_strong_metrics_get_high_score(self, engine, strong_metrics):
        score, verdict, results = engine.evaluate(strong_metrics)
        assert score >= 7.0, f"Expected score >= 7 but got {score}"
        assert verdict in ("BUY", "WATCH")

    def test_weak_metrics_get_low_score(self, engine, weak_metrics):
        score, verdict, results = engine.evaluate(weak_metrics)
        assert score <= 4.0, f"Expected score <= 4 but got {score}"
        assert verdict == "AVOID"

    def test_high_debt_forces_avoid(self, engine, strong_metrics):
        strong_metrics.debt_to_equity = 3.0
        _, verdict, _ = engine.evaluate(strong_metrics)
        assert verdict == "AVOID", "High debt should force AVOID verdict"

    def test_score_normalized_to_10(self, engine, strong_metrics):
        score, _, _ = engine.evaluate(strong_metrics)
        assert 0.0 <= score <= 10.0, f"Score {score} out of range"

    def test_metric_results_returned(self, engine, strong_metrics):
        _, _, results = engine.evaluate(strong_metrics)
        assert len(results) > 0
        assert all(hasattr(r, "passed") for r in results)
        assert all(hasattr(r, "display_value") for r in results)

    def test_none_metrics_dont_crash(self, engine):
        empty_metrics = StockMetrics(company_name="Empty")
        score, verdict, results = engine.evaluate(empty_metrics)
        assert isinstance(score, float)
        assert verdict in ("BUY", "WATCH", "AVOID")

    def test_rsi_pass_condition(self, engine, strong_metrics):
        strong_metrics.rsi = 60.0
        _, _, results = engine.evaluate(strong_metrics)
        rsi_result = next((r for r in results if r.name == "rsi"), None)
        assert rsi_result is not None
        assert rsi_result.passed is True

    def test_rsi_fail_when_overbought(self, engine, strong_metrics):
        strong_metrics.rsi = 82.0
        _, _, results = engine.evaluate(strong_metrics)
        rsi_result = next((r for r in results if r.name == "rsi"), None)
        assert rsi_result is not None
        assert rsi_result.passed is False

    def test_price_above_200dma_passes(self, engine, strong_metrics):
        strong_metrics.current_price = 1900.0
        strong_metrics.dma_200 = 1700.0
        _, _, results = engine.evaluate(strong_metrics)
        trend = next((r for r in results if r.name == "price_vs_200dma"), None)
        assert trend is not None
        assert trend.passed is True

    def test_buy_threshold_is_7_5(self, engine, strong_metrics):
        score, verdict, _ = engine.evaluate(strong_metrics)
        if score >= 7.5:
            assert verdict == "BUY"

    def test_avoid_threshold_below_5(self, engine, weak_metrics):
        score, verdict, _ = engine.evaluate(weak_metrics)
        if score < 5.0:
            assert verdict == "AVOID"


class TestThresholds:
    def test_all_rules_have_max_score(self):
        from rules.thresholds import THRESHOLD_RULES
        for rule in THRESHOLD_RULES:
            assert rule.max_score > 0, f"Rule {rule.name} has zero max_score"

    def test_total_max_score_is_positive(self):
        from rules.thresholds import MAX_TOTAL_SCORE
        assert MAX_TOTAL_SCORE > 0

    def test_rules_by_name_lookup(self):
        from rules.thresholds import RULES_BY_NAME
        assert "roe" in RULES_BY_NAME
        assert "debt_to_equity" in RULES_BY_NAME
        assert "rsi" in RULES_BY_NAME
