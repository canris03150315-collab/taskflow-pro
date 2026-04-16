# ============================================================
# TaskFlow Pro - Multi-stage Docker Build
# Single image: nginx (frontend) + Node.js (backend)
# ============================================================

# ----- Stage 1: Build frontend -----
FROM node:20-alpine AS frontend-build

# Build arg for instance mode (central or subsidiary)
ARG VITE_INSTANCE_MODE=subsidiary
ENV VITE_INSTANCE_MODE=$VITE_INSTANCE_MODE

WORKDIR /build

# Install frontend dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy frontend source and build
COPY index.html index.tsx index.css vite.config.ts tsconfig*.json App.tsx types.ts ./
COPY components/ ./components/
COPY services/ ./services/
COPY utils/ ./utils/
RUN npm run build

# ----- Stage 2: Production -----
FROM node:20-alpine

# Install build tools for native modules (better-sqlite3, canvas) + nginx
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    nginx \
    pkgconfig \
    pixman-dev \
    cairo-dev \
    pango-dev \
    libjpeg-turbo-dev \
    giflib-dev \
    librsvg-dev \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Install backend dependencies
COPY backend/package.json backend/package-lock.json* ./backend/
RUN cd backend && npm ci --omit=dev && cd .. \
    && apk del python3 make g++

# Copy pre-compiled backend JavaScript (NO TypeScript compilation needed)
COPY backend/dist/ ./backend/dist/
COPY backend/services/ ./backend/services/

# Copy frontend build output from stage 1
COPY --from=frontend-build /build/dist/ ./frontend/dist/

# Create data directories
RUN mkdir -p /app/backend/data /app/backend/data/uploads /app/backend/data/backups /app/backend/data/logs

# Copy nginx config and entrypoint
COPY deploy/nginx.conf /etc/nginx/http.d/default.conf
COPY deploy/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 80 443

CMD ["/app/entrypoint.sh"]
