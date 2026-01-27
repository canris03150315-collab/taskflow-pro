#!/bin/bash

echo "=== Checking Backup Reports ==="
echo ""

BACKUPS=(
  "taskflow-snapshot-v8.9.167-before-audit-log-api-20260122_073300.tar.gz"
  "taskflow-snapshot-v8.9.168-audit-log-api-complete-20260122_073931.tar.gz"
  "taskflow-snapshot-v8.9.169-audit-db-syntax-fix-complete-20260122_103814.tar.gz"
  "taskflow-snapshot-v8.9.169-before-ai-assistant-fix-20260124_134137.tar.gz"
  "taskflow-snapshot-v8.9.170-ai-assistant-fixed-complete-20260124_151701.tar.gz"
)

cd /tmp
rm -rf backup-check
mkdir -p backup-check

for BACKUP in "${BACKUPS[@]}"; do
  echo "Checking: $BACKUP"
  
  cd /tmp/backup-check
  rm -rf *
  
  tar -xzf "/root/taskflow-snapshots/$BACKUP" 2>/dev/null
  
  DB_FILE=$(find . -name "taskflow.db" -type f | head -1)
  
  if [ -z "$DB_FILE" ]; then
    echo "  [SKIP] No database found"
    echo ""
    continue
  fi
  
  echo "  [DB] Found: $DB_FILE"
  
  # Query reports from Jan 22-25
  sqlite3 "$DB_FILE" <<EOF
.mode column
SELECT 
  date(created_at) as report_date,
  COUNT(*) as count
FROM reports 
WHERE date(created_at) BETWEEN '2026-01-22' AND '2026-01-25'
GROUP BY date(created_at)
ORDER BY report_date;
EOF
  
  REPORT_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM reports WHERE date(created_at) BETWEEN '2026-01-22' AND '2026-01-25'")
  
  if [ "$REPORT_COUNT" -gt 0 ]; then
    echo "  [FOUND] $REPORT_COUNT reports in date range"
    echo ""
    echo "  Details:"
    sqlite3 "$DB_FILE" <<EOF
.mode line
SELECT 
  id,
  user_id,
  date(created_at) as report_date,
  created_at
FROM reports 
WHERE date(created_at) BETWEEN '2026-01-22' AND '2026-01-25'
ORDER BY created_at;
EOF
  else
    echo "  [EMPTY] No reports in date range"
  fi
  
  echo ""
  echo "---"
  echo ""
done

cd /tmp
rm -rf backup-check

echo "=== Check Complete ==="
