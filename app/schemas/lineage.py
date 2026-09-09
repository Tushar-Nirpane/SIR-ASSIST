"""
Pydantic v2 schemas for the Lineage Search endpoints.

Validation rules enforced in schema:
  - full_name and father_or_husband_name are required, stripped, 2-100 chars.
  - mother_name, dob, declared_address_code are optional.
  - dob must not be future, not before 1900 (same validator as DOB eligibility).
  - top_n capped at 25.
  - All name fields are stripped of leading/trailing whitespace before
    hitting the DB or the fuzzy-match query.
"""

import uuid
from datetime import date
from typing import Any

from pydantic import BaseModel, Field, field_validator, model_validator


def _normalize_name(v: str) -> str:
    """Strip whitespace and collapse internal runs of spaces."""
    if isinstance(v, str):
        return " ".join(v.split())
    return v


class LineageSearchRequest(BaseModel):
    full_name: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="Applicant's full name (required)",
        examples=["Shreekant Ramrao Deshmukh"],
    )
    father_or_husband_name: str = Field(
        default="",
        max_length=100,
        description="Father's or husband's name (optional)",
        examples=["Ramrao Deshmukh"],
    )
    mother_name: str | None = Field(
        default=None,
        min_length=0,
        max_length=100,
        description="Mother's name (optional)",
    )
    dob: date | None = Field(
        default=None,
        description="Applicant's date of birth YYYY-MM-DD (optional)",
    )
    declared_address_code: str | None = Field(
        default=None,
        max_length=64,
        description="Structural address / part-booth code (optional)",
    )
    top_n: int = Field(
        default=5,
        ge=1,
        le=25,
        description="Number of top candidates to return (1-25, default 5)",
    )

    # --- Validators ---

    @field_validator("full_name", "father_or_husband_name", mode="before")
    @classmethod
    def normalize_required_names(cls, v: str) -> str:
        return _normalize_name(v)

    @field_validator("mother_name", mode="before")
    @classmethod
    def normalize_optional_name(cls, v: str | None) -> str | None:
        if v is None:
            return None
        normalized = _normalize_name(v)
        return normalized if normalized else None

    @field_validator("dob")
    @classmethod
    def dob_must_be_valid_range(cls, v: date | None) -> date | None:
        if v is None:
            return None
        today = date.today()
        if v > today:
            raise ValueError(
                f"Date of birth cannot be in the future. Got: {v}"
            )
        if v < date(1900, 1, 1):
            raise ValueError(
                f"Date of birth before 1900-01-01 is not valid. Got: {v}"
            )
        return v


class MatchBasis(BaseModel):
    """Breakdown of score components for a single candidate match."""
    name_similarity: float = Field(..., description="pg_trgm similarity score 0.0-1.0")
    father_name_soundex_match: bool = Field(
        ..., description="Whether father/husband name Soundex codes matched"
    )
    address_code_match: bool = Field(
        ..., description="Whether declared address codes matched exactly"
    )
    dob_proximity_score: float = Field(
        ..., description="DOB proximity score 0.0-1.0 (1.0 = exact match, 0.5 = same year)"
    )


class LineageMatchCandidate(BaseModel):
    """A single candidate match from the legacy electoral roll."""
    legacy_record_id: uuid.UUID
    elector_name: str
    father_or_husband_name: str
    polling_station_id: str | None
    confidence_score: float = Field(..., ge=0, le=100)
    match_basis: MatchBasis


class LineageSearchResponse(BaseModel):
    applicant_id: uuid.UUID
    matches: list[LineageMatchCandidate]
    match_count: int


class LineageMatchResultResponse(BaseModel):
    """Response for GET /lineage/match/{id}"""
    id: uuid.UUID
    applicant_id: uuid.UUID
    legacy_record_id: uuid.UUID | None
    confidence_score: float
    match_basis: dict[str, Any]
    created_at: str  # ISO 8601 string


class HealthResponse(BaseModel):
    status: str
    database: str
    timestamp: str
