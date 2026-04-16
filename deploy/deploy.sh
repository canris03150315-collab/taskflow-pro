#!/bin/bash
# ============================================================
# TaskFlow Pro — One-shot Deploy Script
#
# Usage:
#   bash deploy/deploy.sh alpha           # one server
#   bash deploy/deploy.sh bravo charlie   # multiple
#   bash deploy/deploy.sh all             # all 4
#   bash deploy/deploy.sh rollback alpha  # roll back to previous image
#
# What it does:
#   1. Check git status (warns on uncommitted changes)
#   2. Sync source code via rsync
#   3. Build Docker image on each target (in parallel)
#   4. Tag old image as :rollback before swapping
#   5. Stop/remove old container, start new one
#   6. Wait for health check
#   7. Run automated test suite
#
# Requires:
#   - SSH access to all targets (key-based, no password)
#   - rsync installed locally
# ============================================================

set -e

# --- Server registry (single source of truth) ---
declare -A SERVER_IP=(
  [alpha]="139.59.126.243"
  [bravo]="139.59.119.156"
  [charlie]="178.128.27.97"
  [central]="178.128.90.19"
)

declare -A SERVER_TOKEN=(
  [alpha]="alpha-svc-token-2026-wukon"
  [bravo]="bravo-svc-token-2026-wukon"
  [charlie]="charlie-svc-token-2026-wukon"
  [central]="central-svc-token-2026-wukon"
)

declare -A SERVER_JWT=(
  [alpha]="alpha-jwt-secret-2026-wukon"
  [bravo]="bravo-jwt-secret-2026-wukon"
  [charlie]="charlie-jwt-secret-2026-wukon"
  [central]="central-jwt-secret-2026-wukon"
)

declare -A SERVER_MODE=(
  [alpha]="subsidiary"
  [bravo]="subsidiary"
  [charlie]="subsidiary"
  [central]="central"
)

GEMINI_KEY="AIzaSyAoQOSfQsvt6R7W0iHXpkBPxf5SWf6qwY8"
SOURCE_DIR="/c/Users/canri/Projects/Migrated_From_USB/公司內部"
TEST_SCRIPT="/c/tmp/e2e-taskflow/run-all-tests.sh"

# --- Color output ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $*"; }
ok()  { echo -e "${GREEN}OK${NC} $*"; }
warn(){ echo -e "${YELLOW}!${NC} $*"; }
err() { echo -e "${RED}X${NC} $*"; }

# ============================================================
# Parse arguments
# ============================================================
SKIP_PROMPTS=false
ARGS=()
for arg in "$@"; do
  case "$arg" in
    -y|--yes) SKIP_PROMPTS=true ;;
    *)        ARGS+=("$arg") ;;
  esac
done
set -- "${ARGS[@]}"

