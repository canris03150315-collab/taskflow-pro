const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Checking KOL Status Color ===\n');

const profiles = db.prepare('SELECT platform_account, status, status_color FROM kol_profiles ORDER BY platform_account').all();

console.log('Total profiles:', profiles.length);
console.log('\nStatus breakdown:');

profiles.forEach((p, i) => {
  console.log(`${i + 1}. ${p.platform_account}`);
  console.log(`   status: ${p.status || '(null)'}`);
  console.log(`   status_color: ${p.status_color || '(null)'}`);
});

const colorCounts = {
  green: profiles.filter(p => p.status_color === 'green').length,
  yellow: profiles.filter(p => p.status_color === 'yellow').length,
  red: profiles.filter(p => p.status_color === 'red').length,
  null: profiles.filter(p => !p.status_color).length
};

console.log('\nSummary:');
console.log('- Green (正常合作):', colorCounts.green);
console.log('- Yellow (暫停合作):', colorCounts.yellow);
console.log('- Red (不再合作):', colorCounts.red);
console.log('- Null (未設置):', colorCounts.null);

db.close();
