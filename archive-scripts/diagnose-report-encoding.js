const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Checking Reports Table ===');

// 檢查最近 5 筆報表
const reports = db.prepare(`
  SELECT id, type, created_at, user_id
  FROM reports 
  ORDER BY created_at DESC 
  LIMIT 5
`).all();

console.log('\nLatest 5 Reports:');
reports.forEach((r, i) => {
  console.log(`\n${i + 1}. ID: ${r.id}`);
  console.log(`   Type: ${r.type}`);
  console.log(`   Type (hex): ${Buffer.from(r.type).toString('hex')}`);
  console.log(`   Created: ${r.created_at}`);
  console.log(`   User: ${r.user_id}`);
});

// 檢查 type 欄位的所有唯一值
const types = db.prepare('SELECT DISTINCT type FROM reports').all();
console.log('\n\nAll Distinct Types:');
types.forEach(t => {
  console.log(`  - ${t.type} (hex: ${Buffer.from(t.type).toString('hex')})`);
});

db.close();
console.log('\n=== Diagnosis Complete ===');
