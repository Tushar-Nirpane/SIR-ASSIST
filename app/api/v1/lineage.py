"""
Lineage search and match retrieval endpoints.

POST /api/v1/lineage/search
  - Fuzzy matches applicant against 2002-2004 legacy electoral roll.
  - Persists applicant + match results (even zero-match is persisted for audit).
  - Deduplicates submissions within a configurable time window.

GET /api/v1/lineage/match/{match_result_id}
  - Fetches a previously computed match result by its UUID.
"""

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.match_result import LineageMatchResult
from app.schemas.lineage import (
    LineageMatchResultResponse,
    LineageSearchRequest,
    LineageSearchResponse,
)
from app.services.lineage_matcher import run_lineage_search

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post(
    "/search",
    response_model=LineageSearchResponse,
    summary="Search lineage against legacy electoral roll",
    description=(
        "Fuzzy-matches an applicant's name and family details against the "
        "2002-2004 legacy electoral roll archive. Returns top-N candidates "
        "with confidence scores. Zero matches is a valid outcome (HTTP 200)."
    ),
    responses={
        422: {"description": "Validation error — missing required fields or invalid input"},
    },
)
async def search_lineage(
    request: LineageSearchRequest,
    session: AsyncSession = Depends(get_db),
) -> LineageSearchResponse:
    logger.info(
        "Lineage search request: name='%s', father='%s', top_n=%d",
        request.full_name,
        request.father_or_husband_name,
        request.top_n,
    )

    response = await run_lineage_search(request, session)

    logger.info(
        "Lineage search complete: applicant_id=%s, match_count=%d",
        response.applicant_id,
        response.match_count,
    )
    return response


@router.get(
    "/match/{match_result_id}",
    response_model=LineageMatchResultResponse,
    summary="Fetch a lineage match result by ID",
    description="Retrieves a previously computed lineage match result by its UUID.",
    responses={
        404: {"description": "Match result not found"},
    },
)
async def get_match_result(
    match_result_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
) -> LineageMatchResultResponse:
    stmt = select(LineageMatchResult).where(
        LineageMatchResult.id == match_result_id
    )
    result = await session.execute(stmt)
    mr = result.scalar_one_or_none()

    if mr is None:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "MATCH_RESULT_NOT_FOUND",
                "detail": f"No match result found with id={match_result_id}",
            },
        )

    return LineageMatchResultResponse(
        id=mr.id,
        applicant_id=mr.applicant_id,
        legacy_record_id=mr.legacy_record_id,
        confidence_score=float(mr.confidence_score),
        match_basis=mr.match_basis or {},
        created_at=mr.created_at.isoformat(),
    )
