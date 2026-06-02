// backend/migrations/20260429120100_backup_and_drop_old_reports.js
const fs = require('fs');
const path = require('path');

exports.up = async function (knex) {
  // Backup old reports data to JSON before dropping
  const backupDir = path.join(__dirname, '..', 'data', 'migrations');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  const tablesToBackup = ['reports', 'report_authorizations'];
  const backup = {};
  for (const tableName of tablesToBackup) {
    const exists = await knex.schema.hasTable(tableName);
    if (exists) {
      backup[tableName] = await knex(tableName).select('*');
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `old-reports-backup-${timestamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  console.log(`[Migration] Old reports backed up to ${backupPath}`);

  // Drop old tables
  await knex.schema.dropTableIfExists('report_authorizations');
  await knex.schema.dropTableIfExists('reports');
};

exports.down = async function () {
  // Restore is manual from JSON backup if needed
  throw new Error('Cannot auto-rollback; restore from JSON backup if needed');
};
