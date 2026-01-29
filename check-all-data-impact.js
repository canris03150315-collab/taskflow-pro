const Database = require('better-sqlite3');

console.log('=== Comprehensive Data Impact Analysis ===\n');
console.log('Checking all tables for data after 2026-01-26...\n');

const db = new Database('/app/data/taskflow.db', { readonly: true });
const today = new Date().toISOString().split('T')[0];

const results = {
  affected: [],
  unaffected: [],
  noDateColumn: []
};

// Tables to check with their date columns
const tablesToCheck = [
  { name: 'attendance_records', dateColumn: 'date' },
  { name: 'routine_records', dateColumn: 'date' },
  { name: 'work_logs', dateColumn: 'date' },
  { name: 'leave_requests', dateColumn: 'created_at' },
  { name: 'schedules', dateColumn: 'month' },
  { name: 'reports', dateColumn: 'created_at' },
  { name: 'announcements', dateColumn: 'created_at' },
  { name: 'finance', dateColumn: 'date' },
  { name: 'tasks', dateColumn: 'created_at' },
  { name: 'forum_suggestions', dateColumn: 'created_at' },
  { name: 'kol_contracts', dateColumn: 'created_at' }
];

console.log('Analyzing ' + tablesToCheck.length + ' tables...\n');

tablesToCheck.forEach(table => {
  try {
    // Check if table exists
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name=?
    `).get(table.name);
    
    if (!tableExists) {
      console.log('[SKIP] ' + table.name + ': Table does not exist');
      return;
    }
    
    // Get total count
    const total = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
    
    // Check latest date
    let latestDate, afterJan26Count;
    
    try {
      const latestResult = db.prepare(`
        SELECT MAX(${table.dateColumn}) as latest FROM ${table.name}
      `).get();
      
      latestDate = latestResult.latest;
      
      // Count records after 2026-01-26
      const afterJan26 = db.prepare(`
        SELECT COUNT(*) as count FROM ${table.name}
        WHERE ${table.dateColumn} > '2026-01-26'
      `).get();
      
      afterJan26Count = afterJan26.count;
      
      console.log('[CHECK] ' + table.name);
      console.log('  Total records: ' + total.count);
      console.log('  Latest date: ' + (latestDate || 'N/A'));
      console.log('  Records after Jan 26: ' + afterJan26Count);
      
      if (afterJan26Count === 0 && latestDate && latestDate <= '2026-01-26') {
        console.log('  Status: AFFECTED - No data after Jan 26');
        results.affected.push({
          table: table.name,
          total: total.count,
          latest: latestDate,
          afterJan26: 0
        });
      } else if (afterJan26Count > 0) {
        console.log('  Status: OK - Has recent data');
        results.unaffected.push({
          table: table.name,
          total: total.count,
          latest: latestDate,
          afterJan26: afterJan26Count
        });
      }
      
    } catch (e) {
      console.log('  Error checking dates: ' + e.message);
      results.noDateColumn.push(table.name);
    }
    
    console.log('');
    
  } catch (error) {
    console.log('[ERROR] ' + table.name + ': ' + error.message);
    console.log('');
  }
});

db.close();

console.log('=== Summary ===\n');

console.log('AFFECTED TABLES (' + results.affected.length + '):');
if (results.affected.length > 0) {
  results.affected.forEach(t => {
    console.log('  - ' + t.table + ': Latest ' + t.latest + ' (' + t.total + ' records)');
  });
} else {
  console.log('  None');
}
console.log('');

console.log('UNAFFECTED TABLES (' + results.unaffected.length + '):');
if (results.unaffected.length > 0) {
  results.unaffected.forEach(t => {
    console.log('  - ' + t.table + ': ' + t.afterJan26 + ' records after Jan 26');
  });
} else {
  console.log('  None');
}
console.log('');

if (results.noDateColumn.length > 0) {
  console.log('TABLES WITHOUT DATE COLUMN (' + results.noDateColumn.length + '):');
  results.noDateColumn.forEach(t => {
    console.log('  - ' + t);
  });
  console.log('');
}

console.log('=== Impact Assessment ===\n');

if (results.affected.length > 0) {
  console.log('[CRITICAL] ' + results.affected.length + ' tables affected by data rollback');
  console.log('');
  console.log('Missing data period: 2026-01-27 to ' + today);
  console.log('Days of data lost: ' + Math.floor((new Date(today) - new Date('2026-01-26')) / (1000 * 60 * 60 * 24)));
  console.log('');
  console.log('Recommendation: Check for more recent backups');
} else {
  console.log('[OK] No tables affected by rollback');
}
