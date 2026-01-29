const Database = require('better-sqlite3');

console.log('=== Check Announcement Deletion Records ===\n');

const db = new Database('/app/data/taskflow.db');

// Test 1: Check current announcements vs backup
console.log('Test 1: Compare current announcements with backup\n');

const currentAnn = db.prepare('SELECT id, title, created_at, created_by FROM announcements ORDER BY created_at DESC').all();
console.log('Current announcements:', currentAnn.length);
console.log('Current announcement list:');
currentAnn.forEach((ann, i) => {
  const creator = db.prepare('SELECT name FROM users WHERE id = ?').get(ann.created_by);
  console.log(`  ${i + 1}. "${ann.title}" (${ann.created_at}) by ${creator?.name || ann.created_by}`);
});

const backupDb = new Database('/app/data/backups/taskflow-backup-2026-01-26T09-35-56-943Z.db', { readonly: true });
const backupAnn = backupDb.prepare('SELECT id, title, created_at, created_by FROM announcements ORDER BY created_at DESC').all();
console.log('\nBackup announcements:', backupAnn.length);
console.log('Backup announcement list:');
backupAnn.forEach((ann, i) => {
  const creator = backupDb.prepare('SELECT name FROM users WHERE id = ?').get(ann.created_by);
  console.log(`  ${i + 1}. "${ann.title}" (${ann.created_at}) by ${creator?.name || ann.created_by}`);
});

// Find announcements in backup but not in current (deleted)
console.log('\n=== Deletion Analysis ===\n');
const currentIds = new Set(currentAnn.map(a => a.id));
const deletedAnn = backupAnn.filter(a => !currentIds.has(a.id));

if (deletedAnn.length > 0) {
  console.log('⚠️ DELETED: Announcements in backup but NOT in current DB:');
  deletedAnn.forEach(ann => {
    const creator = backupDb.prepare('SELECT name FROM users WHERE id = ?').get(ann.created_by);
    console.log(`  ❌ "${ann.title}"`);
    console.log(`     Created: ${ann.created_at} by ${creator?.name || ann.created_by}`);
    console.log(`     ID: ${ann.id}`);
  });
} else {
  console.log('✅ No announcements were deleted');
  console.log('   All backup announcements still exist in current DB');
}

// Find announcements in current but not in backup (newly added)
const backupIds = new Set(backupAnn.map(a => a.id));
const newAnn = currentAnn.filter(a => !backupIds.has(a.id));

if (newAnn.length > 0) {
  console.log('\n✨ NEW: Announcements added after backup:');
  newAnn.forEach(ann => {
    const creator = db.prepare('SELECT name FROM users WHERE id = ?').get(ann.created_by);
    console.log(`  ➕ "${ann.title}"`);
    console.log(`     Created: ${ann.created_at} by ${creator?.name || ann.created_by}`);
    console.log(`     ID: ${ann.id}`);
  });
}

// Test 2: Check today's activity
console.log('\n=== Today\'s Activity (2026-01-29) ===\n');
const todayAnn = db.prepare(`
  SELECT * FROM announcements 
  WHERE created_at >= '2026-01-29 00:00:00'
  ORDER BY created_at
`).all();

console.log('Announcements created today:', todayAnn.length);
if (todayAnn.length > 0) {
  todayAnn.forEach(ann => {
    const creator = db.prepare('SELECT name FROM users WHERE id = ?').get(ann.created_by);
    console.log(`  - "${ann.title}"`);
    console.log(`    Time: ${ann.created_at}`);
    console.log(`    By: ${creator?.name || ann.created_by}`);
    console.log(`    Content: ${ann.content.substring(0, 50)}...`);
  });
} else {
  console.log('  No announcements created today');
}

// Test 3: Summary
console.log('\n=== Summary ===');
console.log(`Backup (2026-01-26 09:35): ${backupAnn.length} announcements`);
console.log(`Current database: ${currentAnn.length} announcements`);
console.log(`Deleted: ${deletedAnn.length}`);
console.log(`Added: ${newAnn.length}`);
console.log(`Net change: ${currentAnn.length - backupAnn.length > 0 ? '+' : ''}${currentAnn.length - backupAnn.length}`);

db.close();
backupDb.close();

console.log('\n=== Check Complete ===');
