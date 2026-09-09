"""
DobRuleBracket ORM model — statutory DOB eligibility brackets.

The DB row is the source of truth for bracket logic.
A future admin panel can edit required_documents without a redeploy.
The Python service layer reads from this table at runtime —
no bracket logic is hardcoded in Python.

Bracket keys (bracket_key):
  - pre_1987     : DOB before 1987-01-01
  - 1987_2004    : DOB between 1987-01-01 and 2004-12-31 inclusive
  - post_2004    : DOB after 2004-12-31
"""

import uuid

from sqlalchemy import Date, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class DobRuleBracket(Base):
    __tablename__ = "dob_rule_bracket"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    bracket_key: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)

    # Nullable bounds: NULL min_dob means "from the beginning of time",
    # NULL max_dob means "open-ended / into the future".
    min_dob: Mapped[object | None] = mapped_column(Date, nullable=True)
    max_dob: Mapped[object | None] = mapped_column(Date, nullable=True)

    # JSONB array of document names, e.g.:
    # ["Aadhaar Card", "Birth Certificate", "Parent's Voter ID"]
    required_documents: Mapped[list] = mapped_column(
        JSONB, nullable=False, default=list
    )
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")

    __table_args__ = (
        UniqueConstraint("bracket_key", name="uq_dob_rule_bracket_key"),
    )
