const fs = require('fs');

const reportsPath = '/app/dist/routes/reports.js';
const content = fs.readFileSync(reportsPath, 'utf8');

// 檢查是否有 audit-log 路由
const hasAuditLog = content.includes('audit-log') || content.includes('getAuditLog');
const hasApprovalAuditLog = content.includes("router.get('/approval/audit-log'") || 
                            content.includes("router.get(\"/approval/audit-log\"");

console.log('=== 審核歷史路由檢查 ===');
console.log('檔案:', reportsPath);
console.log('包含 audit-log 文字:', hasAuditLog);
console.log('包含審核歷史路由:', hasApprovalAuditLog);

// 檢查資料表是否存在
try {
    const Database = require('better-sqlite3');
    const db = new Database('/app/data/taskflow.db');
    
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const hasAuditTable = tables.some(t => t.name === 'approval_audit_log');
    
    console.log('\n=== 資料表檢查 ===');
    console.log('approval_audit_log 表存在:', hasAuditTable);
    
    if (hasAuditTable) {
        const count = db.prepare('SELECT COUNT(*) as count FROM approval_audit_log').get();
        console.log('審核記錄數量:', count.count);
    }
    
    db.close();
} catch (error) {
    console.error('資料庫檢查失敗:', error.message);
}
