#!/bin/bash
# Fix backup system path inconsistency

echo "=========================================="
echo "Fixing backup system path"
echo "=========================================="

# 1. Create new backup directory (inside mount point)
BACKUP_DIR="/root/taskflow-data/backups"
mkdir -p "$BACKUP_DIR"
echo "Created backup directory: $BACKUP_DIR"

# 2. Copy existing backups to new directory
echo "Copying existing backup files..."
cp /root/taskflow-backups/taskflow_backup_*.db "$BACKUP_DIR/" 2>/dev/null
COPIED_COUNT=$(ls -1 "$BACKUP_DIR"/taskflow_backup_*.db 2>/dev/null | wc -l)
echo "Copied $COPIED_COUNT backup files"

# 3. Update backup script
echo "Updating backup script..."
cat > /root/backup-taskflow.sh << 'EOFSCRIPT'
#!/bin/bash
# TaskFlow Pro Auto Backup Script v3
# Fix: Backup to container mount directory

# Configuration
BACKUP_DIR="/root/taskflow-data/backups"
DATA_DIR="/root/taskflow-data"
DB_FILE="taskflow.db"
KEEP_DAYS=7

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate backup filename
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/taskflow_backup_$TIMESTAMP.db"

echo "=========================================="
echo "TaskFlow Pro Database Backup"
echo "Time: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

# Copy database file
echo "Backing up database..."
cp "$DATA_DIR/$DB_FILE" "$BACKUP_FILE"

# Also backup WAL and SHM files (if exist)
if [ -f "$DATA_DIR/$DB_FILE-wal" ]; then
    cp "$DATA_DIR/$DB_FILE-wal" "$BACKUP_FILE-wal"
fi
if [ -f "$DATA_DIR/$DB_FILE-shm" ]; then
    cp "$DATA_DIR/$DB_FILE-shm" "$BACKUP_FILE-shm"
fi

# Check if backup succeeded
if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "Backup successful: $BACKUP_FILE ($BACKUP_SIZE)"

    # Delete old backups
    echo "Cleaning old backups (keep last $KEEP_DAYS days)..."
    find "$BACKUP_DIR" -name "taskflow_backup_*.db*" -type f -mtime +$KEEP_DAYS -delete

    # Show current backup list
    echo ""
    echo "Current backup list:"
    ls -lh "$BACKUP_DIR" | grep "taskflow_backup_" | grep "\.db$" | awk '{print "  " $9 " (" $5 ", " $6 " " $7 ")"}'

    # Count backups
    BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/taskflow_backup_*.db 2>/dev/null | wc -l)
    echo ""
    echo "Total $BACKUP_COUNT backup files"

    # Create latest backup symlink
    ln -sf "$BACKUP_FILE" "$BACKUP_DIR/latest.db"
    echo "Latest backup link: $BACKUP_DIR/latest.db"

else
    echo "Backup failed"
    exit 1
fi

echo "=========================================="
echo "Backup complete"
echo "=========================================="
EOFSCRIPT

chmod +x /root/backup-taskflow.sh
echo "Backup script updated"

# 4. Test new backup script
echo ""
echo "Testing new backup script..."
/root/backup-taskflow.sh

echo ""
echo "=========================================="
echo "Fix complete"
echo "=========================================="
echo ""
echo "Summary:"
echo "  - Backup directory: /root/taskflow-backups/ -> /root/taskflow-data/backups/"
echo "  - Copied $COPIED_COUNT existing backups"
echo "  - Backup script updated"
echo "  - Crontab setting unchanged (still hourly)"
echo ""
