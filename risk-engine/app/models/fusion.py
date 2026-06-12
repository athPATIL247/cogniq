"""
Risk Fusion Engine — combines all sub-scores into a single 0–100 score.
"""
from __future__ import annotations
import logging
from typing import Any

logger = logging.getLogger(__name__)

DEFAULT_WEIGHTS: dict[str, float] = {
    "behavioral":   0.30,
    "device":       0.20,
    "location":     0.20,
    "transaction":  0.20,
    "temporal":     0.10,
}

RISK_LEVELS = [
    (35.0,  "low"),
    (60.0,  "medium"),
    (80.0,  "high"),
    (101.0, "critical"),
]

RECOMMENDED_ACTIONS = [
    (35.0, "allow"),
    (60.0, "soft_challenge"),
    (80.0, "hard_mfa"),
    (101.0, "block"),
]

FACTOR_LABELS: dict[str, str] = {
    "behavioral":   "behavioral deviation",
    "device":       "device risk",
    "location":     "unusual location",
    "transaction":  "transaction anomaly",
    "temporal":     "temporal risk",
}


def _classify(value: float, thresholds: list[tuple[float, str]]) -> str:
    for ceiling, label in thresholds:
        if value < ceiling:
            return label
    return thresholds[-1][1]


class FusionEngine:
    def load(self) -> None:
        """No artifact — no-op for interface compatibility."""
        logger.info("FusionEngine ready (no artifact required).")

    def fuse(
        self,
        scores: dict[str, float],
        context: dict[str, Any],
        extra_factors: list[dict] | None = None,
    ) -> tuple[float, list[dict], str]:
        weights = dict(DEFAULT_WEIGHTS)

        missing_keys = [k for k in weights if k not in scores]
        if missing_keys:
            freed_weight = sum(weights.pop(k) for k in missing_keys)
            present_keys = list(weights.keys())
            if present_keys:
                per_key = freed_weight / len(present_keys)
                for k in present_keys:
                    weights[k] += per_key

        weighted_sum = sum(scores[k] * weights[k] for k in weights if k in scores)
        
        # Escalate final score if transaction risk is extremely high (prevents dilution from blocking)
        tx_score = scores.get("transaction", 0.0)
        if tx_score >= 60.0:
            weighted_sum = max(weighted_sum, tx_score * 1.4)
            
        final_score = float(min(max(weighted_sum, 0.0), 100.0))

        all_factors: list[dict] = []
        for key in DEFAULT_WEIGHTS:
            if key not in scores:
                continue
            sub_score = scores[key]
            weight = weights.get(key, 0.0)
            contribution = round(sub_score * weight, 2)
            all_factors.append(
                {
                    "factor": key,
                    "contribution": contribution,
                    "description": f"{FACTOR_LABELS.get(key, key).title()} score {sub_score:.1f}/100",
                }
            )

        if extra_factors:
            all_factors = [f for f in all_factors if f["factor"] != "transaction"]
            all_factors.extend(extra_factors)

        all_factors.sort(key=lambda f: f["contribution"], reverse=True)

        risk_level = _classify(final_score, RISK_LEVELS)
        explanation = _build_explanation(final_score, risk_level, all_factors)

        return final_score, all_factors, risk_level

    @staticmethod
    def recommended_action(score: float) -> str:
        return _classify(score, RECOMMENDED_ACTIONS)


def _build_explanation(score: float, risk_level: str, factors: list[dict]) -> str:
    top_factors = [f for f in factors if f["contribution"] > 0][:3]

    parts = []
    for f in top_factors:
        label = FACTOR_LABELS.get(f["factor"], f["factor"].replace("_", " "))
        parts.append(f"{label} (+{f['contribution']:.0f})")

    prefix = f"{risk_level.capitalize()} risk"
    if parts:
        return f"{prefix}: {', '.join(parts)}"
    return f"{prefix}: no significant contributing factors"
