// backend/migrations/20260603140000_add_images_to_work_logs.js
// Adds images JSON column to work_logs. Idempotent so it can run on any DB state.

exports.up = async function (knex) {
  const cols = await knex.raw('PRAGMA table_info(work_logs)');
  const colNames = (Array.isArray(cols) ? cols : []).map((c) => c.name);

  if (!colNames.includes('images')) {
    await knex.schema.alterTable('work_logs', (t) => {
      t.text('images'); // JSON: { today: [], tomorrow: [], notes: [] }
    });
    console.log('[Migration] Added images column to work_logs');
  } else {
    console.log('[Migration] images column already exists, skipping');
  }
};

exports.down = async function () {
  throw new Error('Cannot auto-rollback ADD COLUMN on SQLite');
};
