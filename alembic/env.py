"""
Alembic environment configuration.

Reads DATABASE_URL from the environment (via pydantic-settings).
Uses a synchronous psycopg2 URL for Alembic (Alembic does not support asyncpg directly).
"""

import os
import re
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

# Ensure app models are importable
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
from app.database import Base

# Import all models so Alembic sees them for autogenerate
import app.models  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def get_sync_url() -> str:
    """
    Convert asyncpg URL to psycopg2 URL for Alembic.
    postgresql+asyncpg://... → postgresql+psycopg2://...
    """
    url = settings.DATABASE_URL
    return re.sub(r"^postgresql\+asyncpg://", "postgresql+psycopg2://", url)


def run_migrations_offline() -> None:
    url = get_sync_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    sync_url = get_sync_url()
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = sync_url

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
