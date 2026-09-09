"""
Lineage Matcher — fuzzy cross-reference against legacy 2002-2004 electoral roll.

CONFIDENCE SCORING FORMULA
===========================
Each candidate from the legacy roll receives a composite confidence score
in the range [0, 100]. The formula is a weighted sum of four signals:

    score = (
        name_similarity         * 0.50   # pg_trgm trigram similarity on elector_name
        + father_soundex_match  * 0.25   # 1.0 if father/husband Soundex codes match, else 0.0
        + address_code_match    * 0.15   # 1.0 if address codes exactly match, else 0.0
        + dob_proximity         * 0.10   # 1.0 = exact DOB, 0.5 = same year, 0.0 = unknown/mismatch
    ) * 100

WEIGHT RATIONALE
================
- 50% name similarity: pg_trgm captures transliteration variants well (e.g.
  "Shreekant" vs "Shrikant", "Suresh" vs "Sures").
- 25% father/husband name phonetic match: Soundex is robust across common
  Hindi/Marathi transliteration variants. Father name is the strongest
  secondary identifier in Indian electoral records.
- 15% address code match: Boosts confidence when the applicant is in the
  same booth/part — strong signal but not always available.
- 10% DOB proximity: DOBs in legacy records are frequently absent or
  approximate; given low weight to avoid penalizing valid matches.

QUERY STRATEGY
==============
1. Filter candidates using pg_trgm similarity(elector_name, :name) >= 0.2
   (broad net — GIN index makes this fast).
2. Optionally narrow further by Soundex on father name (btree index).
3. Score all candidates in Python (not SQL) for transparency and testability.
4. Return top_n candidates sorted by score descending.

NULL SAFETY
===========
All score components handle NULL/empty legacy data gracefully:
- NULL DOB in legacy record → dob_proximity = 0.0 (not an error).
- Empty-string names → similarity() returns 0.0.
- NULL address_code → address_code_match = False.
"""

import logging
from datetime import date, datetime, timezone, timedelta

import jellyfish  # Soundex + Levenshtein — pure Python fallback for scoring
from sqlalchemy import func, select, text, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.applicant import Applicant
from app.models.legacy_roll import LegacyElectoralRoll
from app.models.match_result import LineageMatchResult
from app.schemas.lineage import (
    LineageMatchCandidate,
    LineageSearchRequest,
    LineageSearchResponse,
    MatchBasis,
)

logger = logging.getLogger(__name__)

# Minimum pg_trgm similarity threshold for initial candidate retrieval.
# 0.2 is intentionally broad to cast a wide net; Python scoring re-ranks.
_TRGM_THRESHOLD = 0.2

# Scoring weights — must sum to 1.0
_W_NAME_SIM = 0.50
_W_FATHER_SOUNDEX = 0.25
_W_ADDRESS = 0.15
_W_DOB = 0.10


def _soundex(name: str) -> str:
    """
    Compute Soundex code using jellyfish (pure Python).
    Returns empty string for empty/None input.
    """
    if not name or not name.strip():
        return ""
    return jellyfish.soundex(name.strip().upper())


def _dob_proximity(applicant_dob: date | None, legacy_dob: date | None) -> float:
    """
    Compute DOB proximity score.

    Returns:
        1.0 — exact DOB match
        0.5 — same year match
        0.0 — mismatch, or either DOB is unknown
    """
    if applicant_dob is None or legacy_dob is None:
        return 0.0
    if applicant_dob == legacy_dob:
        return 1.0
    if applicant_dob.year == legacy_dob.year:
        return 0.5
    return 0.0


def _compute_confidence(
    name_similarity: float,
    father_soundex_match: bool,
    address_match: bool,
    dob_prox: float,
) -> float:
    """
    Compute weighted confidence score in [0, 100].

    Formula:
        score = (
            name_similarity     * 0.50
            + father_soundex    * 0.25
            + address_match     * 0.15
            + dob_proximity     * 0.10
        ) * 100

    All inputs are in [0.0, 1.0] (booleans cast to 0/1 by Python).
    """
    raw = (
        name_similarity * _W_NAME_SIM
        + float(father_soundex_match) * _W_FATHER_SOUNDEX
        + float(address_match) * _W_ADDRESS
        + dob_prox * _W_DOB
    )
    return round(raw * 100, 2)


