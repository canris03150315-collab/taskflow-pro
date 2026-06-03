// backend/migrations/20260603120000_add_exclude_from_attendance_to_users.js
// Adds exclude_from_attendance column to users table if missing.
// Baseline schema declares this column, but databases created before the
// baseline migration was authored don't have it. This migration is idempotent
// so it can run safely on any database state.

exports.up = async function (knex) {
  const cols = await knex.raw('PRAGMA table_info(users)');
  const colNames = (Array.isArray(cols) ? cols : []).map((c) => c.name);

  if (!colNames.includes('exclude_from_attendance')) {
    await knex.schema.alterTable('users', (t) => {
      t.integer('exclude_from_attendance').defaultTo(0);
    });
    console.log('[Migration] Added exclude_from_attendance column to users');
  } else {
    console.log('[Migration] exclude_from_attendance column already exists, skipping');
  }
};

exports.down = async function () {
  // SQLite doesn't support DROP COLUMN reliably; manual fix required if rollback needed
  throw new Error('Cannot auto-rollback ADD COLUMN on SQLite');
};
