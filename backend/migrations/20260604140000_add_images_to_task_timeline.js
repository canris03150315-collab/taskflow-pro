// backend/migrations/20260604140000_add_images_to_task_timeline.js
// Adds images JSON column to task_timeline. Idempotent so it can run on any DB state.

exports.up = async function (knex) {
  const cols = await knex.raw('PRAGMA table_info(task_timeline)');
  const colNames = (Array.isArray(cols) ? cols : []).map((c) => c.name);

  if (!colNames.includes('images')) {
    await knex.schema.alterTable('task_timeline', (t) => {
      t.text('images'); // JSON array of { hash, filename, size, mime_type, uploader_id, uploaded_at, blob_path }
    });
    console.log('[Migration] Added images column to task_timeline');
  } else {
    console.log('[Migration] task_timeline.images already exists, skipping');
  }
};

exports.down = async function () {
  throw new Error('Cannot auto-rollback ADD COLUMN on SQLite');
};