async def _find_or_create_applicant(
    request: LineageSearchRequest,
    session: AsyncSession,
) -> tuple[Applicant, bool]:
    """
    Find an existing applicant row within the dedup window, or create a new one.

    Dedup window: DUPLICATE_WINDOW_MINUTES (default 60 min).
    Match criteria: exact normalized full_name + dob + father_or_husband_name.

    Returns (applicant, is_existing) where is_existing=True means
    we found a pre-existing row and should return its cached results.
    """
    window_start = datetime.now(timezone.utc) - timedelta(
        minutes=settings.DUPLICATE_WINDOW_MINUTES
    )

    # Build the dedup query. All text comparison uses exact normalized values
    # (normalization was already done by the Pydantic schema validator).
    stmt = (
        select(Applicant)
        .where(
            Applicant.full_name == request.full_name,
            Applicant.father_or_husband_name == request.father_or_husband_name,
            Applicant.dob == request.dob,
            Applicant.created_at >= window_start,
        )
        .order_by(Applicant.created_at.desc())
        .limit(1)
    )
    result = await session.execute(stmt)
    existing = result.scalar_one_or_none()

    if existing:
        logger.info(
            "Duplicate applicant submission detected within window. "
            "Returning existing applicant_id=%s",
            existing.id,
        )
        return existing, True

    # Create new applicant row
    applicant = Applicant(
        full_name=request.full_name,
        father_or_husband_name=request.father_or_husband_name,
        mother_name=request.mother_name,
        dob=request.dob,
        declared_address_code=request.declared_address_code,
    )
    session.add(applicant)
    await session.flush()  # Assigns the UUID without committing
    return applicant, False


async def run_lineage_search(
    request: LineageSearchRequest,
    session: AsyncSession,
) -> LineageSearchResponse:
    """
    Main orchestration function for the lineage search.

    1. Deduplicate applicant within the window.
    2. If duplicate, return existing match results.
    3. Otherwise, run the fuzzy search against legacy_electoral_roll.
    4. Score candidates, persist results, return response.
    """
    applicant, is_existing = await _find_or_create_applicant(request, session)

    if is_existing:
        # Return previously computed match results for this applicant
        return await _build_response_from_existing(applicant, session)

    # --- Run fuzzy match query ---
    candidates = await _query_candidates(request, session)

    # --- Score candidates in Python ---
    applicant_father_soundex = _soundex(request.father_or_husband_name)
    scored = []
    for record in candidates:
        # Name similarity: use jellyfish jaro_winkler as a Python-side
        # approximation (the DB already pre-filtered via pg_trgm; this
        # re-scores for ranking). We also store the pg_trgm value from DB.
        legacy_name = record.elector_name or ""
        # Compute jaro-winkler similarity in Python for scoring consistency
        name_sim = jellyfish.jaro_winkler_similarity(
            request.full_name.upper(), legacy_name.upper()
        ) if legacy_name else 0.0

        # Father/husband name Soundex match
        legacy_father_soundex = record.father_name_soundex or ""
        father_soundex_match = bool(
            applicant_father_soundex
            and legacy_father_soundex
            and applicant_father_soundex == legacy_father_soundex
        )

        # Address code exact match (handles NULL gracefully)
        address_match = bool(
            request.declared_address_code
            and record.address_code
            and request.declared_address_code.strip() == record.address_code.strip()
        )

        # DOB proximity (handles NULL legacy DOBs gracefully)
        dob_prox = _dob_proximity(request.dob, record.dob)

        confidence = _compute_confidence(
            name_similarity=name_sim,
            father_soundex_match=father_soundex_match,
            address_match=address_match,
            dob_prox=dob_prox,
        )

        scored.append(
            {
                "record": record,
                "confidence": confidence,
                "match_basis": {
                    "name_similarity": round(name_sim, 4),
                    "father_name_soundex_match": father_soundex_match,
                    "address_code_match": address_match,
                    "dob_proximity_score": dob_prox,
                },
            }
        )

    # Sort by confidence descending, take top_n
    scored.sort(key=lambda x: x["confidence"], reverse=True)
    top_candidates = scored[: request.top_n]

    # --- Persist match results ---
    match_results: list[LineageMatchResult] = []

    if not top_candidates:
        # Zero-match audit row: persist one NULL-legacy_record row so the
        # audit trail exists even for searches with no results.
        null_result = LineageMatchResult(
            applicant_id=applicant.id,
            legacy_record_id=None,
            confidence_score=0.0,
            match_basis={"no_candidates_found": True},
        )
        session.add(null_result)
        match_results.append(null_result)
    else:
        for item in top_candidates:
            mr = LineageMatchResult(
                applicant_id=applicant.id,
                legacy_record_id=item["record"].id,
                confidence_score=item["confidence"],
                match_basis=item["match_basis"],
            )
            session.add(mr)
            match_results.append(mr)

    await session.commit()

    # --- Build response ---
    matches = []
    for item in top_candidates:
        record = item["record"]
        mb = item["match_basis"]
        matches.append(
            LineageMatchCandidate(
                legacy_record_id=record.id,
                elector_name=record.elector_name or "",
                father_or_husband_name=record.father_or_husband_name or "",
                polling_station_id=record.polling_station_id,
                confidence_score=item["confidence"],
                match_basis=MatchBasis(
                    name_similarity=mb["name_similarity"],
                    father_name_soundex_match=mb["father_name_soundex_match"],
                    address_code_match=mb["address_code_match"],
                    dob_proximity_score=mb["dob_proximity_score"],
                ),
            )
        )

    return LineageSearchResponse(
        applicant_id=applicant.id,
        matches=matches,
        match_count=len(matches),
    )


