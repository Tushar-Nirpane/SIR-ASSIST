"""
DOB Rule Engine — deterministic eligibility bracket lookup.

The bracket configuration lives in the `dob_rule_bracket` table.
This service reads from the DB at runtime — no bracket logic is hardcoded
in Python. A future admin panel can modify brackets without a redeploy.

Bracket matching logic:
  A DOB `d` matches a bracket if:
    (bracket.min_dob IS NULL OR d >= bracket.min_dob)
    AND
    (bracket.max_dob IS NULL OR d <= bracket.max_dob)
  NULL min_dob = "from the beginning of time" (open lower bound).
  NULL max_dob = "no upper limit" (open upper bound).
"""

import logging
from datetime import date

from sqlalchemy import select, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.dob_rule import DobRuleBracket

logger = logging.getLogger(__name__)


async def evaluate_dob(dob: date, session: AsyncSession) -> DobRuleBracket | None:
    """
    Look up the statutory DOB bracket for a given date of birth.

    Returns the matching DobRuleBracket ORM object, or None if no bracket
    covers the given DOB (indicates a configuration gap).

    Args:
        dob: The applicant's date of birth.
        session: An active async SQLAlchemy session.

    Returns:
        DobRuleBracket | None
    """
    stmt = select(DobRuleBracket).where(
        and_(
            # Lower bound: match if no minimum DOB is set, or DOB >= min_dob
            or_(
                DobRuleBracket.min_dob.is_(None),
                DobRuleBracket.min_dob <= dob,
            ),
            # Upper bound: match if no maximum DOB is set, or DOB <= max_dob
            or_(
                DobRuleBracket.max_dob.is_(None),
                DobRuleBracket.max_dob >= dob,
            ),
        )
    )

    result = await session.execute(stmt)
    bracket = result.scalar_one_or_none()

    if bracket is None:
        logger.warning(
            "No DOB bracket found for dob=%s. Check dob_rule_bracket table for gaps.",
            dob,
        )

    return bracket
