const Database = require('better-sqlite3');

console.log('=== Restoring Weekly Pay Notes from Backup ===\n');

// 打開備份資料庫
const backupDb = new Database('/tmp/taskflow-snapshot-v8.9.170-before-kol-refactor-20260126_093437/taskflow.db', { readonly: true });

// 打開當前資料庫
const currentDb = new Database('/app/data/taskflow.db');

console.log('Step 1: Reading weekly_pay_note from backup...');
const backupProfiles = backupDb.prepare('SELECT id, platform_id, facebook_id, platform_account, weekly_pay_note FROM kol_profiles').all();

console.log('Found', backupProfiles.length, 'profiles in backup');

console.log('\nStep 2: Updating current database...');
currentDb.prepare('BEGIN TRANSACTION').run();

let updatedCount = 0;
let notFoundCount = 0;

try {
  for (const backup of backupProfiles) {
    if (backup.weekly_pay_note) {
      // 嘗試通過 platform_id 或 facebook_id 匹配
      const current = currentDb.prepare('SELECT id FROM kol_profiles WHERE platform_id = ? OR facebook_id = ?').get(backup.platform_id || backup.facebook_id, backup.facebook_id || backup.platform_id);
      
      if (current) {
        currentDb.prepare('UPDATE kol_profiles SET weekly_pay_note = ? WHERE id = ?').run(backup.weekly_pay_note, current.id);
        updatedCount++;
        console.log(`Updated: ${backup.platform_account} - "${backup.weekly_pay_note}"`);
      } else {
        notFoundCount++;
        console.log(`Not found: ${backup.platform_account}`);
      }
    }
  }
  
  currentDb.prepare('COMMIT').run();
  
  console.log('\n=== Restore Complete ===');
  console.log('Updated:', updatedCount);
  console.log('Not found:', notFoundCount);
  
} catch (error) {
  currentDb.prepare('ROLLBACK').run();
  console.error('Error:', error);
  throw error;
}

backupDb.close();
currentDb.close();
