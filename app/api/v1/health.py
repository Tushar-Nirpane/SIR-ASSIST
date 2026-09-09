"""
GET /api/v1/health

Liveness and DB connectivity check.

Returns:
  200 — Application is running and DB is reachable.
  503 — Application is running but DB ping failed.

This endpoint does NOT return a hardcoded {"status": "ok"}.
The DB connectivity is tested on every request via a real SELECT 1.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.database import AsyncSessionLocal
from app.schemas.lineage import HealthResponse

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get(
    "",
    summary="Health and liveness check",
    description=(
        "Returns 200 if the API and database are healthy. "
        "Returns 503 if the database is unreachable."
    ),
    responses={
        200: {"model": HealthResponse, "description": "Service healthy"},
        503: {"description": "Database unreachable"},
    },
)
async def health_check() -> JSONResponse:
    timestamp = datetime.now(timezone.utc).isoformat()

    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
            legacy_count = await session.scalar(text("SELECT COUNT(1) FROM legacy_electoral_roll"))
            applicant_count = await session.scalar(text("SELECT COUNT(1) FROM applicant"))
            
        db_status = "ok"
        http_status = 200
    except Exception as exc:
        logger.error("Health check DB ping failed: %s", exc)
        db_status = "unreachable"
        http_status = 503
        legacy_count = 0
        applicant_count = 0

    return JSONResponse(
        status_code=http_status,
        content={
            "status": "ok" if http_status == 200 else "degraded",
            "database": db_status,
            "legacy_roll_count": legacy_count or 0,
            "applicant_count": applicant_count or 0,
            "version": "0.1.0",
            "timestamp": timestamp,
        },
    )
