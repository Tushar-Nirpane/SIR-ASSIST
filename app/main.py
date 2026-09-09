"""
SIR-Assist FastAPI Application Entry Point.

Registers:
  - CORS middleware (explicit origins — no wildcard)
  - Request size limit middleware
  - Global exception handlers
  - API v1 routers
"""

import logging
import time

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import IntegrityError

from app.api.v1 import dob_eligibility, health, lineage, sync
from app.config import settings
from app.exceptions import (
    generic_exception_handler,
    integrity_error_handler,
    validation_exception_handler,
)

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="SIR-Assist API",
    description=(
        "Backend for India's Special Intensive Revision (SIR) digital "
        "lineage and document verification platform."
    ),
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# --- CORS ---
cors_origins = [o.strip() for o in settings.CORS_ORIGIN.split(",") if o.strip()]
if "http://localhost:3000" in cors_origins and "http://127.0.0.1:3000" not in cors_origins:
    cors_origins.append("http://127.0.0.1:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Request size limit middleware ---
@app.middleware("http")
async def limit_request_size(request: Request, call_next):
    """
    Reject requests with Content-Length exceeding MAX_REQUEST_BODY_BYTES.
    Prevents large-payload DoS. Sane default: 1 MB.
    """
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > settings.MAX_REQUEST_BODY_BYTES:
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=413,
            content={
                "error": "REQUEST_TOO_LARGE",
                "detail": (
                    f"Request body exceeds the {settings.MAX_REQUEST_BODY_BYTES} byte limit."
                ),
            },
        )
    return await call_next(request)


# --- Request timing middleware ---
@app.middleware("http")
async def add_request_timing(request: Request, call_next):
    start = time.monotonic()
    response = await call_next(request)
    duration_ms = (time.monotonic() - start) * 1000
    response.headers["X-Response-Time-Ms"] = f"{duration_ms:.2f}"
    logger.info(
        "%s %s → %d (%.2fms)",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


# --- Global exception handlers ---
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(IntegrityError, integrity_error_handler)
app.add_exception_handler(Exception, generic_exception_handler)


# --- API Routers ---
app.include_router(
    dob_eligibility.router,
    prefix="/api/v1/dob-eligibility",
    tags=["DOB Eligibility"],
)
app.include_router(
    lineage.router,
    prefix="/api/v1/lineage",
    tags=["Lineage"],
)
app.include_router(
    health.router,
    prefix="/api/v1/health",
    tags=["Health"],
)
app.include_router(
    sync.router,
    prefix="/api/v1/sync",
    tags=["Sync"],
)


@app.get("/", include_in_schema=False)
async def root():
    return {"service": "SIR-Assist API", "version": "0.1.0", "docs": "/api/docs"}
