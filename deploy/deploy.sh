#!/bin/bash
# ============================================================
# TaskFlow Pro - One-Click Deploy Script
# Run from LOCAL machine to deploy to a DigitalOcean Droplet
#
# Usage:
#   ./deploy.sh central    # Deploy to central.wuk-on.com
#   ./deploy.sh alpha      # Deploy to alpha.wuk-on.com
#   ./deploy.sh bravo      # Deploy to bravo.wuk-on.com
#   ./deploy.sh charlie    # Deploy to charlie.wuk-on.com
#
# Prerequisites:
#   - Docker installed locally
#   - SSH key configured for root@<target>.wuk-on.com
# ============================================================
set -e

# --- Configuration ---
DOMAIN="wuk-on.com"
IMAGE_NAME="taskflow-pro"
IMAGE_TAG="latest"
IMAGE_FILE="taskflow-pro.tar.gz"
REMOTE_DIR="/opt/taskflow"
SSH_USER="root"

# --- Validate arguments ---
TARGET="$1"
if [ -z "$TARGET" ]; then
    echo "Usage: ./deploy.sh <instance>"
    echo ""
    echo "Instances:"
    echo "  central    Deploy to central.${DOMAIN}"
    echo "  alpha      Deploy to alpha.${DOMAIN}"
    echo "  bravo      Deploy to bravo.${DOMAIN}"
    echo "  charlie    Deploy to charlie.${DOMAIN}"
    exit 1
fi

REMOTE_HOST="${TARGET}.${DOMAIN}"
echo "============================================"
echo "  TaskFlow Pro - Deploying to ${REMOTE_HOST}"
echo "============================================"
echo ""

# --- Find project root (where Dockerfile lives) ---
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$PROJECT_ROOT"

if [ ! -f "Dockerfile" ]; then
    echo "ERROR: Dockerfile not found in ${PROJECT_ROOT}"
    exit 1
fi

# --- Step 1: Build Docker image ---
echo "[1/5] Building Docker image..."
docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .
echo "  Image built successfully."
echo ""

# --- Step 2: Save image as tar.gz ---
echo "[2/5] Saving image to ${IMAGE_FILE}..."
docker save ${IMAGE_NAME}:${IMAGE_TAG} | gzip > "${IMAGE_FILE}"
IMAGE_SIZE=$(du -h "${IMAGE_FILE}" | cut -f1)
echo "  Image saved (${IMAGE_SIZE})."
echo ""

# --- Step 3: Transfer to Droplet ---
echo "[3/5] Transferring to ${REMOTE_HOST}..."
scp "${IMAGE_FILE}" ${SSH_USER}@${REMOTE_HOST}:${REMOTE_DIR}/${IMAGE_FILE}
echo "  Transfer complete."
echo ""

# --- Step 4: Deploy on Droplet ---
echo "[4/5] Deploying on ${REMOTE_HOST}..."
ssh ${SSH_USER}@${REMOTE_HOST} << REMOTE_EOF
    set -e
    cd ${REMOTE_DIR}

    echo "  Loading Docker image..."
    docker load < ${IMAGE_FILE}

    echo "  Stopping old container..."
    docker compose down || true

    echo "  Starting new container..."
    docker compose up -d

    echo "  Cleaning up image file..."
    rm -f ${IMAGE_FILE}

    echo "  Pruning old images..."
    docker image prune -f
REMOTE_EOF
echo "  Deployed successfully."
echo ""

# --- Step 5: Health check ---
echo "[5/5] Verifying deployment..."
sleep 5

# Try health check (via Cloudflare HTTPS)
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://${REMOTE_HOST}/api/health" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo "  Health check PASSED (HTTP ${HTTP_CODE})"
else
    echo "  Health check returned HTTP ${HTTP_CODE}"
    echo "  Note: If DNS/Cloudflare is not yet configured, try directly:"
    echo "    curl http://<DROPLET_IP>/api/health"
    echo ""
    echo "  Checking container status on remote..."
    ssh ${SSH_USER}@${REMOTE_HOST} "cd ${REMOTE_DIR} && docker compose ps"
fi

# --- Cleanup local tar ---
rm -f "${IMAGE_FILE}"

echo ""
echo "============================================"
echo "  Deployment to ${REMOTE_HOST} complete!"
echo "  URL: https://${REMOTE_HOST}"
echo "============================================"
