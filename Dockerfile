FROM python:3.11-slim

WORKDIR /app

# System dependencies: gcc for building wheels, libpq-dev for psycopg2/libpq.
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy application code first so package discovery and dependencies build properly
COPY . .

# Install Python dependencies and the project.
# psycopg2-binary is installed explicitly because Alembic needs a *sync* driver
# (asyncpg is async-only) to run migrations.
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir psycopg2-binary==2.9.9 && \
    pip install --no-cache-dir .

# Make the entrypoint executable regardless of the source file mode.
RUN chmod +x docker-entrypoint.sh

# Railway injects $PORT at runtime; default to 8000 for plain `docker run`.
ENV PORT=8000
EXPOSE 8000

# Migrate → seed → serve (production: no --reload).
CMD ["sh", "docker-entrypoint.sh"]
