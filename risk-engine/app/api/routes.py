"""
Cogniq Risk Engine — API routes (mounted at /api/v1).
"""
from __future__ import annotations
import logging
import statistics
from typing import Any

from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1")


# ---------------------------------------------------------------------------
# Pydantic request / response schemas
# ---------------------------------------------------------------------------

class BehavioralSnapshot(BaseModel):
    avgDwellTime: float = 85.0
    dwellStdDev: float = 12.0
    avgFlightTime: float = 210.0
    flightStdDev: float = 45.0
    typingSpeedWpm: float = 67.0
    sessionDurationMin: float = 3.2
    actionsPerMin: float = 18.0
    mouseVelocity: float = 312.0
    swipePressure: float = 0.0
    hourOfDay: float = 14.0


class RiskContext(BaseModel):
    ipAddress: str = "0.0.0.0"
    lat: float | None = None
    lng: float | None = None
    hour: int = 12


class TransactionContext(BaseModel):
    amount: float = 0.0
    category: str = ""
    recent_count: int = 0


class UserBaseline(BaseModel):
    avg_amount: float = 500.0
    std_amount: float = 200.0
    known_categories: list[str] = []
    typical_hours: list[int] = []
    typical_locations: list[dict] = []
    behavioral_samples: list[list[float]] = []


class RiskScoreRequest(BaseModel):
    userId: str
    deviceFingerprint: str = ""
    deviceTrustScore: float = Field(default=1.0, ge=0.0, le=1.0)
    action: str = "login"
    context: RiskContext = Field(default_factory=RiskContext)
    behavioralSnapshot: BehavioralSnapshot | None = None
    transactionContext: TransactionContext | None = None
    userBaseline: UserBaseline | None = None
    recentEvents: list[dict] = []


class BehavioralUpdateRequest(BaseModel):
    userId: str
    newSample: list[float] = Field(..., min_length=10, max_length=10)


class OnboardingFormBehavior(BaseModel):
    fieldCompletionTimes: list[float] = []
    backspaceCount: int = 0
    totalKeystrokes: int = 1
    mouseEntropy: float = 0.5


class OnboardingAnalyzeRequest(BaseModel):
    userId: str
    formBehavior: OnboardingFormBehavior


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _normalize_behavioral_snapshot(snap: BehavioralSnapshot) -> list[float]:
    """Convert raw snapshot values to the 10-float normalized feature vector."""
    return [
        min(snap.avgDwellTime / 200.0, 1.0),
        min(snap.dwellStdDev / 200.0, 1.0),
        min(snap.avgFlightTime / 500.0, 1.0),
        min(snap.flightStdDev / 500.0, 1.0),
        min(snap.typingSpeedWpm / 120.0, 1.0),
        min(snap.sessionDurationMin / 60.0, 1.0),
        min(snap.actionsPerMin / 60.0, 1.0),
        min(snap.mouseVelocity / 1000.0, 1.0),
        min(snap.swipePressure / 1.0, 1.0),
        snap.hourOfDay / 23.0,
    ]


def _ok(data: Any) -> dict:
    return {"success": True, "data": data, "error": None}


def _err(msg: str) -> dict:
    return {"success": False, "data": None, "error": msg}


# ---------------------------------------------------------------------------
# POST /api/v1/risk/score
# ---------------------------------------------------------------------------

