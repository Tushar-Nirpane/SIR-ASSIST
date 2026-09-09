"""
Pydantic v2 schemas for the DOB Eligibility endpoint.

Validation rules enforced in schema (not in route handlers):
  - DOB must be a valid date string in YYYY-MM-DD format.
  - DOB must not be in the future.
  - DOB must not be before 1900-01-01 (catches obviously garbage inputs).
"""

from datetime import date
from typing import Any

from pydantic import BaseModel, Field, field_validator


class DobEligibilityRequest(BaseModel):
    dob: date = Field(
        ...,
        description="Date of birth in YYYY-MM-DD format",
        examples=["1985-06-15"],
    )

    @field_validator("dob")
    @classmethod
    def dob_must_be_valid_range(cls, v: date) -> date:
        today = date.today()
        if v > today:
            raise ValueError(
                f"Date of birth cannot be in the future. Got: {v}, today is: {today}"
            )
        if v < date(1900, 1, 1):
            raise ValueError(
                f"Date of birth before 1900-01-01 is not valid. Got: {v}"
            )
        return v


class DobEligibilityResponse(BaseModel):
    bracket: str = Field(..., description="Bracket key, e.g. 'pre_1987'")
    description: str = Field(..., description="Human-readable bracket description")
    required_documents: list[str] = Field(
        ..., description="List of required document names"
    )
    notes: str = Field(
        default="",
        description="Additional notes (e.g. upcoming rule changes)",
    )


class NoBracketFoundError(BaseModel):
    error: str = "NO_BRACKET_FOUND"
    detail: str = (
        "The provided date of birth does not fall within any configured bracket. "
        "This may indicate a configuration gap — please contact an administrator."
    )
