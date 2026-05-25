"""
Tests for cache, rate limiter, portfolio analyzer, and scoring edge cases.
"""
import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from core.cache import TTLCache, cache_key
from services.scoring import ScoringEngine
from models.schemas import StockMetrics


# ── Cache Tests ─────────────────────────────────────────────────────────────

class TestTTLCache:
    @pytest.fixture
    def cache(self):
        return TTLCache(maxsize=10)

    @pytest.mark.asyncio
    async def test_set_and_get(self, cache):
        await cache.set("key1", "value1", ttl=60)
        result = await cache.get("key1")
        assert result == "value1"

    @pytest.mark.asyncio
    async def test_missing_key_returns_none(self, cache):
        result = await cache.get("nonexistent")
        assert result is None

    @pytest.mark.asyncio
    async def test_expired_key_returns_none(self, cache):
        await cache.set("exp", "val", ttl=0)  # Immediately expired
        import time
        await asyncio.sleep(0.01)
        result = await cache.get("exp")
        assert result is None

    @pytest.mark.asyncio
    async def test_delete(self, cache):
        await cache.set("del_key", "del_val")
        await cache.delete("del_key")
        assert await cache.get("del_key") is None

    @pytest.mark.asyncio
    async def test_clear(self, cache):
        await cache.set("a", 1)
        await cache.set("b", 2)
        await cache.clear()
        assert cache.size() == 0

    @pytest.mark.asyncio
    async def test_lru_eviction(self, cache):
        """When cache is full, oldest entry is evicted."""
        cache._maxsize = 3
        await cache.set("a", 1)
        await cache.set("b", 2)
        await cache.set("c", 3)
        await cache.set("d", 4)  # Should evict "a"
        assert cache.size() == 3
        assert await cache.get("a") is None
        assert await cache.get("d") == 4

    @pytest.mark.asyncio
    async def test_overwrite_existing_key(self, cache):
        await cache.set("k", "v1")
        await cache.set("k", "v2")
        assert await cache.get("k") == "v2"
        assert cache.size() == 1

    def test_cache_key_format(self):
        key = cache_key("analysis", "infy.ns")
        assert key == "analysis:INFY.NS"

    def test_cache_key_uppercase(self):
        assert cache_key("ai", "reliance.ns") == "ai:RELIANCE.NS"


# ── Portfolio Pure Logic Tests ───────────────────────────────────────────────
# Test the diversification and suggestion algorithms directly
# without importing the full service (which requires yfinance/aiohttp).

def _calc_diversification_pure(holdings, sectors) -> float:
    """Inline copy of PortfolioAnalyzer._calc_diversification for isolated testing."""
    score = 10.0
    if holdings:
        weights = [getattr(h, "weight_pct", 0) or 0 for h in holdings]
        max_weight = max(weights) if weights else 0
        if max_weight > 30:
            score -= 2.0
        elif max_weight > 20:
            score -= 1.0
    if sectors:
        top_sector_weight = sectors[0].weight_pct
        if top_sector_weight > 50:
            score -= 2.5
        elif top_sector_weight > 35:
            score -= 1.5
        elif top_sector_weight > 25:
            score -= 0.5
    n_sectors = len(sectors)
    if n_sectors < 2:
        score -= 3.0
    elif n_sectors < 3:
        score -= 1.5
    elif n_sectors < 5:
        score -= 0.5
    n_stocks = len(holdings)
    if n_stocks < 5:
        score -= 2.0
    elif n_stocks < 8:
        score -= 1.0
    return round(max(0.0, min(10.0, score)), 1)


