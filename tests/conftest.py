"""
pytest conftest.py — shared fixtures for the entire test suite.

Test DB strategy: testcontainers (Postgres 15 with fuzzystrmatch + pg_trgm).
Each test session gets a fresh container. Tables are created via Alembic.
DOB brackets are seeded inline (not via migration) for test isolation.

The AsyncClient fixture creates a test client against the live FastAPI app
wired to the test DB.
"""

import asyncio
import json
import os
import pytest
import pytest_asyncio

from httpx import AsyncClient, ASGITransport
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession


# ---------------------------------------------------------------------------
# Test database URL — prefer env var override, else use testcontainers
# ---------------------------------------------------------------------------
TEST_DB_URL = os.environ.get("TEST_DATABASE_URL")


@pytest.fixture(scope="session")
def event_loop_policy():
    return asyncio.DefaultEventLoopPolicy()


# ---------------------------------------------------------------------------
# Database container / URL
# ---------------------------------------------------------------------------
@pytest.fixture(scope="session")
def test_db_url():
    """
    Provides the async database URL for tests.

    If TEST_DATABASE_URL env var is set (e.g., in CI with a real Postgres),
    uses that directly. Otherwise, spins up a testcontainers Postgres 15
    container with fuzzystrmatch + pg_trgm pre-enabled.
    """
    if TEST_DB_URL:
        yield TEST_DB_URL
        return

    try:
        from testcontainers.postgres import PostgresContainer
    except ImportError:
        pytest.skip(
            "testcontainers not installed. Set TEST_DATABASE_URL env var to run tests."
        )

    with PostgresContainer("postgres:15-alpine") as pg:
        # Enable required extensions
        sync_url = pg.get_connection_url()
        import sqlalchemy as sa
        engine = sa.create_engine(sync_url)
        with engine.connect() as conn:
            conn.execute(sa.text("CREATE EXTENSION IF NOT EXISTS fuzzystrmatch"))
            conn.execute(sa.text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
            conn.commit()
        engine.dispose()

        # Convert to asyncpg URL
        async_url = sync_url.replace(
            "postgresql+psycopg2://", "postgresql+asyncpg://"
        ).replace("postgresql://", "postgresql+asyncpg://")
        yield async_url


@pytest_asyncio.fixture(scope="session")
async def db_engine(test_db_url):
    """Creates the async engine and runs Alembic migrations."""
    # Set env var so app.config picks up the test DB
    os.environ["DATABASE_URL"] = test_db_url
    os.environ.setdefault("CORS_ORIGIN", "http://localhost:3000")

    engine = create_async_engine(test_db_url, echo=False)

    # Run migrations synchronously using subprocess to avoid alembic async issues
    import subprocess
    import sys
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=backend_dir,
        capture_output=True,
        text=True,
        env={**os.environ, "DATABASE_URL": test_db_url},
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"Alembic migration failed:\nSTDOUT: {result.stdout}\nSTDERR: {result.stderr}"
        )

    yield engine
    await engine.dispose()


@pytest_asyncio.fixture(scope="session")
async def db_session(db_engine):
    """Provides a session-scoped AsyncSession for seeding test data."""
    factory = async_sessionmaker(db_engine, expire_on_commit=False)
    async with factory() as session:
        yield session


@pytest_asyncio.fixture(scope="session", autouse=True)
async def seed_test_data(db_session: AsyncSession):
    """
    Seeds test data needed across the entire test session.

    Inserts a known legacy record for acceptance test #3
    (Shreekant/Shrikant fuzzy match must return confidence > 70%).
    """
    import uuid
    import jellyfish

    # Insert known test fixture for fuzzy match testing
    known_record_id = str(uuid.uuid4())
    await db_session.execute(
        text(
            """
            INSERT INTO legacy_electoral_roll (
                id, elector_name, father_or_husband_name, mother_name,
                dob, address_code, polling_station_id, roll_year,
                elector_name_soundex, father_name_soundex
            ) VALUES (
                :id::uuid, :elector_name, :father_or_husband_name, :mother_name,
                :dob::date, :address_code, :polling_station_id, :roll_year,
                :elector_name_soundex, :father_name_soundex
            )
            ON CONFLICT DO NOTHING
            """
        ),
        {
            "id": known_record_id,
            "elector_name": "Shrikant Ramrao Deshmukh",
            "father_or_husband_name": "Ramrao Deshmukh",
            "mother_name": "Savita Deshmukh",
            "dob": "1975-06-15",
            "address_code": "MH-05-0001",
            "polling_station_id": "PS-0042",
            "roll_year": 2003,
            "elector_name_soundex": jellyfish.soundex("SHRIKANT RAMRAO DESHMUKH"),
            "father_name_soundex": jellyfish.soundex("RAMRAO DESHMUKH"),
        },
    )
    await db_session.commit()


@pytest_asyncio.fixture(scope="session")
async def client(db_engine):
    """
    AsyncClient wired to the FastAPI app with the test DB injected.
    Session-scoped for performance — the DB is not reset between tests
    (use unique data in each test to avoid coupling).
    """
    from app.main import app
    from app import database as db_module

    # Patch the engine in the database module to use the test engine
    original_engine = db_module.engine
    original_factory = db_module.AsyncSessionLocal

    db_module.engine = db_engine
    db_module.AsyncSessionLocal = async_sessionmaker(
        db_engine, expire_on_commit=False, autoflush=False, autocommit=False
    )

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver"
    ) as ac:
        yield ac

    # Restore originals
    db_module.engine = original_engine
    db_module.AsyncSessionLocal = original_factory
