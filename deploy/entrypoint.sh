#!/bin/sh
set -e

echo "=== TaskFlow Pro Starting ==="
echo "INSTANCE_MODE: ${INSTANCE_MODE:-subsidiary}"
echo "NODE_ENV: ${NODE_ENV:-production}"

# Run database migrations (idempotent — safe to run on every startup)
echo "Running database migrations..."
cd /app/backend
if [ -f knexfile.js ] && [ -d migrations ]; then
  # Pre-mark baseline migration as applied if DB already has tables but no
  # knex_migrations table (existing production DBs from before Knex was introduced)
  if [ -f data/taskflow.db ]; then
    HAS_USERS=$(sqlite3 data/taskflow.db "SELECT name FROM sqlite_master WHERE type='table' AND name='users'" 2>/dev/null || echo "")
    HAS_KNEX=$(sqlite3 data/taskflow.db "SELECT name FROM sqlite_master WHERE type='table' AND name='knex_migrations'" 2>/dev/null || echo "")
    if [ -n "$HAS_USERS" ] && [ -z "$HAS_KNEX" ]; then
      echo "  → Existing DB without knex_migrations table — marking baseline as applied"
      sqlite3 data/taskflow.db <<SQL
CREATE TABLE knex_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(255),
  batch INTEGER,
  migration_time DATETIME
);
CREATE TABLE knex_migrations_lock (
  "index" INTEGER PRIMARY KEY AUTOINCREMENT,
  is_locked INTEGER
);
INSERT INTO knex_migrations (name, batch, migration_time) VALUES
  ('20260417000000_initial_schema_baseline.js', 1, datetime('now'));
INSERT INTO knex_migrations_lock (is_locked) VALUES (0);
SQL
    fi
  fi

  # Run pending migrations
  npx knex migrate:latest --knexfile knexfile.js || {
    echo "  ⚠️ Migration failed — continuing anyway (will retry on next restart)"
  }
  echo "  ✓ Migrations done"
else
  echo "  → No knexfile.js or migrations/ directory found, skipping"
fi

# Start nginx in background
echo "Starting nginx..."
nginx

# Start backend (HTTP only, no HTTPS - Cloudflare handles SSL)
echo "Starting backend on port 3001..."
cd /app/backend
exec node dist/index.js start --port 3001 --no-https --data /app/backend/data
