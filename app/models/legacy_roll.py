"""
LegacyElectoralRoll ORM model — 2002-2004 electoral roll archive.

This table is read-mostly. Soundex columns are pre-computed at insert time
(either by the seed script or by a future DB trigger). The GIN trigram indexes
on name columns enable fast fuzzy similarity searches via pg_trgm.
"""

import uuid

from sqlalchemy import Index, SmallInteger, String, Date, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class LegacyElectoralRoll(Base):
    __tablename__ = "legacy_electoral_roll"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4, index=True
    )
    elector_name: Mapped[str] = mapped_column(Text, nullable=False, default="")
    father_or_husband_name: Mapped[str] = mapped_column(Text, nullable=False, default="")
    mother_name: Mapped[str | None] = mapped_column(Text, nullable=True)

    # DOB is nullable — legacy records are frequently incomplete
    dob: Mapped[object | None] = mapped_column(Date, nullable=True)

    # Structural address / booth-part code for locality matching
    address_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    polling_station_id: Mapped[str | None] = mapped_column(String(64), nullable=True)

    roll_year: Mapped[int] = mapped_column(SmallInteger, nullable=False)

    # Pre-computed Soundex codes for fast phonetic matching
    elector_name_soundex: Mapped[str | None] = mapped_column(String(8), nullable=True)
    father_name_soundex: Mapped[str | None] = mapped_column(String(8), nullable=True)

    __table_args__ = (
        # Btree indexes for exact-match lookups
        Index("ix_legacy_address_code", "address_code"),
        Index("ix_legacy_polling_station", "polling_station_id"),
        # Btree indexes on soundex columns for phonetic joins
        Index("ix_legacy_elector_soundex", "elector_name_soundex"),
        Index("ix_legacy_father_soundex", "father_name_soundex"),
        # GIN trigram indexes for similarity() queries via pg_trgm
        Index(
            "ix_legacy_elector_name_trgm",
            "elector_name",
            postgresql_using="gin",
            postgresql_ops={"elector_name": "gin_trgm_ops"},
        ),
        Index(
            "ix_legacy_father_name_trgm",
            "father_or_husband_name",
            postgresql_using="gin",
            postgresql_ops={"father_or_husband_name": "gin_trgm_ops"},
        ),
    )
