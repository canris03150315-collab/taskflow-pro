// backend/migrations/20260725070000_add_is_active_to_users.js
// Adds is_active column to users table (1 = active, 0 = deactivated).
// Deactivated users cannot log in and existing tokens are rejected by the
// auth middleware. Idempotent so it can run safely on any database state.

exports.up = async function (knex) {
  const cols = await knex.raw('PRAGMA table_info(users)');
  const colNames = (Array.isArray(cols) ? cols : []).map((c) => c.name);

  if (!colNames.includes('is_active')) {
    await knex.schema.alterTable('users', (t) => {
      t.integer('is_active').defaultTo(1);
    });
    console.log('[Migration] Added is_active column to users');
  } else {
    console.log('[Migration] is_active column already exists, skipping');
  }
};

exports.down = async function () {
  // SQLite doesn't support DROP COLUMN reliably; manual fix required if rollback needed
  throw new Error('Cannot auto-rollback ADD COLUMN on SQLite');
};
