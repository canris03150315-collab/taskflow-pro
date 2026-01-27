const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== 診斷工作報表問題 ===\n');

// 1. 檢查 reports 表結構
console.log('1. 檢查 reports 表結構：');
const tableInfo = db.prepare("PRAGMA table_info(reports)").all();
console.log('欄位列表:', tableInfo.map(c => c.name).join(', '));
console.log('');

// 2. 檢查所有報表記錄（按日期排序）
console.log('2. 檢查所有報表記錄：');
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

console.log(`總共 ${allReports.length} 筆記錄（顯示最近 20 筆）：`);
allReports.forEach(r => {
  console.log(`  - ID: ${r.id.substring(0, 20)}... | 日期: ${r.report_date} | 創建時間: ${r.created_at}`);
});
console.log('');

// 3. 檢查 1月22-25日的報表
console.log('3. 檢查 2026-01-22 到 2026-01-25 的報表：');
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
  console.log('  ❌ 沒有找到 1/22-1/25 的報表記錄！');
} else {
  console.log(`  ✓ 找到 ${jan22to25.length} 筆記錄：`);
  jan22to25.forEach(r => {
    console.log(`    - ${r.report_date}: ${r.id.substring(0, 20)}...`);
  });
}
console.log('');

// 4. 檢查今天的報表
const today = new Date().toISOString().split('T')[0];
console.log(`4. 檢查今天 (${today}) 的報表：`);
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
  console.log(`  ✓ 找到今天的報表: ${todayReports.id.substring(0, 20)}...`);
} else {
  console.log('  - 今天還沒有報表');
}
console.log('');

// 5. 檢查最近 7 天的報表數量
console.log('5. 檢查最近 7 天的報表數量：');
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

console.log(`從 ${sevenDaysAgoStr} 到今天的報表：`);
last7Days.forEach(r => {
  console.log(`  - ${r.report_date}: ${r.count} 筆`);
});
console.log('');

console.log('=== 診斷完成 ===');
db.close();
