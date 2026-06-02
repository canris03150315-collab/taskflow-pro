// backend/migrations/20260429120000_create_files_tables.js
exports.up = async function (knex) {
  await knex.schema.createTable('files', (t) => {
    t.text('id').primary();
    t.text('filename').notNullable();
    t.text('owner_id').notNullable();
    t.text('created_at').notNullable();
    t.text('latest_uploaded_at').notNullable();
    t.integer('is_deleted').defaultTo(0);
    t.foreign('owner_id').references('users.id');
  });
  await knex.schema.raw('CREATE INDEX idx_files_owner ON files(owner_id)');
  await knex.schema.raw('CREATE INDEX idx_files_filename_owner ON files(filename, owner_id)');
  await knex.schema.raw('CREATE INDEX idx_files_latest ON files(latest_uploaded_at)');

  await knex.schema.createTable('file_versions', (t) => {
    t.text('id').primary();
    t.text('file_id').notNullable();
    t.integer('version_no').notNullable();
    t.text('uploader_id').notNullable();
    t.text('uploaded_at').notNullable();
    t.text('content_hash').notNullable();
    t.text('blob_path').notNullable();
    t.integer('file_size').notNullable();
    t.text('mime_type').notNullable();
    t.text('note');
    t.integer('is_deleted').defaultTo(0);
    t.text('deleted_at');
    t.text('deleted_by');
    t.foreign('file_id').references('files.id');
    t.foreign('uploader_id').references('users.id');
    t.unique(['file_id', 'version_no']);
  });
  await knex.schema.raw('CREATE INDEX idx_versions_file ON file_versions(file_id)');
  await knex.schema.raw('CREATE INDEX idx_versions_uploader ON file_versions(uploader_id)');
  await knex.schema.raw('CREATE INDEX idx_versions_hash ON file_versions(content_hash)');
  await knex.schema.raw('CREATE INDEX idx_versions_deleted_at ON file_versions(deleted_at)');

  await knex.schema.createTable('file_operations', (t) => {
    t.text('id').primary();
    t.text('action').notNullable();
    t.text('actor_id').notNullable();
    t.text('file_id').notNullable();
    t.text('version_id');
    t.text('created_at').notNullable();
    t.text('ip_address');
    t.foreign('actor_id').references('users.id');
    t.foreign('file_id').references('files.id');
  });
  await knex.schema.raw('CREATE INDEX idx_ops_created ON file_operations(created_at)');
  await knex.schema.raw('CREATE INDEX idx_ops_actor ON file_operations(actor_id)');
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('file_operations');
  await knex.schema.dropTableIfExists('file_versions');
  await knex.schema.dropTableIfExists('files');
};
