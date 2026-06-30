// backend/migrations/20260701000000_add_work_log_images_index.js
// Adds work_log_images index table for fast hash → log lookups.
// Backfills from existing work_logs.images JSON column (if any).
// Idempotent — safe to re-run.

exports.up = async function (knex) {
  const exists = await knex.schema.hasTable('work_log_images');
  if (!exists) {
    await knex.schema.createTable('work_log_images', (t) => {
      t.string('hash').notNullable();
      t.string('work_log_id').notNullable();
      t.string('section').notNullable(); // 'today' | 'tomorrow' | 'notes'
      t.string('filename');
      t.integer('size');
      t.string('mime_type');
      t.string('uploader_id');
      t.string('uploaded_at');
      t.string('blob_path').notNullable();
      // Composite primary key so same hash can appear in different logs/sections
      t.primary(['hash', 'work_log_id', 'section']);
      t.index(['hash'], 'idx_wli_hash');
      t.index(['work_log_id'], 'idx_wli_work_log');
      t.foreign('work_log_id').references('id').inTable('work_logs').onDelete('CASCADE');
    });
    console.log('[Migration] Created work_log_images table');
  } else {
    console.log('[Migration] work_log_images table already exists, skipping create');
  }

  // Backfill from existing work_logs.images JSON
  const rows = await knex('work_logs')
    .select('id', 'images')
    .whereNotNull('images')
    .where('images', '!=', '');
  let inserted = 0;
  for (const row of rows) {
    let parsed;
    try {
      parsed = JSON.parse(row.images);
    } catch {
      continue;
    }
    for (const sec of ['today', 'tomorrow', 'notes']) {
      const arr = parsed && parsed[sec];
      if (!Array.isArray(arr)) continue;
      for (const img of arr) {
        if (!img || !img.hash || !img.blob_path) continue;
        try {
          await knex('work_log_images').insert({
            hash: img.hash,
            work_log_id: row.id,
            section: sec,
            filename: img.filename || null,
            size: img.size || null,
            mime_type: img.mime_type || null,
            uploader_id: img.uploader_id || null,
            uploaded_at: img.uploaded_at || null,
            blob_path: img.blob_path,
          });
          inserted++;
        } catch (e) {
          // Likely duplicate (re-run) — skip silently
        }
      }
    }
  }
  console.log(`[Migration] Backfilled ${inserted} work_log_image rows from existing JSON`);
};

exports.down = async function () {
  throw new Error('Cannot auto-rollback work_log_images table — would drop data');
};
