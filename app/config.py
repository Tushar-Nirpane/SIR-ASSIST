"""
Application configuration via pydantic-settings.

All configuration is read from environment variables.
The application will FAIL FAST on startup if required variables are missing —
there are no hardcoded fallback credentials.
"""

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # --- Required ---
    DATABASE_URL: str  # e.g. postgresql+asyncpg://user:pass@host:5432/dbname

    # --- Required: CORS (must be explicitly set, no wildcard default) ---
    CORS_ORIGIN: str  # e.g. http://localhost:3000

    # --- Optional with safe defaults ---
    APP_ENV: str = "development"
    DB_QUERY_TIMEOUT_SECONDS: int = 10  # DB-level statement timeout for fuzzy queries
    MAX_REQUEST_BODY_BYTES: int = 1_048_576  # 1 MB cap on request bodies
    DUPLICATE_WINDOW_MINUTES: int = 60  # window for applicant dedup check

    @field_validator("DATABASE_URL")
    @classmethod
    def database_url_must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("DATABASE_URL must be set and non-empty")
        return v.strip()

    @field_validator("CORS_ORIGIN")
    @classmethod
    def cors_origin_must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("CORS_ORIGIN must be set and non-empty")
        return v.strip()


# Instantiate once at module load; if required vars are missing this raises
# immediately and prevents the app from starting.
settings = Settings()
