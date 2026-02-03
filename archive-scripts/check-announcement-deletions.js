const Database = require('better-sqlite3');

console.log('=== Check Announcement Deletion Records ===\n');

const db = new Database('/app/data/taskflow.db');

// Test 1: Check if there's a system_logs table
console.log('Test 1: Check for system logs');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%log%'").all();
console.log('Log-related tables:', tables.map(t => t.name).join(', '));

// Test 2: Check audit_log table if exists
const auditLogExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='approval_audit_log'").all();
if (auditLogExists.length > 0) {
  console.log('\nTest 2: Check approval_audit_log for announcement deletions');
  const auditLogs = db.prepare(`
    SELECT * FROM approval_audit_log 
    WHERE action LIKE '%delete%' 
    OR action LIKE '%DELETE%'
    OR entity_type LIKE '%announcement%'
    ORDER BY created_at DESC 
    LIMIT 20
  `).all();
  
  console.log('Audit log entries:', auditLogs.length);
  if (auditLogs.length > 0) {
    auditLogs.forEach(log => {
      console.log(`  - ${log.action} by ${log.user_id} at ${log.created_at}`);
      console.log(`    Entity: ${log.entity_type} ${log.entity_id}`);
    });
  }
}

// Test 3: Check current announcements vs backup
console.log('\nTest 3: Compare current announcements with backup');

const currentAnn = db.prepare('SELECT id, title, created_at, created_by FROM announcements ORDER BY created_at DESC').all();
console.log('Current announcements:', currentAnn.length);

const backupDb = new Database('/app/data/backups/taskflow-backup-2026-01-26T09-35-56-943Z.db', { readonly: true });
const backupAnn = backupDb.prepare('SELECT id, title, created_at, created_by FROM announcements ORDER BY created_at DESC').all();
console.log('Backup announcements:', backupAnn.length);

// Find announcements in backup but not in current (deleted)
const currentIds = new Set(currentAnn.map(a => a.id));
const deletedAnn = backupAnn.filter(a => !currentIds.has(a.id));

if (deletedAnn.length > 0) {
  console.log('\n⚠️ Announcements in backup but NOT in current DB (possibly deleted):');
  deletedAnn.forEach(ann => {
    const creator = backupDb.prepare('SELECT name FROM users WHERE id = ?').get(ann.created_by);
    console.log(`  - "${ann.title}"`);
    console.log(`    Created: ${ann.created_at} by ${creator?.name || ann.created_by}`);
    console.log(`    ID: ${ann.id}`);
  });
} else {
  console.log('\n✅ No announcements were deleted (all backup announcements exist in current DB)');
}

// Find announcements in current but not in backup (newly added)
const backupIds = new Set(backupAnn.map(a => a.id));
const newAnn = currentAnn.filter(a => !backupIds.has(a.id));

if (newAnn.length > 0) {
  console.log('\nNew announcements (added after backup):');
  newAnn.forEach(ann => {
    const creator = db.prepare('SELECT name FROM users WHERE id = ?').get(ann.created_by);
    console.log(`  - "${ann.title}"`);
    console.log(`    Created: ${ann.created_at} by ${creator?.name || ann.created_by}`);
  });
}

// Test 4: Check today's announcements activity
console.log('\nTest 4: Today\'s announcements (2026-01-29)');
const todayAnn = db.prepare(`
  SELECT * FROM announcements 
  WHERE DATE(created_at) = '2026-01-29'
  ORDER BY created_at
`).all();

console.log('Announcements created today:', todayAnn.length);
if (todayAnn.length > 0) {
  todayAnn.forEach(ann => {
    const creator = db.prepare('SELECT name FROM users WHERE id = ?').get(ann.created_by);
    console.log(`  - "${ann.title}" at ${ann.created_at} by ${creator?.name || ann.created_by}`);
  });
}

db.close();
backupDb.close();

console.log('\n=== Check Complete ===');
