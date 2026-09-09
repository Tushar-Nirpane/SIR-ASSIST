FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy application code first so package discovery and dependencies build properly
COPY . .

# Install Python dependencies and the project
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir psycopg2-binary==2.9.9 && \
    pip install --no-cache-dir .

# Run Alembic migrations and then start the server
CMD ["sh", "-c", "alembic upgrade head && python scripts/seed_legacy_roll.py && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"]
