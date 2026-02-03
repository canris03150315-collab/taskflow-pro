#!/bin/bash
# Fix backup file timestamps - preserve original mtime

echo "=========================================="
echo "Fixing backup file timestamps"
echo "=========================================="

BACKUP_DIR="/root/taskflow-data/backups"
OLD_BACKUP_DIR="/root/taskflow-backups"

# Remove incorrectly copied files (with wrong timestamps)
echo "Removing files with incorrect timestamps..."
rm -f "$BACKUP_DIR"/taskflow_backup_*.db*

# Copy with -p flag to preserve timestamps
echo "Copying backups with preserved timestamps..."
cp -p "$OLD_BACKUP_DIR"/taskflow_backup_*.db "$BACKUP_DIR/" 2>/dev/null
cp -p "$OLD_BACKUP_DIR"/taskflow_backup_*.db-wal "$BACKUP_DIR/" 2>/dev/null
cp -p "$OLD_BACKUP_DIR"/taskflow_backup_*.db-shm "$BACKUP_DIR/" 2>/dev/null

# Count files
COPIED_COUNT=$(ls -1 "$BACKUP_DIR"/taskflow_backup_*.db 2>/dev/null | wc -l)
echo "Copied $COPIED_COUNT backup files with preserved timestamps"

# Show sample of timestamps
echo ""
echo "Sample of backup timestamps:"
ls -lh "$BACKUP_DIR" | grep "taskflow_backup_2026020[12]" | head -10 | awk '{print "  " $6 " " $7 " " $8 " - " $9}'

# Update latest symlink
LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/taskflow_backup_*.db | head -1)
if [ -n "$LATEST_BACKUP" ]; then
    ln -sf "$LATEST_BACKUP" "$BACKUP_DIR/latest.db"
    echo ""
    echo "Updated latest.db symlink to: $(basename $LATEST_BACKUP)"
fi

echo ""
echo "=========================================="
echo "Fix complete"
echo "=========================================="
