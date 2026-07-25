// backend/migrations/20260725180000_add_clockout_missing_to_attendance.js
// Adds clockout_missing column to attendance_records (1 = record was flagged
// as "possibly forgot to clock out" — open past the 12h shift threshold and
// auto-closed with 0 credited minutes for supervisor review). Idempotent.

exports.up = async function (knex) {
  const cols = await knex.raw('PRAGMA table_info(attendance_records)');
  const colNames = (Array.isArray(cols) ? cols : []).map((c) => c.name);

  if (!colNames.includes('clockout_missing')) {
    await knex.schema.alterTable('attendance_records', (t) => {
      t.integer('clockout_missing').defaultTo(0);
    });
    console.log('[Migration] Added clockout_missing column to attendance_records');
  } else {
    console.log('[Migration] clockout_missing column already exists, skipping');
  }
};

exports.down = async function () {
  // SQLite doesn't support DROP COLUMN reliably; manual fix required if rollback needed
  throw new Error('Cannot auto-rollback ADD COLUMN on SQLite');
};
