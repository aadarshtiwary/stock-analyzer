from typing import List, Tuple
from models.schemas import StockMetrics, MetricResult, Verdict
from rules.thresholds import THRESHOLD_RULES, ThresholdType, MAX_TOTAL_SCORE
import logging

logger = logging.getLogger(__name__)


class ScoringEngine:
    """Evaluates stock metrics against thresholds and generates a score."""

    def evaluate(self, metrics: StockMetrics) -> Tuple[float, str, List[MetricResult]]:
        """
        Returns:
            - score (0–10)
            - verdict (BUY / WATCH / AVOID)
            - metric_results list
        """
        results: List[MetricResult] = []
        total_earned = 0.0
        total_possible = 0.0

        metrics_dict = metrics.model_dump()

        for rule in THRESHOLD_RULES:
            value = metrics_dict.get(rule.name)

            # Special case: price vs 200 DMA
            if rule.name == "price_vs_200dma":
                value = metrics.current_price
                compare_val = metrics.dma_200

                if value is None or compare_val is None:
                    passed = False
                    display_value = "N/A"
                    threshold_str = f"> 200 DMA ({compare_val:.1f})" if compare_val else "> 200 DMA"
                else:
                    passed = value > compare_val
                    diff_pct = ((value - compare_val) / compare_val) * 100
                    display_value = f"{diff_pct:+.1f}% vs 200 DMA"
                    threshold_str = f"> ₹{compare_val:.1f}"
            else:
                display_value, passed, threshold_str = self._evaluate_rule(rule, value)

            score_contribution = rule.max_score if passed else 0.0
            total_earned += score_contribution
            total_possible += rule.max_score

            results.append(MetricResult(
                name=rule.name,
                value=value if isinstance(value, (int, float)) else None,
                threshold=threshold_str,
                passed=passed,
                weight=rule.weight,
                score_contribution=score_contribution,
                display_value=display_value,
                unit=rule.unit,
            ))

        # Normalize to 10
        raw_score = (total_earned / MAX_TOTAL_SCORE) * 10 if MAX_TOTAL_SCORE > 0 else 0
        score = round(min(raw_score, 10.0), 1)

        verdict = self._determine_verdict(score, results, metrics)

        return score, verdict, results

    def _evaluate_rule(self, rule, value) -> Tuple[str, bool, str]:
        """Evaluate a single rule. Returns (display_value, passed, threshold_str)."""
        if value is None:
            return "N/A", False, self._threshold_display(rule)

        try:
            value = float(value)
        except (TypeError, ValueError):
            return "N/A", False, self._threshold_display(rule)

        passed = False
        if rule.threshold_type == ThresholdType.GREATER_THAN:
            passed = value > rule.value
            threshold_str = f"> {rule.value}{rule.unit}"
        elif rule.threshold_type == ThresholdType.LESS_THAN:
            passed = value < rule.value
            threshold_str = f"< {rule.value}{rule.unit}"
        elif rule.threshold_type == ThresholdType.BETWEEN:
            passed = rule.min_value <= value <= rule.max_value
            threshold_str = f"{rule.min_value}–{rule.max_value}"
        else:
            threshold_str = "—"

        # Format display value
        if rule.unit == "%":
            display_value = f"{value:.1f}%"
        elif rule.unit == "x":
            display_value = f"{value:.2f}x"
        else:
            display_value = f"{value:.2f}"

        return display_value, passed, threshold_str

    def _threshold_display(self, rule) -> str:
        if rule.threshold_type == ThresholdType.GREATER_THAN:
            return f"> {rule.value}{rule.unit}"
        elif rule.threshold_type == ThresholdType.LESS_THAN:
            return f"< {rule.value}{rule.unit}"
        elif rule.threshold_type == ThresholdType.BETWEEN:
            return f"{rule.min_value}–{rule.max_value}"
        return "—"

    def _determine_verdict(
        self, score: float, results: List[MetricResult], metrics: StockMetrics
    ) -> str:
        """Determine BUY/WATCH/AVOID based on score and critical checks."""

        # Hard fail: excessive debt
        debt_result = next((r for r in results if r.name == "debt_to_equity"), None)
        if (
            debt_result
            and metrics.debt_to_equity is not None
            and metrics.debt_to_equity > 2.0
        ):
            return Verdict.AVOID

        # Hard fail: RSI overbought
        rsi_result = next((r for r in results if r.name == "rsi"), None)
        if rsi_result and metrics.rsi is not None and metrics.rsi > 80:
            if score < 7:
                return Verdict.AVOID

        # Score-based verdict
        if score >= 7.5:
            return Verdict.BUY
        elif score >= 5.0:
            return Verdict.WATCH
        else:
            return Verdict.AVOID
