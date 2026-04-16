#!/bin/bash
# TaskFlow Pro - Hourly Backup Script
# Runs via cron: 0 * * * * /opt/taskflow/backup.sh

set -e

BACKUP_ROOT="/opt/backups"
HOURLY_DIR="$BACKUP_ROOT/hourly"
DAILY_DIR="$BACKUP_ROOT/daily"
CONTAINER_NAME="taskflow"
LOG_FILE="$BACKUP_ROOT/backup.log"

mkdir -p "$HOURLY_DIR" "$DAILY_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE=$(date +%Y%m%d)
HOUR=$(date +%H)

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Check if container is running
if ! docker ps --filter "name=$CONTAINER_NAME" --format '{{.Names}}' | grep -q "$CONTAINER_NAME"; then
    log "ERROR: Container $CONTAINER_NAME not running, skipping backup"
    exit 1
fi

# Hourly backup: copy DB + key from container
HOURLY_DB="$HOURLY_DIR/taskflow-$TIMESTAMP.db"
HOURLY_KEY="$HOURLY_DIR/taskflow-$TIMESTAMP.key"

docker cp "$CONTAINER_NAME:/app/backend/data/taskflow.db" "$HOURLY_DB" 2>/dev/null
docker cp "$CONTAINER_NAME:/app/backend/data/.db-key" "$HOURLY_KEY" 2>/dev/null

if [ -f "$HOURLY_DB" ] && [ -f "$HOURLY_KEY" ]; then
    SIZE=$(du -h "$HOURLY_DB" | cut -f1)
    log "Hourly backup OK: taskflow-$TIMESTAMP.db ($SIZE)"

    # Also copy into container's backup dir so the BackupMonitor UI can see it
    # Use docker exec to copy WITHIN the container (writes to volume, not overlay layer)
    docker exec "$CONTAINER_NAME" mkdir -p /app/backend/data/backups 2>/dev/null
    docker exec "$CONTAINER_NAME" cp /app/backend/data/taskflow.db "/app/backend/data/backups/taskflow-$TIMESTAMP.db" 2>/dev/null || true
else
    log "ERROR: Hourly backup failed"
    exit 1
fi

# Daily backup: keep one backup per day (first run of the day, or 00:00)
DAILY_DB="$DAILY_DIR/taskflow-$DATE.db"
DAILY_KEY="$DAILY_DIR/taskflow-$DATE.key"
if [ ! -f "$DAILY_DB" ]; then
    cp "$HOURLY_DB" "$DAILY_DB"
    cp "$HOURLY_KEY" "$DAILY_KEY"
    log "Daily backup OK: taskflow-$DATE.db"
fi

# Cleanup: keep only latest 48 hourly backups (48 hours = 2 days)
cd "$HOURLY_DIR"
ls -1t taskflow-*.db 2>/dev/null | tail -n +49 | xargs -r rm -f
ls -1t taskflow-*.key 2>/dev/null | tail -n +49 | xargs -r rm -f

# Cleanup: keep only latest 7 daily backups
cd "$DAILY_DIR"
ls -1t taskflow-*.db 2>/dev/null | tail -n +8 | xargs -r rm -f
ls -1t taskflow-*.key 2>/dev/null | tail -n +8 | xargs -r rm -f

# Report current backup count
HOURLY_COUNT=$(ls -1 "$HOURLY_DIR"/taskflow-*.db 2>/dev/null | wc -l)
DAILY_COUNT=$(ls -1 "$DAILY_DIR"/taskflow-*.db 2>/dev/null | wc -l)
log "Status: $HOURLY_COUNT hourly, $DAILY_COUNT daily backups"