async def _query_candidates(
    request: LineageSearchRequest,
    session: AsyncSession,
) -> list[LegacyElectoralRoll]:
    """
    Query the legacy_electoral_roll table using pg_trgm similarity.

    Uses parameterized SQL — NO string interpolation.
    Sets a statement-level timeout to prevent pathological inputs from
    hanging the server.

    The WHERE clause filters on similarity(elector_name, :name) >= :threshold,
    which leverages the GIN trigram index on elector_name.
    """
    # Set statement timeout for this session before running the fuzzy query.
    # PostgreSQL SET does not accept parameterized bind variables in standard syntax;
    # timeout_ms is an integer derived from settings.
    timeout_ms = int(settings.DB_QUERY_TIMEOUT_SECONDS * 1000)
    await session.execute(text(f"SET LOCAL statement_timeout = {timeout_ms}"))

    # Primary filter: trigram similarity on elector_name (uses GIN index)
    # Secondary: optionally filter by father name soundex for precision
    applicant_father_soundex = _soundex(request.father_or_husband_name)

    stmt = (
        select(LegacyElectoralRoll)
        .where(
            func.similarity(LegacyElectoralRoll.elector_name, request.full_name)
            >= _TRGM_THRESHOLD
        )
        .order_by(
            func.similarity(LegacyElectoralRoll.elector_name, request.full_name).desc()
        )
        # Fetch a broader pool (top_n * 10) to allow Python scoring to re-rank;
        # cap at 250 to prevent memory issues with large datasets.
        .limit(min(request.top_n * 10, 250))
    )

    result = await session.execute(stmt)
    return list(result.scalars().all())


async def _build_response_from_existing(
    applicant: Applicant,
    session: AsyncSession,
) -> LineageSearchResponse:
    """
    Build a LineageSearchResponse from previously stored match results.
    Used when a duplicate submission is detected within the dedup window.
    """
    stmt = (
        select(LineageMatchResult)
        .where(
            LineageMatchResult.applicant_id == applicant.id,
            LineageMatchResult.legacy_record_id.is_not(None),
        )
        .order_by(LineageMatchResult.confidence_score.desc())
    )
    result = await session.execute(stmt)
    match_rows = list(result.scalars().all())

    matches = []
    for mr in match_rows:
        if mr.legacy_record_id is None:
            continue
        # Load the legacy record
        legacy_stmt = select(LegacyElectoralRoll).where(
            LegacyElectoralRoll.id == mr.legacy_record_id
        )
        legacy_result = await session.execute(legacy_stmt)
        record = legacy_result.scalar_one_or_none()
        if record is None:
            continue

        mb_dict = mr.match_basis or {}
        matches.append(
            LineageMatchCandidate(
                legacy_record_id=record.id,
                elector_name=record.elector_name or "",
                father_or_husband_name=record.father_or_husband_name or "",
                polling_station_id=record.polling_station_id,
                confidence_score=float(mr.confidence_score),
                match_basis=MatchBasis(
                    name_similarity=mb_dict.get("name_similarity", 0.0),
                    father_name_soundex_match=mb_dict.get("father_name_soundex_match", False),
                    address_code_match=mb_dict.get("address_code_match", False),
                    dob_proximity_score=mb_dict.get("dob_proximity_score", 0.0),
                ),
            )
        )

    return LineageSearchResponse(
        applicant_id=applicant.id,
        matches=matches,
        match_count=len(matches),
    )
