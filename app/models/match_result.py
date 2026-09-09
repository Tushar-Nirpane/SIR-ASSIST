"""
LineageMatchResult ORM model.

Stores one row per candidate match per applicant submission.
If no match is found, a single row with legacy_record_id=NULL is persisted
to maintain a complete audit trail (even zero-match submissions are recorded).

The match_basis JSONB column stores the component scores that produced
the final confidence_score, enabling future UI inspection and audit.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Numeric, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class LineageMatchResult(Base):
    __tablename__ = "lineage_match_result"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4, index=True
    )
    applicant_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("applicant.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # NULL if no match was found (zero-match audit row)
    legacy_record_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("legacy_electoral_roll.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    confidence_score: Mapped[float] = mapped_column(
        Numeric(5, 2), nullable=False, default=0.0
    )
    # JSONB storing component scores for audit/UI:
    # {
    #   "name_similarity": 0.85,
    #   "father_name_soundex_match": true,
    #   "address_code_match": false,
    #   "dob_proximity_score": 0.5
    # }
    match_basis: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    applicant: Mapped["Applicant"] = relationship(  # noqa: F821
        "Applicant",
        back_populates="match_results",
        lazy="select",
    )
    legacy_record: Mapped["LegacyElectoralRoll | None"] = relationship(  # noqa: F821
        "LegacyElectoralRoll",
        lazy="select",
    )
