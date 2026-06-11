"""
Temporal Risk Stack — Redis-backed time-decaying risk accumulator.
"""
from __future__ import annotations
import json
import logging
import math
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

REDIS_KEY_PREFIX = "user:riskstack:"
LIST_TTL_SECONDS = 7 * 24 * 3600   # 7 days
MAX_EVENTS = 20
DECAY_LAMBDA = 0.1                  # decay constant (per hour)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _hours_ago(iso_timestamp: str) -> float:
    try:
        then = datetime.fromisoformat(iso_timestamp)
        now = datetime.now(timezone.utc)
        delta = now - then
        return delta.total_seconds() / 3600.0
    except Exception:
        return 0.0


class TemporalStack:
    def __init__(self, redis_client=None):
        self._redis = redis_client

    def set_redis(self, redis_client) -> None:
        self._redis = redis_client

    async def push_event(self, user_id: str, event_type: str, score: float) -> None:
        if self._redis is None:
            return

        key = f"{REDIS_KEY_PREFIX}{user_id}"
        entry = json.dumps(
            {
                "event_type": event_type,
                "score": round(float(score), 4),
                "timestamp": _now_iso(),
            }
        )
        try:
            pipe = self._redis.pipeline()
            pipe.rpush(key, entry)
            pipe.ltrim(key, -MAX_EVENTS, -1)
            pipe.expire(key, LIST_TTL_SECONDS)
            await pipe.execute()
        except Exception as exc:
            logger.warning("TemporalStack.push_event failed for %s: %s", user_id, exc)

    async def get_events(self, user_id: str) -> list[dict[str, Any]]:
        if self._redis is None:
            return []

        key = f"{REDIS_KEY_PREFIX}{user_id}"
        try:
            raw_entries = await self._redis.lrange(key, 0, -1)
            events = []
            for raw in raw_entries:
                try:
                    events.append(json.loads(raw))
                except json.JSONDecodeError:
                    pass
            return events
        except Exception as exc:
            logger.warning("TemporalStack.get_events failed for %s: %s", user_id, exc)
            return []

    async def get_accumulated_risk(self, user_id: str) -> float:
        events = await self.get_events(user_id)
        if not events:
            return 0.0

        total_weight = 0.0
        for event in events:
            score = float(event.get("score", 0.0))
            ts = event.get("timestamp", _now_iso())
            hours = _hours_ago(ts)
            decay_factor = math.exp(-DECAY_LAMBDA * hours)
            total_weight += score * decay_factor

        max_possible = MAX_EVENTS * 100.0
        normalized = min((total_weight / max_possible) * 100.0, 100.0)
        return round(normalized, 2)
