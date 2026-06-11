"""
Location Anomaly Service.
Uses haversine distance to compare the current IP/GPS position against
the user's historical location clusters.
"""
from __future__ import annotations
import math
import logging
from typing import Any

logger = logging.getLogger(__name__)

EARTH_RADIUS_KM = 6371.0

DISTANCE_TIERS: list[tuple[float, float]] = [
    (50.0,    0.0),
    (200.0,  30.0),
    (1000.0, 60.0),
    (math.inf, 85.0),
]


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(d_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return EARTH_RADIUS_KM * c


def _score_for_distance(distance_km: float) -> float:
    for ceiling, score in DISTANCE_TIERS:
        if distance_km < ceiling:
            return score
    return 85.0


class LocationService:
    def load(self) -> None:
        """No artifact — no-op for interface compatibility."""
        logger.info("LocationService ready.")

    async def score_anomaly(
        self,
        user_id: str,
        ip: str,
        lat: float | None,
        lng: float | None,
        user_typical_locations: list[dict[str, Any]],
    ) -> tuple[float, str]:
        if not user_typical_locations:
            return 20.0, "No location baseline available for this user"

        if lat is None or lng is None:
            return 15.0, f"Location data unavailable (IP: {ip})"

        min_distance_km = math.inf
        closest_label = ""

        for loc in user_typical_locations:
            try:
                t_lat = float(loc["lat"])
                t_lng = float(loc["lng"])
            except (KeyError, TypeError, ValueError):
                continue

            dist = _haversine(lat, lng, t_lat, t_lng)
            if dist < min_distance_km:
                min_distance_km = dist
                radius = float(loc.get("radius_km", 0))
                closest_label = f"{t_lat:.2f}°, {t_lng:.2f}° (r={radius}km)"

        if min_distance_km == math.inf:
            return 20.0, "No valid coordinates in location baseline"

        score = _score_for_distance(min_distance_km)

        if score == 0.0:
            description = f"Within {min_distance_km:.0f} km of usual location {closest_label}"
        else:
            description = f"{min_distance_km:.0f} km from nearest usual location {closest_label}"

        return score, description
