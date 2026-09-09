"""
POST /api/v1/dob-eligibility/evaluate

Evaluates a date of birth against the statutory DOB bracket table
and returns the matching bracket with required documents.

Validation is handled entirely by the Pydantic schema (DobEligibilityRequest):
  - Malformed dates → 422 (Pydantic parse failure)
  - Future dates → 422 (field_validator in schema)
  - Pre-1900 dates → 422 (field_validator in schema)

Business errors:
  - No matching bracket → 404 NO_BRACKET_FOUND
"""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.dob_eligibility import DobEligibilityRequest, DobEligibilityResponse
from app.services.dob_rule_engine import evaluate_dob
import datetime

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post(
    "/evaluate",
    response_model=DobEligibilityResponse,
    summary="Evaluate DOB eligibility bracket",
    description=(
        "Given a date of birth, returns the applicable statutory SIR bracket "
        "and the list of documents required for verification."
    ),
    responses={
        422: {"description": "Validation error — invalid or future date"},
        404: {"description": "No bracket configured for this DOB"},
    },
)
async def evaluate_dob_eligibility(
    request: DobEligibilityRequest,
    session: AsyncSession = Depends(get_db),
) -> DobEligibilityResponse:
    bracket = await evaluate_dob(request.dob, session)

    if bracket is None:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "NO_BRACKET_FOUND",
                "detail": (
                    "The provided date of birth does not fall within any configured bracket. "
                    "This may indicate a configuration gap — please contact an administrator."
                ),
            },
        )

    logger.info(
        "DOB %s matched bracket '%s'", request.dob, bracket.bracket_key
    )

    return DobEligibilityResponse(
        bracket=bracket.bracket_key,
        description=bracket.description,
        required_documents=bracket.required_documents or [],
        notes="",
    )


@router.get(
    "/eligibility",
    response_model=DobEligibilityResponse,
    summary="Evaluate DOB eligibility (GET convenience route for frontend)",
    responses={
        422: {"description": "Validation error — invalid or missing dob query param"},
        404: {"description": "No bracket configured for this DOB"},
    },
)
async def get_dob_eligibility(
    dob: str,
    session: AsyncSession = Depends(get_db),
) -> DobEligibilityResponse:
    """GET alias: ?dob=YYYY-MM-DD — used by the Next.js frontend."""
    try:
        parsed = datetime.date.fromisoformat(dob)
    except ValueError:
        raise HTTPException(status_code=422, detail={"error": "INVALID_DATE", "detail": f"'{dob}' is not a valid ISO date."})

    bracket = await evaluate_dob(parsed, session)

    if bracket is None:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "NO_BRACKET_FOUND",
                "detail": (
                    "The provided date of birth does not fall within any configured bracket."
                ),
            },
        )

    logger.info("DOB %s (GET) matched bracket '%s'", dob, bracket.bracket_key)

    return DobEligibilityResponse(
        bracket=bracket.bracket_key,
        description=bracket.description,
        required_documents=bracket.required_documents or [],
        notes="",
    )

