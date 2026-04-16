#!/bin/sh
set -e

echo "=== TaskFlow Pro Starting ==="
echo "INSTANCE_MODE: ${INSTANCE_MODE:-subsidiary}"
echo "NODE_ENV: ${NODE_ENV:-production}"

# Start nginx in background
echo "Starting nginx..."
nginx

# Start backend (HTTP only, no HTTPS - Cloudflare handles SSL)
echo "Starting backend on port 3001..."
cd /app/backend
exec node dist/index.js start --port 3001 --no-https --data /app/backend/data
