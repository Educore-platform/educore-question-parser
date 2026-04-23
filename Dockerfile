# ── Stage 1: Builder ───────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS builder

# Native build deps for canvas (Cairo, Pango, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    python3 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build


# ── Stage 2: Runtime ───────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runtime

# Runtime libs only (no compilers)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy production node_modules and built output from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Non-root user — writable dirs for multer + extraction media (defaults: ./uploads, ./media)
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser \
  && mkdir -p /app/uploads /app/media \
  && chown -R appuser:appgroup /app/uploads /app/media
USER appuser

EXPOSE 3000

CMD ["node", "dist/main.js"]
