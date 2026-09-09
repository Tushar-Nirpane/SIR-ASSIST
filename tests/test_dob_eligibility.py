"""
Tests for POST /api/v1/dob-eligibility/evaluate

Coverage:
  ✅ Happy paths: pre_1987, 1987_2004, post_2004 brackets
  ❌ Future date → 422 with field-level detail
  ❌ Malformed date string → 422
  ❌ Pre-1900 date → 422
  ❌ DOB on exact boundary dates (1987-01-01, 2004-12-31)
"""

import pytest
from httpx import AsyncClient

BASE = "/api/v1/dob-eligibility/evaluate"


@pytest.mark.asyncio
class TestDobEligibilityHappyPaths:

    async def test_pre_1987_bracket(self, client: AsyncClient):
        """DOB before 1987 should return pre_1987 bracket."""
        resp = await client.post(BASE, json={"dob": "1965-03-14"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["bracket"] == "pre_1987"
        assert isinstance(data["required_documents"], list)
        assert len(data["required_documents"]) > 0
        assert "description" in data

    async def test_1987_2004_bracket(self, client: AsyncClient):
        """DOB in 1987-2004 range should return 1987_2004 bracket."""
        resp = await client.post(BASE, json={"dob": "1995-08-15"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["bracket"] == "1987_2004"
        assert isinstance(data["required_documents"], list)

    async def test_post_2004_bracket(self, client: AsyncClient):
        """DOB after 2004 should return post_2004 bracket."""
        resp = await client.post(BASE, json={"dob": "2010-01-01"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["bracket"] == "post_2004"

    async def test_boundary_exactly_1987_01_01(self, client: AsyncClient):
        """1987-01-01 is the first date in 1987_2004 bracket."""
        resp = await client.post(BASE, json={"dob": "1987-01-01"})
        assert resp.status_code == 200
        assert resp.json()["bracket"] == "1987_2004"

    async def test_boundary_exactly_1986_12_31(self, client: AsyncClient):
        """1986-12-31 is the last date in pre_1987 bracket."""
        resp = await client.post(BASE, json={"dob": "1986-12-31"})
        assert resp.status_code == 200
        assert resp.json()["bracket"] == "pre_1987"

    async def test_boundary_exactly_2004_12_31(self, client: AsyncClient):
        """2004-12-31 is the last date in 1987_2004 bracket."""
        resp = await client.post(BASE, json={"dob": "2004-12-31"})
        assert resp.status_code == 200
        assert resp.json()["bracket"] == "1987_2004"

    async def test_boundary_exactly_2005_01_01(self, client: AsyncClient):
        """2005-01-01 is the first date in post_2004 bracket."""
        resp = await client.post(BASE, json={"dob": "2005-01-01"})
        assert resp.status_code == 200
        assert resp.json()["bracket"] == "post_2004"

    async def test_response_contains_all_required_fields(self, client: AsyncClient):
        """Response schema must include bracket, description, required_documents, notes."""
        resp = await client.post(BASE, json={"dob": "1980-05-20"})
        assert resp.status_code == 200
        data = resp.json()
        assert "bracket" in data
        assert "description" in data
        assert "required_documents" in data
        assert "notes" in data


@pytest.mark.asyncio
class TestDobEligibilityFailurePaths:

    async def test_future_date_returns_422(self, client: AsyncClient):
        """Future date must return 422 with field-level error."""
        resp = await client.post(BASE, json={"dob": "2099-01-01"})
        assert resp.status_code == 422
        data = resp.json()
        assert data["error"] == "VALIDATION_ERROR"
        # Must have detail list with field info
        assert isinstance(data["detail"], list)
        assert any("dob" in str(e.get("field", "")) for e in data["detail"])

    async def test_malformed_date_returns_422(self, client: AsyncClient):
        """Invalid date format must return 422 — not 500."""
        resp = await client.post(BASE, json={"dob": "2026-13-40"})
        assert resp.status_code == 422
        assert resp.json()["error"] == "VALIDATION_ERROR"

    async def test_completely_invalid_date_string(self, client: AsyncClient):
        """Garbage string must return 422."""
        resp = await client.post(BASE, json={"dob": "not-a-date"})
        assert resp.status_code == 422

    async def test_pre_1900_date_returns_422(self, client: AsyncClient):
        """DOB before 1900 must be rejected as out-of-range."""
        resp = await client.post(BASE, json={"dob": "1899-12-31"})
        assert resp.status_code == 422
        assert resp.json()["error"] == "VALIDATION_ERROR"

    async def test_missing_dob_field_returns_422(self, client: AsyncClient):
        """Missing dob field must return 422."""
        resp = await client.post(BASE, json={})
        assert resp.status_code == 422

    async def test_null_dob_returns_422(self, client: AsyncClient):
        """Null dob must return 422 (field is required)."""
        resp = await client.post(BASE, json={"dob": None})
        assert resp.status_code == 422

    async def test_error_response_never_contains_stack_trace(self, client: AsyncClient):
        """422 response must NOT contain a raw stack trace."""
        resp = await client.post(BASE, json={"dob": "invalid"})
        body = resp.text
        assert "Traceback" not in body
        assert "sqlalchemy" not in body.lower()

    async def test_today_minus_one_day_is_valid(self, client: AsyncClient):
        """Yesterday's date must be accepted (not treated as future)."""
        from datetime import date, timedelta
        yesterday = (date.today() - timedelta(days=1)).isoformat()
        resp = await client.post(BASE, json={"dob": yesterday})
        assert resp.status_code == 200