@router.post("/risk/score")
async def risk_score(request: Request, body: RiskScoreRequest):
    app = request.app
    behavioral_model = app.state.behavioral_model
    transaction_model = app.state.transaction_model
    fusion_engine = app.state.fusion_engine
    location_service = app.state.location_service
    temporal_stack = app.state.temporal_stack

    scores: dict[str, float] = {}
    all_factors: list[dict] = []

    baseline: UserBaseline | None = body.userBaseline

    # ----------------------------------------------------------------
    # 1. Behavioral score
    # ----------------------------------------------------------------
    if body.behavioralSnapshot:
        snap_vector = _normalize_behavioral_snapshot(body.behavioralSnapshot)
        user_baseline_samples = baseline.behavioral_samples if baseline else None
        behavioral_score = behavioral_model.predict(snap_vector, user_baseline_samples or None)
        scores["behavioral"] = behavioral_score

        all_factors.append(
            {
                "factor": "behavioral_deviation",
                "contribution": round(behavioral_score * 0.30, 2),
                "description": (
                    f"Typing pattern {behavioral_score:.0f}% different from baseline"
                ),
            }
        )
    else:
        scores["behavioral"] = 10.0

    # ----------------------------------------------------------------
    # 2. Device score  (inverted trust score)
    # ----------------------------------------------------------------
    device_score = (1.0 - body.deviceTrustScore) * 100.0
    scores["device"] = device_score
    all_factors.append(
        {
            "factor": "new_device" if device_score > 50 else "trusted_device",
            "contribution": round(device_score * 0.20, 2),
            "description": f"Device trust score {body.deviceTrustScore:.2f}",
        }
    )

    # ----------------------------------------------------------------
    # 3. Location score
    # ----------------------------------------------------------------
    typical_locations = baseline.typical_locations if baseline else []
    location_score, location_desc = await location_service.score_anomaly(
        user_id=body.userId,
        ip=body.context.ipAddress,
        lat=body.context.lat,
        lng=body.context.lng,
        user_typical_locations=typical_locations,
    )
    scores["location"] = location_score
    all_factors.append(
        {
            "factor": "unusual_location",
            "contribution": round(location_score * 0.20, 2),
            "description": location_desc,
        }
    )

    # ----------------------------------------------------------------
    # 4. Transaction score (only for transaction actions)
    # ----------------------------------------------------------------
    transaction_factors: list[dict] = []
    if body.action == "transaction" and body.transactionContext:
        tx_dict = {
            "amount": body.transactionContext.amount,
            "category": body.transactionContext.category,
            "hour": body.context.hour,
            "recent_count": body.transactionContext.recent_count,
        }
        baseline_dict = {
            "avg_amount": baseline.avg_amount if baseline else 500.0,
            "std_amount": baseline.std_amount if baseline else 200.0,
            "known_categories": baseline.known_categories if baseline else [],
            "typical_hours": baseline.typical_hours if baseline else [],
        } if baseline else None

        tx_score, tx_factors = transaction_model.score(tx_dict, baseline_dict)
        scores["transaction"] = tx_score
        transaction_factors = tx_factors

    # ----------------------------------------------------------------
    # 5. Temporal score
    # ----------------------------------------------------------------
    temporal_score = await temporal_stack.get_accumulated_risk(body.userId)
    scores["temporal"] = temporal_score

    # ----------------------------------------------------------------
    # 6. Fuse
    # ----------------------------------------------------------------
    final_score, fused_factors, risk_level = fusion_engine.fuse(
        scores=scores,
        context=body.context.model_dump(),
        extra_factors=transaction_factors if transaction_factors else None,
    )

    recommended_action = fusion_engine.recommended_action(final_score)

    # Rebuild explanation from top fused factors
    from app.models.fusion import _build_explanation
    explanation = _build_explanation(final_score, risk_level, fused_factors)

    # ----------------------------------------------------------------
    # 7. Push event to temporal stack (fire-and-forget)
    # ----------------------------------------------------------------
    try:
        await temporal_stack.push_event(body.userId, body.action, final_score)
    except Exception as exc:
        logger.warning("Failed to push temporal event: %s", exc)

    return _ok(
        {
            "riskScore": round(final_score, 2),
            "riskLevel": risk_level,
            "riskFactors": fused_factors,
            "recommendedAction": recommended_action,
            "explanation": explanation,
        }
    )


# ---------------------------------------------------------------------------
# POST /api/v1/risk/behavioral/update
# ---------------------------------------------------------------------------

