#!/usr/bin/env sh
# ---------------------------------------------------------------------------
# Container entrypoint for the SIR-Assist API (Railway / Docker).
#
# Responsibilities:
#   1. Wait for Postgres to accept connections, then apply Alembic migrations.
#   2. Seed the synthetic legacy electoral roll (idempotent — safe on redeploys).
#   3. Start uvicorn bound to 0.0.0.0 on $PORT (Railway injects PORT).
# ---------------------------------------------------------------------------
set -e

MAX_ATTEMPTS=30
SLEEP_SECONDS=3

echo "▶ Applying database migrations (up to ${MAX_ATTEMPTS} attempts)..."
attempt=1
until alembic upgrade head; do
  if [ "$attempt" -ge "$MAX_ATTEMPTS" ]; then
    echo "✖ Database still unreachable after ${attempt} attempts. Aborting." >&2
    exit 1
  fi
  echo "  → attempt ${attempt} failed; retrying in ${SLEEP_SECONDS}s..."
  attempt=$((attempt + 1))
  sleep "$SLEEP_SECONDS"
done

echo "▶ Seeding legacy electoral roll (idempotent)..."
python scripts/seed_legacy_roll.py

echo "▶ Starting API on 0.0.0.0:${PORT:-8000}"
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
