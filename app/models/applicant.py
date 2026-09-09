"""
Applicant ORM model.

Stores applicant submissions from the lineage search endpoint.
A composite index on (full_name, dob, father_or_husband_name) enables
the duplicate-detection query within the dedup window.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Date, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Applicant(Base):
    __tablename__ = "applicant"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4, index=True
    )
    full_name: Mapped[str] = mapped_column(Text, nullable=False)
    father_or_husband_name: Mapped[str] = mapped_column(Text, nullable=False)
    mother_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    dob: Mapped[object | None] = mapped_column(Date, nullable=True)
    declared_address_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationship to match results
    match_results: Mapped[list["LineageMatchResult"]] = relationship(  # noqa: F821
        "LineageMatchResult",
        back_populates="applicant",
        lazy="select",
    )

    __table_args__ = (
        # Composite index for duplicate-detection query:
        # SELECT * FROM applicant WHERE full_name=:n AND dob=:d AND father_or_husband_name=:f
        # AND created_at > NOW() - INTERVAL ':window minutes'
        Index(
            "ix_applicant_dedup",
            "full_name",
            "dob",
            "father_or_husband_name",
        ),
    )
