const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== 診斷授權問題 ===\n');

// 1. 查詢所有授權記錄
console.log('1. 所有授權記錄：');
const allAuths = db.prepare(`
  SELECT id, requester_id, first_approver_id, is_active, 
         first_approved_at, authorized_at, expires_at, created_at
  FROM report_authorizations
  ORDER BY created_at DESC
  LIMIT 10
`).all();

allAuths.forEach(auth => {
  console.log(`  ID: ${auth.id}`);
  console.log(`  申請者: ${auth.requester_id}`);
  console.log(`  審核者: ${auth.first_approver_id}`);
  console.log(`  是否激活: ${auth.is_active}`);
  console.log(`  審核時間: ${auth.first_approved_at || '未審核'}`);
  console.log(`  授權時間: ${auth.authorized_at || '未授權'}`);
  console.log(`  過期時間: ${auth.expires_at || '無'}`);
  console.log(`  創建時間: ${auth.created_at}`);
  console.log('  ---');
});

// 2. 查詢激活的授權
console.log('\n2. 激活的授權記錄：');
const activeAuths = db.prepare(`
  SELECT * FROM report_authorizations
  WHERE is_active = 1
`).all();

console.log(`  總數: ${activeAuths.length}`);
activeAuths.forEach(auth => {
  console.log(`  申請者: ${auth.requester_id}, 過期時間: ${auth.expires_at}`);
});

// 3. 查詢待審核的記錄
console.log('\n3. 待審核的記錄：');
const pendingAuths = db.prepare(`
  SELECT * FROM report_authorizations
  WHERE is_active = 0 AND first_approved_at = ''
`).all();

console.log(`  總數: ${pendingAuths.length}`);
pendingAuths.forEach(auth => {
  console.log(`  申請者: ${auth.requester_id}, 審核者: ${auth.first_approver_id}`);
});

db.close();
console.log('\n=== 診斷完成 ===');
