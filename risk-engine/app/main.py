"""
Cogniq Risk Engine — FastAPI entry point.
"""
from __future__ import annotations
import logging
import uvicorn
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lifespan: connect infra + load models on startup, teardown on shutdown
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    # ----------------------------------------------------------------
    # Redis
    # ----------------------------------------------------------------
    redis_client = None
    try:
        import redis.asyncio as aioredis
        redis_client = aioredis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=2,
        )
        await redis_client.ping()
        logger.info("Redis connected at %s", settings.redis_url)
    except Exception as exc:
        logger.warning(
            "Redis unavailable (%s). Temporal stack will return 0 gracefully.", exc
        )
        redis_client = None

    # ----------------------------------------------------------------
    # MongoDB (motor)
    # ----------------------------------------------------------------
    mongo_client = None
    try:
        import motor.motor_asyncio as motor
        mongo_client = motor.AsyncIOMotorClient(
            settings.mongo_url,
            serverSelectionTimeoutMS=3000,
        )
        # Trigger a connection check
        await mongo_client.server_info()
        logger.info("MongoDB connected at %s", settings.mongo_url)
    except Exception as exc:
        logger.warning(
            "MongoDB unavailable (%s). Behavioral updates will be disabled.", exc
        )
        mongo_client = None

    # ----------------------------------------------------------------
    # Attach infra to app state
    # ----------------------------------------------------------------
    app.state.redis = redis_client
    app.state.mongo = mongo_client

    # ----------------------------------------------------------------
    # Load models
    # ----------------------------------------------------------------
    from app.models.behavioral import BehavioralModel
    from app.models.transaction import TransactionModel
    from app.models.fusion import FusionEngine
    from app.services.temporal_stack import TemporalStack
    from app.services.location import LocationService

    behavioral_model = BehavioralModel()
    transaction_model = TransactionModel()
    fusion_engine = FusionEngine()
    temporal_stack = TemporalStack(redis_client=redis_client)
    location_service = LocationService()

    behavioral_model.load()
    transaction_model.load()
    fusion_engine.load()
    location_service.load()

    app.state.behavioral_model = behavioral_model
    app.state.transaction_model = transaction_model
    app.state.fusion_engine = fusion_engine
    app.state.temporal_stack = temporal_stack
    app.state.location_service = location_service
    app.state.models_loaded = True

    logger.info("All models loaded. Cogniq Risk Engine is ready.")

    yield

    # ----------------------------------------------------------------
    # Shutdown
    # ----------------------------------------------------------------
    if redis_client:
        await redis_client.aclose()
        logger.info("Redis connection closed.")
    if mongo_client:
        mongo_client.close()
        logger.info("MongoDB connection closed.")


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------

def create_app() -> FastAPI:
    app = FastAPI(
        title="Cogniq Risk Engine",
        description="Real-time, privacy-first identity trust scoring system",
        version="1.0.0",
        lifespan=lifespan,
    )

    # CORS — allow all origins for hackathon demo
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Health check (root-level, outside versioned prefix)
    @app.get("/health", tags=["health"])
    async def root_health():
        return {"status": "ok", "service": "risk-engine"}

    # Mount all versioned routes
    from app.api.routes import router
    app.include_router(router, tags=["risk"])

    return app


app = create_app()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.risk_engine_port,
        reload=True,
        log_level="info",
    )
