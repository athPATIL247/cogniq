"""
Transaction Risk Model — Z-score + rule-based fusion.
Scores a single transaction against the user's historical baseline.
"""
from __future__ import annotations
import logging
from typing import Any

logger = logging.getLogger(__name__)


class TransactionModel:
    """
    Stateless scoring model.  All baseline data is passed in at call time
    (sourced from the Node.js backend / request body).
    """

    def load(self) -> None:
        """No artifact to load for rule-based model — no-op for interface compatibility."""
        logger.info("TransactionModel ready (rule-based, no artifact required).")

    def score(
        self,
        transaction: dict[str, Any],
        user_baseline: dict[str, Any] | None,
    ) -> tuple[float, list[dict]]:
        """Returns (score_0_to_100, factors_list)."""
        if not user_baseline:
            return (
                30.0,
                [
                    {
                        "factor": "no_baseline",
                        "contribution": 30.0,
                        "description": "Insufficient transaction history",
                    }
                ],
            )

        factors: list[dict] = []
        total_score = 0.0

        amount: float = float(transaction.get("amount", 0.0))
        category: str = str(transaction.get("category", "")).lower()
        hour: int = int(transaction.get("hour", 12))
        recent_count: int = int(transaction.get("recent_count", 0))

        avg_amount: float = float(user_baseline.get("avg_amount", 0.0))
        std_amount: float = float(user_baseline.get("std_amount", 1.0))
        known_categories: list[str] = [
            c.lower() for c in user_baseline.get("known_categories", [])
        ]
        typical_hours: list[int] = [int(h) for h in user_baseline.get("typical_hours", [])]

        # 1. Amount Z-score
        safe_std = max(std_amount, 1.0)
        z = (amount - avg_amount) / safe_std
        amount_contribution = min(abs(z) * 15.0, 40.0)
        total_score += amount_contribution

        if amount_contribution > 0:
            direction = "above" if amount > avg_amount else "below"
            factors.append(
                {
                    "factor": "amount_anomaly",
                    "contribution": round(amount_contribution, 2),
                    "description": (
                        f"Transaction amount ₹{amount:.0f} is {abs(z):.1f}σ "
                        f"{direction} user average ₹{avg_amount:.0f}"
                    ),
                }
            )

        # 2. Category novelty
        novelty = 0.0 if (category and category in known_categories) else 1.0
        category_contribution = 25.0 * novelty
        total_score += category_contribution

        if category_contribution > 0:
            factors.append(
                {
                    "factor": "new_category",
                    "contribution": round(category_contribution, 2),
                    "description": (
                        f"Category '{category}' not seen in user's transaction history"
                        if category
                        else "Transaction category missing"
                    ),
                }
            )

        # 3. Time anomaly
        time_anomaly = hour not in typical_hours if typical_hours else False
        time_contribution = 15.0 if time_anomaly else 0.0
        total_score += time_contribution

        if time_contribution > 0:
            factors.append(
                {
                    "factor": "unusual_time",
                    "contribution": round(time_contribution, 2),
                    "description": (
                        f"Transaction at {hour:02d}:00 is outside typical hours "
                        f"{sorted(typical_hours)}"
                    ),
                }
            )

        # 4. Velocity
        velocity_ratio = min(recent_count / 5.0, 1.0)
        velocity_contribution = velocity_ratio * 20.0
        total_score += velocity_contribution

        if velocity_contribution > 0:
            factors.append(
                {
                    "factor": "high_velocity",
                    "contribution": round(velocity_contribution, 2),
                    "description": (
                        f"{recent_count} transaction(s) in the last 10 minutes "
                        f"(velocity ratio {velocity_ratio:.2f})"
                    ),
                }
            )

        final_score = float(min(max(total_score, 0.0), 100.0))

        if not factors:
            factors.append(
                {
                    "factor": "normal_transaction",
                    "contribution": 0.0,
                    "description": "Transaction matches user's normal behavior",
                }
            )

        return final_score, factors
