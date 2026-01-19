const Database = require('better-sqlite3');
const fs = require('fs');

console.log('=== 營運報表雙重認證機制診斷 ===\n');

const db = new Database('/app/data/taskflow.db');

// 1. 檢查 report_authorizations 表結構
console.log('1. Authorization 表結構:');
const tableInfo = db.prepare('PRAGMA table_info(report_authorizations)').all();
tableInfo.forEach(col => {
  console.log(`   ${col.name} (${col.type})`);
});

// 2. 檢查當前授權記錄
console.log('\n2. 當前授權記錄:');
const auths = db.prepare(`
  SELECT id, requester_id, first_approver_id, second_approver_id, 
         status, created_at, expires_at 
  FROM report_authorizations 
  ORDER BY created_at DESC 
  LIMIT 5
`).all();
console.log(`   總計: ${auths.length} 筆`);
auths.forEach(auth => {
  console.log(`   - ${auth.id}: ${auth.status} (到期: ${auth.expires_at})`);
});

// 3. 檢查報表數據
console.log('\n3. 報表數據:');
const reports = db.prepare(`
  SELECT id, user_id, type, created_at 
  FROM reports 
  ORDER BY created_at DESC 
  LIMIT 10
`).all();
console.log(`   總計: ${reports.length} 筆報表`);

// 計算一週內的報表
const oneWeekAgo = new Date();
oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
const recentReports = reports.filter(r => new Date(r.created_at) > oneWeekAgo);
console.log(`   一週內報表: ${recentReports.length} 筆`);

// 4. 檢查後端路由邏輯
console.log('\n4. 後端路由檢查:');
const reportsJs = fs.readFileSync('/app/dist/routes/reports.js', 'utf8');
const hasAuthCheck = reportsJs.includes('reportApprovalRoutes');
console.log(`   使用審核路由: ${hasAuthCheck ? '是' : '否'}`);

const approvalJs = fs.readFileSync('/app/dist/routes/report-approval-routes.js', 'utf8');
const hasStatusCheck = approvalJs.includes('approval/status');
console.log(`   有狀態檢查端點: ${hasStatusCheck ? '是' : '否'}`);

db.close();

console.log('\n=== 診斷完成 ===');
console.log('\n建議修改方案:');
console.log('1. 修改 GET /api/reports 路由，檢查報表建立時間');
console.log('2. 如果報表在 7 天內，允許作者直接查看');
console.log('3. 如果報表超過 7 天，仍需要雙重認證');
console.log('4. BOSS 和 MANAGER 始終可以查看所有報表');
