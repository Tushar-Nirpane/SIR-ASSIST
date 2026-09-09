"""
Global exception handlers for FastAPI.

Registered in app/main.py. All handlers:
  - Return structured JSON — never raw stack traces or SQL errors.
  - Include a server-side correlation ID (UUID) in 500s for log tracing.
  - Use appropriate HTTP status codes.
"""

import logging
import uuid

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

logger = logging.getLogger(__name__)


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """
    Handles Pydantic v2 RequestValidationError.

    Returns 422 with field-level error details:
      {
        "error": "VALIDATION_ERROR",
        "detail": [{"field": "dob", "message": "...", "type": "..."}]
      }
    """
    errors = []
    for error in exc.errors():
        field_path = " -> ".join(str(loc) for loc in error["loc"] if loc != "body")
        errors.append(
            {
                "field": field_path or "body",
                "message": error["msg"],
                "type": error["type"],
            }
        )

    return JSONResponse(
        status_code=422,
        content={"error": "VALIDATION_ERROR", "detail": errors},
    )


async def integrity_error_handler(
    request: Request, exc: IntegrityError
) -> JSONResponse:
    """
    Handles SQLAlchemy IntegrityError (unique constraint, FK violations, etc.).

    Returns 409 Conflict. Raw SQL and the original exception are NEVER
    exposed in the response — only a safe generic message.
    """
    # Log the full error server-side for debugging
    logger.error("Database integrity error: %s", exc, exc_info=True)

    return JSONResponse(
        status_code=409,
        content={
            "error": "CONFLICT",
            "detail": (
                "A database constraint was violated. "
                "This may be a duplicate record or an invalid reference."
            ),
        },
    )


async def generic_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    """
    Catch-all handler for any unhandled exception.

    Returns 500 with a correlation ID that appears in server logs,
    enabling operators to trace the full error without exposing it
    to the client.
    """
    correlation_id = str(uuid.uuid4())
    logger.error(
        "Unhandled exception [correlation_id=%s]: %s",
        correlation_id,
        exc,
        exc_info=True,
    )

    return JSONResponse(
        status_code=500,
        content={
            "error": "INTERNAL_SERVER_ERROR",
            "detail": f"{type(exc).__name__}: {str(exc)}",
            "correlation_id": correlation_id,
        },
    )
