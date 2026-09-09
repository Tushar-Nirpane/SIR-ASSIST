"""
Async SQLAlchemy database engine and session management.

Every DB session is scoped per-request via a FastAPI dependency (get_db).
The dependency guarantees:
  - Rollback on any exception before the response is sent.
  - Session close on exit (success or failure) — no leaked connections.
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

# Create the async engine once at module load.
# pool_pre_ping=True: validates connections before checkout (avoids stale connections).
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=(settings.APP_ENV == "development"),
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that provides a per-request AsyncSession.

    Usage:
        @router.post("/...")
        async def handler(session: AsyncSession = Depends(get_db)):
            ...

    Guarantees:
        - Rollback if an exception propagates out of the route handler.
        - Session always closed in the finally block.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
