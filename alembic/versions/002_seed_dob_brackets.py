"""Seed statutory DOB rule brackets

Revision ID: 002
Revises: 001
Create Date: 2026-08-20

Seeds the three statutory SIR DOB brackets into dob_rule_bracket.
The DB row is the source of truth — a future admin panel can modify
required_documents without a code redeploy.

Brackets:
  pre_1987   : DOB before 1987-01-01 (no lower bound)
  1987_2004  : DOB from 1987-01-01 to 2004-12-31 inclusive
  post_2004  : DOB after 2004-12-31 (no upper bound)
"""

import json
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

BRACKETS = [
    {
        "bracket_key": "pre_1987",
        "min_dob": None,
        "max_dob": "1986-12-31",
        "required_documents": json.dumps([
            "Aadhaar Card",
            "Voter ID (2003 or earlier roll)",
            "Birth Certificate OR School Leaving Certificate",
        ]),
        "description": (
            "Applicant born before 1 January 1987. "
            "Must produce Aadhaar plus a pre-existing voter credential or birth proof."
        ),
    },
    {
        "bracket_key": "1987_2004",
        "min_dob": "1987-01-01",
        "max_dob": "2004-12-31",
        "required_documents": json.dumps([
            "Aadhaar Card",
            "Birth Certificate",
            "Parent's Voter ID or equivalent SIR enrollment proof",
        ]),
        "description": (
            "Applicant born between 1 January 1987 and 31 December 2004 (inclusive). "
            "Birth Certificate is mandatory; Aadhaar required for identity. "
            "Parent linkage must be established."
        ),
    },
    {
        "bracket_key": "post_2004",
        "min_dob": "2005-01-01",
        "max_dob": None,
        "required_documents": json.dumps([
            "Birth Certificate (mandatory — no substitutes accepted)",
            "Aadhaar Card",
            "Enrollment form signed by parent or legal guardian",
        ]),
        "description": (
            "Applicant born after 31 December 2004. "
            "Birth Certificate is mandatory with no substitute. "
            "Parent/guardian signature on enrollment form is required."
        ),
    },
]


def upgrade() -> None:
    from datetime import date
    dob_table = sa.table(
        "dob_rule_bracket",
        sa.column("bracket_key", sa.String),
        sa.column("min_dob", sa.Date),
        sa.column("max_dob", sa.Date),
        sa.column("required_documents", sa.dialects.postgresql.JSONB),
        sa.column("description", sa.Text),
    )
    rows = []
    for bracket in BRACKETS:
        data = dict(bracket)
        data["required_documents"] = json.loads(data["required_documents"])
        if data["min_dob"]:
            parts = [int(p) for p in data["min_dob"].split("-")]
            data["min_dob"] = date(parts[0], parts[1], parts[2])
        if data["max_dob"]:
            parts = [int(p) for p in data["max_dob"].split("-")]
            data["max_dob"] = date(parts[0], parts[1], parts[2])
        rows.append(data)
            
    op.bulk_insert(dob_table, rows)


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text(
            "DELETE FROM dob_rule_bracket WHERE bracket_key IN "
            "('pre_1987', '1987_2004', 'post_2004')"
        )
    )
