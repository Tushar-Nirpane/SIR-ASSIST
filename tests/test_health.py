"""
Tests for GET /api/v1/health

Coverage:
  ✅ DB up → 200 {"status": "ok", "database": "ok"}
  ✅ DB down → 503 {"status": "degraded", "database": "unreachable"}
  ✅ Response includes timestamp
  ✅ Health endpoint never returns hardcoded 200 when DB is unavailable
"""

import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient
from sqlalchemy.exc import OperationalError

HEALTH_URL = "/api/v1/health"


@pytest.mark.asyncio
class TestHealthEndpoint:

    async def test_health_returns_200_when_db_ok(self, client: AsyncClient):
        """When DB is reachable, health returns 200 with status: ok."""
        resp = await client.get(HEALTH_URL)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["database"] == "ok"
        assert "timestamp" in data

    async def test_health_returns_503_when_db_down(self, client: AsyncClient):
        """
        Acceptance test #6: Killing the DB and hitting /health must return 503.

        We simulate DB failure by patching AsyncSessionLocal to raise
        OperationalError (what asyncpg raises when the connection fails).
        """
        # Patch the execute call inside the health check
        mock_session = AsyncMock()
        mock_session.execute.side_effect = OperationalError(
            "connection refused", None, None
        )
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)

        with patch("app.api.v1.health.AsyncSessionLocal") as mock_factory:
            mock_factory.return_value = mock_session
            resp = await client.get(HEALTH_URL)

        assert resp.status_code == 503
        data = resp.json()
        assert data["status"] == "degraded"
        assert data["database"] == "unreachable"

    async def test_health_response_includes_timestamp(self, client: AsyncClient):
        """Health response must include an ISO 8601 timestamp."""
        resp = await client.get(HEALTH_URL)
        data = resp.json()
        assert "timestamp" in data
        # Verify it's parseable as an ISO datetime
        from datetime import datetime
        dt = datetime.fromisoformat(data["timestamp"])
        assert dt is not None

    async def test_health_never_returns_200_with_db_error(self, client: AsyncClient):
        """
        Critical: health must NOT return 200 when DB fails.
        This test specifically verifies the status code is NOT 200 when patched.
        """
        mock_session = AsyncMock()
        mock_session.execute.side_effect = Exception("DB completely gone")
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)

        with patch("app.api.v1.health.AsyncSessionLocal") as mock_factory:
            mock_factory.return_value = mock_session
            resp = await client.get(HEALTH_URL)

        # Must NOT be 200
        assert resp.status_code != 200
        assert resp.status_code == 503

    async def test_health_response_structure(self, client: AsyncClient):
        """Health response must be a JSON object with required keys."""
        resp = await client.get(HEALTH_URL)
        data = resp.json()
        required_keys = {"status", "database", "timestamp"}
        assert required_keys.issubset(set(data.keys()))
