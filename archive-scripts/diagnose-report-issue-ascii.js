const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Diagnose Report Issue ===\n');

// 1. Check reports table structure
console.log('1. Check reports table structure:');
const tableInfo = db.prepare("PRAGMA table_info(reports)").all();
console.log('Columns:', tableInfo.map(c => c.name).join(', '));
console.log('');

// 2. Check all report records (sorted by date)
console.log('2. Check all report records:');
const allReports = db.prepare(`
  SELECT 
    id,
    user_id,
    type,
    created_at,
    date(created_at) as report_date
  FROM reports 
  ORDER BY created_at DESC
  LIMIT 20
`).all();

console.log(`Total ${allReports.length} records (showing last 20):`);
allReports.forEach(r => {
  console.log(`  - ID: ${r.id.substring(0, 20)}... | Date: ${r.report_date} | Created: ${r.created_at}`);
});
console.log('');

// 3. Check reports from Jan 22-25
console.log('3. Check reports from 2026-01-22 to 2026-01-25:');
const jan22to25 = db.prepare(`
  SELECT 
    id,
    user_id,
    created_at,
    date(created_at) as report_date
  FROM reports 
  WHERE date(created_at) BETWEEN '2026-01-22' AND '2026-01-25'
  ORDER BY created_at
`).all();

if (jan22to25.length === 0) {
  console.log('  [X] NO REPORTS FOUND for Jan 22-25!');
} else {
  console.log(`  [OK] Found ${jan22to25.length} records:`);
  jan22to25.forEach(r => {
    console.log(`    - ${r.report_date}: ${r.id.substring(0, 20)}...`);
  });
}
console.log('');

// 4. Check today's reports
const today = new Date().toISOString().split('T')[0];
console.log(`4. Check today's reports (${today}):`);
const todayReports = db.prepare(`
  SELECT 
    id,
    user_id,
    created_at,
    date(created_at) as report_date
  FROM reports 
  WHERE date(created_at) = ?
  ORDER BY created_at DESC
`).get(today);

if (todayReports) {
  console.log(`  [OK] Found today's report: ${todayReports.id.substring(0, 20)}...`);
} else {
  console.log('  [-] No reports for today yet');
}
console.log('');

// 5. Check last 7 days report count
console.log('5. Check last 7 days report count:');
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

const last7Days = db.prepare(`
  SELECT 
    date(created_at) as report_date,
    COUNT(*) as count
  FROM reports 
  WHERE date(created_at) >= ?
  GROUP BY date(created_at)
  ORDER BY report_date DESC
`).all(sevenDaysAgoStr);

console.log(`From ${sevenDaysAgoStr} to today:`);
last7Days.forEach(r => {
  console.log(`  - ${r.report_date}: ${r.count} records`);
});
console.log('');

console.log('=== Diagnosis Complete ===');
db.close();
