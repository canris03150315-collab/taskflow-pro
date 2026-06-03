// Partial unique index on (owner_id, filename) for active files.
// Prevents race conditions when same user uploads same filename concurrently.
exports.up = async function (knex) {
  // SQLite supports partial indexes
  await knex.schema.raw(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_files_active_unique ON files(owner_id, filename) WHERE is_deleted = 0'
  );
};

exports.down = async function (knex) {
  await knex.schema.raw('DROP INDEX IF EXISTS idx_files_active_unique');
};
