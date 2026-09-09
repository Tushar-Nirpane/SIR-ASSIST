# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy manifests first for better layer caching
COPY package.json package-lock.json ./

# Install all deps (including devDependencies needed for build)
RUN npm ci

# Copy all source files
COPY . .

# BACKEND_URL is the internal Docker network address of the FastAPI service.
# Next.js bakes this into rewrites() at build time.
ARG BACKEND_URL=http://api:8000
ENV BACKEND_URL=${BACKEND_URL}

# Build Next.js in standalone mode (set in next.config.mjs)
RUN npm run build

# ── Stage 2: Runner ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Standalone output includes only what's needed to run
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
RUN mkdir -p /app/public
COPY --from=builder /app/public ./public

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