class TestPortfolioLogic:
    def test_single_sector_scores_low(self):
        from models.portfolio_schemas import SectorAllocation
        holdings = [MagicMock(weight_pct=50), MagicMock(weight_pct=50)]
        sectors = [SectorAllocation(sector="IT", weight_pct=100, total_value=100000, holding_count=2)]
        score = _calc_diversification_pure(holdings, sectors)
        assert score < 5.0, f"Expected low score for concentrated portfolio, got {score}"

    def test_five_sectors_scores_high(self):
        from models.portfolio_schemas import SectorAllocation
        holdings = [MagicMock(weight_pct=20) for _ in range(5)]
        sectors = [
            SectorAllocation(sector=f"Sector{i}", weight_pct=20, total_value=20000, holding_count=1)
            for i in range(5)
        ]
        score = _calc_diversification_pure(holdings, sectors)
        assert score >= 6.0, f"Expected moderate-high score, got {score}"

    def test_score_bounded_0_to_10(self):
        """Score never goes below 0 or above 10."""
        from models.portfolio_schemas import SectorAllocation
        # Worst case: 1 stock, 1 sector
        holdings = [MagicMock(weight_pct=100)]
        sectors = [SectorAllocation(sector="IT", weight_pct=100, total_value=100000, holding_count=1)]
        score = _calc_diversification_pure(holdings, sectors)
        assert 0 <= score <= 10

    def test_more_stocks_improves_score(self):
        """Adding more stocks improves diversification score."""
        from models.portfolio_schemas import SectorAllocation
        sectors = [SectorAllocation(sector="IT", weight_pct=100, total_value=100000, holding_count=10)]

        few_holdings = [MagicMock(weight_pct=50), MagicMock(weight_pct=50)]
        many_holdings = [MagicMock(weight_pct=10) for _ in range(10)]

        score_few = _calc_diversification_pure(few_holdings, sectors)
        score_many = _calc_diversification_pure(many_holdings, sectors)
        assert score_many >= score_few, "More stocks should score >= fewer stocks"


# ── Scoring Engine Edge Cases ────────────────────────────────────────────────

class TestScoringEdgeCases:
    @pytest.fixture
    def engine(self):
        return ScoringEngine()

    def test_score_with_all_none_metrics(self, engine):
        """All-null metrics should still return a valid score."""
        m = StockMetrics()
        score, verdict, results = engine.evaluate(m)
        assert 0 <= score <= 10
        assert verdict in ("BUY", "WATCH", "AVOID")
        assert len(results) > 0

    def test_perfect_metrics_score_near_10(self, engine):
        """Near-perfect fundamentals should score very high."""
        m = StockMetrics(
            roe=45.0, roce=40.0, debt_to_equity=0.01,
            revenue_growth=30.0, profit_growth=25.0,
            promoter_holding=75.0, rsi=62.0,
            current_price=200.0, dma_200=150.0,
            pb_ratio=2.0, current_ratio=3.0,
        )
        score, verdict, _ = engine.evaluate(m)
        assert score >= 9.0, f"Expected score >= 9, got {score}"
        assert verdict == "BUY"

    def test_debt_override_prevents_buy(self, engine):
        """D/E > 2 prevents BUY even with high score."""
        m = StockMetrics(
            roe=30.0, roce=25.0, debt_to_equity=2.5,
            revenue_growth=20.0, profit_growth=15.0,
            rsi=58.0, current_price=200.0, dma_200=150.0,
        )
        _, verdict, _ = engine.evaluate(m)
        assert verdict == "AVOID"

    def test_rsi_between_50_and_70_passes(self, engine):
        for rsi_val in [50.0, 60.0, 70.0]:
            m = StockMetrics(rsi=rsi_val)
            _, _, results = engine.evaluate(m)
            rsi_result = next((r for r in results if r.name == "rsi"), None)
            assert rsi_result is not None
            assert rsi_result.passed is True, f"RSI {rsi_val} should pass"

    def test_rsi_outside_range_fails(self, engine):
        for rsi_val in [30.0, 49.0, 71.0, 85.0]:
            m = StockMetrics(rsi=rsi_val)
            _, _, results = engine.evaluate(m)
            rsi_result = next((r for r in results if r.name == "rsi"), None)
            assert rsi_result is not None
            assert rsi_result.passed is False, f"RSI {rsi_val} should fail"

    def test_metric_result_display_values_never_empty(self, engine):
        """Every metric result must have a display value."""
        m = StockMetrics(
            roe=18.0, debt_to_equity=0.3, rsi=55.0,
            current_price=100.0, dma_200=90.0,
        )
        _, _, results = engine.evaluate(m)
        for r in results:
            assert r.display_value, f"Empty display_value for {r.name}"

    def test_score_contributions_sum_correctly(self, engine):
        """Sum of contributions should match normalized score logic."""
        m = StockMetrics(
            roe=20.0, roce=18.0, debt_to_equity=0.2,
            revenue_growth=15.0, profit_growth=12.0,
            rsi=62.0, current_price=200.0, dma_200=150.0,
        )
        score, _, results = engine.evaluate(m)
        total_contrib = sum(r.score_contribution for r in results)
        from rules.thresholds import MAX_TOTAL_SCORE
        expected = round((total_contrib / MAX_TOTAL_SCORE) * 10, 1)
        assert abs(score - expected) < 0.01, f"Score mismatch: {score} vs {expected}"