@router.post("/risk/behavioral/update")
async def behavioral_update(request: Request, body: BehavioralUpdateRequest):
    mongo = request.app.state.mongo
    if mongo is None:
        raise HTTPException(status_code=503, detail="MongoDB not available")

    db = mongo["cogniq"]
    collection = db["behavioral_samples"]

    result = await collection.find_one({"userId": body.userId})
    if result is None:
        await collection.insert_one(
            {"userId": body.userId, "samples": [body.newSample]}
        )
        sample_count = 1
    else:
        samples: list = result.get("samples", [])
        samples.append(body.newSample)
        # Trim to last 200
        if len(samples) > 200:
            samples = samples[-200:]
        await collection.update_one(
            {"userId": body.userId},
            {"$set": {"samples": samples}},
        )
        sample_count = len(samples)

    return _ok({"updated": True, "sampleCount": sample_count})


# ---------------------------------------------------------------------------
# POST /api/v1/onboarding/analyze
# ---------------------------------------------------------------------------

@router.post("/onboarding/analyze")
async def onboarding_analyze(body: OnboardingAnalyzeRequest):
    fb = body.formBehavior
    bot_score = 0
    flags: list[str] = []

    times = fb.fieldCompletionTimes

    # ----------------------------------------------------------------
    # 1. Coefficient of variation of field completion times
    # ----------------------------------------------------------------
    if len(times) >= 2:
        mean_t = statistics.mean(times)
        std_t = statistics.stdev(times) if len(times) > 1 else 0.0
        cv = std_t / mean_t if mean_t > 0 else 0.0
        if cv < 0.15:
            bot_score += 40
            flags.append(
                f"Suspiciously uniform field completion times (CV={cv:.3f} < 0.15)"
            )
    elif len(times) == 1:
        pass

    # ----------------------------------------------------------------
    # 2. Backspace rate
    # ----------------------------------------------------------------
    total_keystrokes = max(fb.totalKeystrokes, 1)
    backspace_rate = fb.backspaceCount / total_keystrokes
    if backspace_rate < 0.02:
        bot_score += 30
        flags.append(
            f"Very low backspace rate ({backspace_rate:.3f} < 0.02) — possible bot"
        )

    # ----------------------------------------------------------------
    # 3. Mouse entropy
    # ----------------------------------------------------------------
    if fb.mouseEntropy < 0.1:
        bot_score += 30
        flags.append(
            f"Low mouse entropy ({fb.mouseEntropy:.3f} < 0.1) — robotic mouse movement"
        )

    # ----------------------------------------------------------------
    # 4. Erratic / non-human cadence (demo: mash keys + many backspaces)
    # ----------------------------------------------------------------
    if len(times) >= 2:
        mean_t = statistics.mean(times)
        std_t = statistics.stdev(times) if len(times) > 1 else 0.0
        cv_erratic = std_t / mean_t if mean_t > 0 else 0.0
        if cv_erratic > 0.75:
            bot_score += 40
            flags.append(
                f"Highly erratic field timing (CV={cv_erratic:.3f}) — non-human cadence"
            )
        if mean_t < 400 and total_keystrokes > 60:
            bot_score += 25
            flags.append(
                f"Form filled too fast ({mean_t:.0f}ms avg per field, {total_keystrokes} keystrokes)"
            )

    if backspace_rate > 0.18:
        bot_score += 35
        flags.append(
            f"Excessive corrections ({backspace_rate:.1%} backspace rate) — anomalous typing"
        )

    bot_score = min(bot_score, 100)
    is_suspected_bot = bot_score >= 60

    return _ok(
        {
            "isSuspectedBot": is_suspected_bot,
            "botScore": bot_score,
            "flags": flags,
        }
    )


# ---------------------------------------------------------------------------
# GET /api/v1/risk/history/{user_id}
# ---------------------------------------------------------------------------

@router.get("/risk/history/{user_id}")
async def risk_history(user_id: str, request: Request):
    temporal_stack = request.app.state.temporal_stack
    events = await temporal_stack.get_events(user_id)
    accumulated = await temporal_stack.get_accumulated_risk(user_id)

    return _ok({"events": events, "accumulatedRisk": accumulated})


# ---------------------------------------------------------------------------
# GET /api/v1/health
# ---------------------------------------------------------------------------

@router.get("/health")
async def health(request: Request):
    models_loaded = getattr(request.app.state, "models_loaded", False)
    return {
        "status": "ok",
        "service": "risk-engine",
        "modelsLoaded": models_loaded,
    }
