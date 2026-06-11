"""
Behavioral Anomaly Model — Isolation Forest
Detects whether a user's current session behavior deviates from their personal baseline.
"""
from __future__ import annotations
import os
import pickle
import logging
import numpy as np
from sklearn.ensemble import IsolationForest

logger = logging.getLogger(__name__)

ARTIFACT_PATH = os.path.join(os.path.dirname(__file__), "..", "artifacts", "behavioral_model.pkl")

# Feature indices for documentation
FEATURES = [
    "avg_dwell_time",        # How long keys are held (ms, normalized by 200ms max)
    "dwell_std_dev",         # Consistency of dwell time
    "avg_flight_time",       # Time between keystrokes (ms, normalized by 500ms max)
    "flight_std_dev",        # Consistency of flight time
    "typing_speed_norm",     # WPM normalized by 120 WPM max
    "session_duration_norm", # Minutes normalized by 60min max
    "actions_per_min_norm",  # Normalized by 60 actions max
    "mouse_velocity_norm",   # Avg mouse velocity normalized (0 if mobile)
    "swipe_pressure_norm",   # Avg swipe pressure normalized (0 if desktop)
    "hour_of_day_norm",      # Hour 0-23 normalized to 0-1
]
N_FEATURES = len(FEATURES)


def _generate_synthetic_training_data(n_samples: int = 500) -> np.ndarray:
    """
    Generate realistic synthetic 'normal' behavioral data for initial training.
    Distributions are loosely based on empirical typing / UX research.
    """
    rng = np.random.default_rng(42)

    avg_dwell      = rng.normal(0.40, 0.08, n_samples).clip(0.05, 0.95)   # ~80ms / 200ms
    dwell_std      = rng.normal(0.10, 0.04, n_samples).clip(0.01, 0.40)
    avg_flight     = rng.normal(0.38, 0.10, n_samples).clip(0.05, 0.90)   # ~190ms / 500ms
    flight_std     = rng.normal(0.12, 0.05, n_samples).clip(0.01, 0.50)
    typing_speed   = rng.normal(0.52, 0.12, n_samples).clip(0.05, 0.95)   # ~62 WPM / 120
    session_dur    = rng.normal(0.20, 0.12, n_samples).clip(0.01, 1.00)   # ~12 min / 60
    actions_pm     = rng.normal(0.30, 0.10, n_samples).clip(0.01, 1.00)   # ~18 / 60
    mouse_vel      = rng.normal(0.45, 0.15, n_samples).clip(0.00, 1.00)
    swipe_pressure = rng.normal(0.00, 0.05, n_samples).clip(0.00, 1.00)   # desktop = 0
    hour_norm      = rng.uniform(0.35, 0.85, n_samples)                   # 9:00–20:00 range

    data = np.column_stack([
        avg_dwell, dwell_std, avg_flight, flight_std,
        typing_speed, session_dur, actions_pm,
        mouse_vel, swipe_pressure, hour_norm,
    ])
    return data


class BehavioralModel:
    def __init__(self):
        self._model: IsolationForest | None = None
        self._global_score_min: float = -0.5
        self._global_score_max: float = 0.5

    def train(self, samples: list[list[float]]) -> None:
        """Fit an IsolationForest on the provided normal-behavior samples."""
        X = np.array(samples, dtype=np.float32)
        self._model = IsolationForest(
            n_estimators=100,
            contamination=0.05,
            random_state=42,
        )
        self._model.fit(X)
        raw_scores = self._model.decision_function(X)
        self._global_score_min = float(raw_scores.min())
        self._global_score_max = float(raw_scores.max())
        logger.info(
            "BehavioralModel trained on %d samples. Score range: [%.4f, %.4f]",
            len(samples), self._global_score_min, self._global_score_max,
        )

    def predict(
        self,
        sample: list[float],
        user_baseline_samples: list[list[float]] | None = None,
    ) -> float:
        """Returns anomaly score 0–100.  Higher = more anomalous."""
        if self._model is None:
            raise RuntimeError("BehavioralModel not loaded. Call load() or train() first.")

        x = np.array(sample, dtype=np.float32).reshape(1, -1)

        active_model = self._model
        score_min = self._global_score_min
        score_max = self._global_score_max

        if user_baseline_samples and len(user_baseline_samples) >= 10:
            try:
                personal_model = IsolationForest(
                    n_estimators=50,
                    contamination=0.05,
                    random_state=42,
                )
                X_personal = np.array(user_baseline_samples, dtype=np.float32)
                personal_model.fit(X_personal)
                raw_personal = personal_model.decision_function(X_personal)
                active_model = personal_model
                score_min = float(raw_personal.min())
                score_max = float(raw_personal.max())
            except Exception as exc:
                logger.warning("Personal model fit failed, using global: %s", exc)

        raw = float(active_model.decision_function(x)[0])

        score_range = score_max - score_min
        if score_range < 1e-6:
            normalized = 50.0
        else:
            normalized = (raw - score_min) / score_range
            normalized = 1.0 - normalized

        return float(np.clip(normalized * 100.0, 0.0, 100.0))

    def save(self, path: str | None = None) -> None:
        path = path or ARTIFACT_PATH
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as f:
            pickle.dump(
                {
                    "model": self._model,
                    "score_min": self._global_score_min,
                    "score_max": self._global_score_max,
                },
                f,
            )
        logger.info("BehavioralModel saved to %s", path)

    def load(self, path: str | None = None) -> None:
        path = path or ARTIFACT_PATH
        if not os.path.exists(path):
            logger.warning("No artifact at %s — training from synthetic data.", path)
            self._bootstrap()
            return
        with open(path, "rb") as f:
            payload = pickle.load(f)
        self._model = payload["model"]
        self._global_score_min = payload["score_min"]
        self._global_score_max = payload["score_max"]
        logger.info("BehavioralModel loaded from %s", path)

    def _bootstrap(self) -> None:
        """Train on synthetic data and persist."""
        data = _generate_synthetic_training_data(500)
        self.train(data.tolist())
        self.save()
