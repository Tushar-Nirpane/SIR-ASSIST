"""Create all tables: legacy_electoral_roll, applicant, lineage_match_result, dob_rule_bracket

Revision ID: 001
Revises: 
Create Date: 2026-08-20

Indexes created:
  legacy_electoral_roll:
    - btree on address_code, polling_station_id
    - btree on elector_name_soundex, father_name_soundex
    - GIN trigram on elector_name, father_or_husband_name (requires pg_trgm)
  applicant:
    - composite btree on (full_name, dob, father_or_husband_name) for dedup
  lineage_match_result:
    - btree on applicant_id, legacy_record_id
  dob_rule_bracket:
    - unique on bracket_key
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------ #
    # dob_rule_bracket — must be created first (no FK dependencies)
    # ------------------------------------------------------------------ #
    op.create_table(
        "dob_rule_bracket",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("bracket_key", sa.String(length=64), nullable=False),
        sa.Column("min_dob", sa.Date(), nullable=True),
        sa.Column("max_dob", sa.Date(), nullable=True),
        sa.Column(
            "required_documents",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("bracket_key", name="uq_dob_rule_bracket_key"),
    )

    # ------------------------------------------------------------------ #
    # legacy_electoral_roll
    # ------------------------------------------------------------------ #
    op.create_table(
        "legacy_electoral_roll",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("elector_name", sa.Text(), nullable=False, server_default=""),
        sa.Column("father_or_husband_name", sa.Text(), nullable=False, server_default=""),
        sa.Column("mother_name", sa.Text(), nullable=True),
        sa.Column("dob", sa.Date(), nullable=True),
        sa.Column("address_code", sa.String(length=64), nullable=True),
        sa.Column("polling_station_id", sa.String(length=64), nullable=True),
        sa.Column("roll_year", sa.SmallInteger(), nullable=False),
        sa.Column("elector_name_soundex", sa.String(length=8), nullable=True),
        sa.Column("father_name_soundex", sa.String(length=8), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    # Btree indexes for exact-match lookups
    op.create_index("ix_legacy_address_code", "legacy_electoral_roll", ["address_code"])
    op.create_index(
        "ix_legacy_polling_station", "legacy_electoral_roll", ["polling_station_id"]
    )
    # Soundex btree indexes for phonetic joins
    op.create_index(
        "ix_legacy_elector_soundex", "legacy_electoral_roll", ["elector_name_soundex"]
    )
    op.create_index(
        "ix_legacy_father_soundex", "legacy_electoral_roll", ["father_name_soundex"]
    )
    # GIN trigram indexes — requires pg_trgm extension (enabled in init.sql)
    op.create_index(
        "ix_legacy_elector_name_trgm",
        "legacy_electoral_roll",
        ["elector_name"],
        postgresql_using="gin",
        postgresql_ops={"elector_name": "gin_trgm_ops"},
    )
    op.create_index(
        "ix_legacy_father_name_trgm",
        "legacy_electoral_roll",
        ["father_or_husband_name"],
        postgresql_using="gin",
        postgresql_ops={"father_or_husband_name": "gin_trgm_ops"},
    )

    # ------------------------------------------------------------------ #
    # applicant
    # ------------------------------------------------------------------ #
    op.create_table(
        "applicant",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("full_name", sa.Text(), nullable=False),
        sa.Column("father_or_husband_name", sa.Text(), nullable=False),
        sa.Column("mother_name", sa.Text(), nullable=True),
        sa.Column("dob", sa.Date(), nullable=True),
        sa.Column("declared_address_code", sa.String(length=64), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Composite index for dedup query
    op.create_index(
        "ix_applicant_dedup",
        "applicant",
        ["full_name", "dob", "father_or_husband_name"],
    )

    # ------------------------------------------------------------------ #
    # lineage_match_result
    # ------------------------------------------------------------------ #
    op.create_table(
        "lineage_match_result",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("applicant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("legacy_record_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "confidence_score",
            sa.Numeric(precision=5, scale=2),
            nullable=False,
            server_default="0.00",
        ),
        sa.Column(
            "match_basis",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.ForeignKeyConstraint(
            ["applicant_id"],
            ["applicant.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["legacy_record_id"],
            ["legacy_electoral_roll.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_lmr_applicant_id", "lineage_match_result", ["applicant_id"]
    )
    op.create_index(
        "ix_lmr_legacy_record_id", "lineage_match_result", ["legacy_record_id"]
    )


def downgrade() -> None:
    op.drop_table("lineage_match_result")
    op.drop_table("applicant")
    op.drop_table("legacy_electoral_roll")
    op.drop_table("dob_rule_bracket")