if [ $# -eq 0 ]; then
  echo "Usage: $0 [-y|--yes] <target>... | all | rollback <host>"
  echo ""
  echo "Targets: ${!SERVER_IP[@]}"
  echo "Flags:"
  echo "  -y, --yes   Skip confirmation prompts"
  exit 1
fi

# Rollback mode
if [ "$1" = "rollback" ]; then
  if [ -z "$2" ]; then
    err "Usage: $0 rollback <host>"
    exit 1
  fi
  HOST="$2"
  IP=${SERVER_IP[$HOST]}
  if [ -z "$IP" ]; then err "Unknown host: $HOST"; exit 1; fi
  log "Rolling back $HOST..."
  TAG="taskflow-pro:latest"
  [ "${SERVER_MODE[$HOST]}" = "central" ] && TAG="taskflow-pro:central"
  ssh root@$IP "
    docker tag taskflow-pro:rollback $TAG 2>/dev/null
    docker stop taskflow 2>/dev/null
    docker rm taskflow 2>/dev/null
    docker run -d --name taskflow -p 80:80 -p 443:443 \
      -e NODE_ENV=production \
      -e INSTANCE_MODE=${SERVER_MODE[$HOST]} \
      -e SERVICE_TOKEN=${SERVER_TOKEN[$HOST]} \
      -e JWT_SECRET=${SERVER_JWT[$HOST]} \
      -e GEMINI_API_KEY=$GEMINI_KEY \
      -v taskflow_data:/app/backend/data \
      -v /opt/ssl:/opt/ssl:ro \
      --restart unless-stopped \
      $TAG
  "
  ok "Rolled back $HOST"
  exit 0
fi

# Build target list
TARGETS=()
if [ "$1" = "all" ]; then
  TARGETS=(alpha bravo charlie central)
else
  for arg in "$@"; do
    if [ -z "${SERVER_IP[$arg]}" ]; then
      err "Unknown target: $arg (valid: ${!SERVER_IP[@]} | all)"
      exit 1
    fi
    TARGETS+=("$arg")
  done
fi

# ============================================================
# Pre-flight checks
# ============================================================
cd "$SOURCE_DIR"

echo ""
echo "============================================"
echo "  TaskFlow Pro - Deploy"
echo "============================================"
echo ""
log "Targets: ${TARGETS[*]}"

# Check git status
UNCOMMITTED=$(git status -s | wc -l)
if [ "$UNCOMMITTED" -gt 0 ]; then
  warn "You have $UNCOMMITTED uncommitted changes:"
  git status -s | head -10
  echo ""
  if ! $SKIP_PROMPTS; then
    read -p "Deploy anyway? (y/N) " -n 1 -r
    echo
    [[ ! $REPLY =~ ^[Yy]$ ]] && exit 1
  fi
fi

CURRENT_COMMIT=$(git log -1 --format='%h %s')
log "Deploying commit: $CURRENT_COMMIT"
echo ""

if ! $SKIP_PROMPTS; then
  read -p "Continue? (y/N) " -n 1 -r
  echo
  [[ ! $REPLY =~ ^[Yy]$ ]] && { log "Cancelled."; exit 0; }
fi

START_TIME=$(date +%s)

# ============================================================
# Deploy to each target (parallel)
# ============================================================

deploy_one() {
  local HOST=$1
  local IP=${SERVER_IP[$HOST]}
  local MODE=${SERVER_MODE[$HOST]}
  local TOKEN=${SERVER_TOKEN[$HOST]}
  local JWT=${SERVER_JWT[$HOST]}
  local TAG="taskflow-pro:latest"
  [ "$MODE" = "central" ] && TAG="taskflow-pro:central"

  local STAGE_LOG="/tmp/deploy-${HOST}.log"

  {
    echo "=== $HOST ($IP, $MODE) ==="

    # 1. Sync source via tar+ssh (no rsync needed)
    echo "[1/4] Syncing source..."
    tar czf - -C "$SOURCE_DIR" \
      --exclude='node_modules' \
      --exclude='.git' \
      --exclude='backend/node_modules' \
      --exclude='backend/data' \
      --exclude='backend/data-central' \
      --exclude='.env' \
      --exclude='.env.production' \
      --exclude='.env.local' \
      --exclude='*.db' \
      --exclude='*.db-shm' \
      --exclude='*.db-wal' \
      --exclude='archive-backups' \
      --exclude='archive-scripts' \
      --exclude='backups' \
      --exclude='test-results' \
      --exclude='report' \
      --exclude='playwright-report' \
      . | ssh root@$IP "mkdir -p /opt/taskflow && cd /opt/taskflow && tar xzf -"

    # 2. Build new image (tag as :new for atomic swap)
    echo "[2/4] Building image (mode=$MODE)..."
    ssh root@$IP "cd /opt/taskflow && docker build --build-arg VITE_INSTANCE_MODE=$MODE -t taskflow-pro:new ." > /dev/null 2>&1

    # 3. Tag swap: latest -> rollback, new -> latest|central
    echo "[3/4] Swapping image (preserving rollback tag)..."
    ssh root@$IP "
      docker tag $TAG taskflow-pro:rollback 2>/dev/null
      docker tag taskflow-pro:new $TAG
      docker rmi taskflow-pro:new 2>/dev/null
    "

    # 4. Stop old container, start new
    echo "[4/4] Restarting container..."
    ssh root@$IP "
      docker stop taskflow 2>/dev/null
      docker rm taskflow 2>/dev/null
      docker run -d --name taskflow -p 80:80 -p 443:443 \
        -e NODE_ENV=production \
        -e INSTANCE_MODE=$MODE \
        -e SERVICE_TOKEN=$TOKEN \
        -e JWT_SECRET=$JWT \
        -e GEMINI_API_KEY=$GEMINI_KEY \
        -v taskflow_data:/app/backend/data \
        -v /opt/ssl:/opt/ssl:ro \
        --restart unless-stopped \
        $TAG
    " > /dev/null

    echo "Done: $HOST"
  } > "$STAGE_LOG" 2>&1
}

log "Deploying to ${#TARGETS[@]} server(s) in parallel..."
echo ""

PIDS=()
for HOST in "${TARGETS[@]}"; do
  deploy_one "$HOST" &
  PIDS+=($!)
done

# Wait for all
FAILED=()
for i in "${!PIDS[@]}"; do
  HOST="${TARGETS[$i]}"
  if wait "${PIDS[$i]}"; then
    ok "$HOST deployed"
  else
    err "$HOST FAILED - see /tmp/deploy-${HOST}.log"
    FAILED+=("$HOST")
  fi
done

if [ ${#FAILED[@]} -gt 0 ]; then
  echo ""
  err "Deploy failed on: ${FAILED[*]}"
  echo "  Roll back with: bash deploy/deploy.sh rollback <host>"
  exit 1
fi

# ============================================================
# Health check + run test suite
# ============================================================
echo ""
log "Waiting 12s for migrations & startup..."
sleep 12

log "Quick health check..."
ALL_HEALTHY=true
for HOST in "${TARGETS[@]}"; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$HOST.wuk-on.com/" --insecure --max-time 5)
  if [ "$CODE" = "200" ] || [ "$CODE" = "401" ]; then
    ok "$HOST: HTTP $CODE"
  else
    err "$HOST: HTTP $CODE"
    ALL_HEALTHY=false
  fi
done

if ! $ALL_HEALTHY; then
  err "Some servers unhealthy after deploy."
  exit 1
fi

# Run full test suite if testing alpha or all
if [[ " ${TARGETS[*]} " =~ " alpha " ]] || [ "${#TARGETS[@]}" -ge 4 ]; then
  echo ""
  log "Running full test suite..."
  if [ -f "$TEST_SCRIPT" ]; then
    bash "$TEST_SCRIPT" all 2>&1 | tail -15
  else
    warn "Test script not found at $TEST_SCRIPT, skipping"
  fi
fi

# ============================================================
# Summary
# ============================================================
END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo ""
echo "============================================"
echo "  DEPLOY COMPLETE"
echo "============================================"
echo "  Targets: ${TARGETS[*]}"
echo "  Time:    ${ELAPSED}s"
echo "  Commit:  $CURRENT_COMMIT"
echo ""
echo "  Rollback: bash deploy/deploy.sh rollback <host>"
echo "============================================"
