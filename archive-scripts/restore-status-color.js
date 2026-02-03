const Database = require('better-sqlite3');

console.log('=== Restoring Status Color from Backup ===\n');

const backupDb = new Database('/tmp/backup.db', { readonly: true });
const currentDb = new Database('/app/data/taskflow.db');

console.log('Step 1: Reading status and status_color from backup...');
const backupProfiles = backupDb.prepare('SELECT platform_id, facebook_id, platform_account, status, status_color FROM kol_profiles').all();

console.log('Found', backupProfiles.length, 'profiles in backup');

console.log('\nStep 2: Converting status to status_color...');
currentDb.prepare('BEGIN TRANSACTION').run();

let updatedCount = 0;

try {
  for (const backup of backupProfiles) {
    const current = currentDb.prepare('SELECT id FROM kol_profiles WHERE platform_id = ? OR facebook_id = ?').get(backup.platform_id || backup.facebook_id, backup.facebook_id || backup.platform_id);
    
    if (current) {
      let statusColor = backup.status_color || 'green';
      
      if (!backup.status_color) {
        switch (backup.status) {
          case 'ACTIVE':
            statusColor = 'green';
            break;
          case 'STOPPED':
            statusColor = 'red';
            break;
          case 'LOST_CONTACT':
            statusColor = 'red';
            break;
          case 'NEGOTIATING':
            statusColor = 'yellow';
            break;
          default:
            statusColor = 'green';
        }
      }
      
      currentDb.prepare('UPDATE kol_profiles SET status_color = ? WHERE id = ?').run(statusColor, current.id);
      updatedCount++;
      console.log(`Updated: ${backup.platform_account} - status: ${backup.status} -> color: ${statusColor}`);
    }
  }
  
  currentDb.prepare('COMMIT').run();
  
  console.log('\n=== Restore Complete ===');
  console.log('Updated:', updatedCount);
  
} catch (error) {
  currentDb.prepare('ROLLBACK').run();
  console.error('Error:', error);
  throw error;
}

backupDb.close();
currentDb.close();
