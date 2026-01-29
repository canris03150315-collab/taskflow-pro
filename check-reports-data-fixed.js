const Database = require('better-sqlite3');

console.log('=== Check Reports Data in Backups ===\n');

const backups = [
  { name: 'Backup 1 (2026-01-29 06:00)', path: '/app/backup1.db' },
  { name: 'Backup 2 (2026-01-29 00:00)', path: '/app/backup2.db' },
  { name: 'Backup 3 (2026-01-28 18:00)', path: '/app/backup3.db' },
  { name: 'Backup 4 (2026-01-28 12:00)', path: '/app/backup4.db' }
];

backups.forEach((backup, i) => {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`${backup.name}`);
  console.log('='.repeat(80));
  
  const db = new Database(backup.path, { readonly: true });
  
  // Total reports
  const total = db.prepare('SELECT COUNT(*) as count FROM reports').get();
  console.log(`\n📊 Total Reports: ${total.count}`);
  
  // Reports by type
  const byType = db.prepare('SELECT type, COUNT(*) as count FROM reports GROUP BY type ORDER BY type').all();
  console.log('\nReports by Type:');
  byType.forEach(r => console.log(`  ${r.type}: ${r.count}`));
  
  // Reports by date
  const byDate = db.prepare(`
    SELECT DATE(created_at) as date, COUNT(*) as count 
    FROM reports 
    GROUP BY DATE(created_at) 
    ORDER BY date DESC 
    LIMIT 10
  `).all();
  console.log('\nReports by Date (last 10):');
  byDate.forEach(r => console.log(`  ${r.date}: ${r.count} reports`));
  
  // All reports details
  const allReports = db.prepare(`
    SELECT id, type, created_at, user_id 
    FROM reports 
    ORDER BY created_at DESC
  `).all();
  
  console.log(`\nAll Reports (${allReports.length}):`);
  allReports.forEach((r, idx) => {
    const user = db.prepare('SELECT name FROM users WHERE id = ?').get(r.user_id);
    const date = r.created_at.split('T')[0];
    console.log(`  ${idx + 1}. [${r.type}] ${date} by ${user?.name || r.user_id}`);
  });
  
  // Check specific dates
  const dates = ['2026-01-26', '2026-01-27', '2026-01-28', '2026-01-29'];
  console.log('\nReports for Jan 26-29:');
  dates.forEach(date => {
    const count = db.prepare(`
      SELECT COUNT(*) as count 
      FROM reports 
      WHERE DATE(created_at) = ?
    `).get(date);
    if (count.count > 0) {
      const reports = db.prepare(`
        SELECT type, user_id 
        FROM reports 
        WHERE DATE(created_at) = ?
      `).all(date);
      const users = reports.map(r => {
        const user = db.prepare('SELECT name FROM users WHERE id = ?').get(r.user_id);
        return `${user?.name || r.user_id}(${r.type})`;
      });
      console.log(`  ${date}: ${count.count} (${users.join(', ')})`);
    } else {
      console.log(`  ${date}: 0`);
    }
  });
  
  db.close();
});

// Current database
console.log(`\n\n${'='.repeat(80)}`);
console.log('CURRENT DATABASE');
console.log('='.repeat(80));

const currentDb = new Database('/app/data/taskflow.db');

const currentTotal = currentDb.prepare('SELECT COUNT(*) as count FROM reports').get();
console.log(`\n📊 Total Reports: ${currentTotal.count}`);

const currentByType = currentDb.prepare('SELECT type, COUNT(*) as count FROM reports GROUP BY type ORDER BY type').all();
console.log('\nReports by Type:');
currentByType.forEach(r => console.log(`  ${r.type}: ${r.count}`));

const currentByDate = currentDb.prepare(`
  SELECT DATE(created_at) as date, COUNT(*) as count 
  FROM reports 
  GROUP BY DATE(created_at) 
  ORDER BY date DESC 
  LIMIT 10
`).all();
console.log('\nReports by Date (last 10):');
currentByDate.forEach(r => console.log(`  ${r.date}: ${r.count} reports`));

const currentAllReports = currentDb.prepare(`
  SELECT id, type, created_at, user_id 
  FROM reports 
  ORDER BY created_at DESC
`).all();

console.log(`\nAll Reports (${currentAllReports.length}):`);
currentAllReports.forEach((r, idx) => {
  const user = currentDb.prepare('SELECT name FROM users WHERE id = ?').get(r.user_id);
  const date = r.created_at.split('T')[0];
  console.log(`  ${idx + 1}. [${r.type}] ${date} by ${user?.name || r.user_id}`);
});

const dates = ['2026-01-26', '2026-01-27', '2026-01-28', '2026-01-29'];
console.log('\nReports for Jan 26-29:');
dates.forEach(date => {
  const count = currentDb.prepare(`
    SELECT COUNT(*) as count 
    FROM reports 
    WHERE DATE(created_at) = ?
  `).get(date);
  if (count.count > 0) {
    const reports = currentDb.prepare(`
      SELECT type, user_id 
      FROM reports 
      WHERE DATE(created_at) = ?
    `).all(date);
    const users = reports.map(r => {
      const user = currentDb.prepare('SELECT name FROM users WHERE id = ?').get(r.user_id);
      return `${user?.name || r.user_id}(${r.type})`;
    });
    console.log(`  ${date}: ${count.count} (${users.join(', ')})`);
  } else {
    console.log(`  ${date}: 0`);
  }
});

currentDb.close();

console.log('\n' + '='.repeat(80));
console.log('=== Check Complete ===');
