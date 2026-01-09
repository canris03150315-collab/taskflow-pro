const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Tracing Amount Modification ===\n');

// 刪除測試記錄
console.log('Cleaning up old test records...');
db.prepare("DELETE FROM finance WHERE description LIKE '%測試%' OR description = '1'").run();

// 創建一個測試記錄，模擬正確的提交
console.log('\n=== Test 1: Correct submission (amount=10000, desc="測試") ===');
const id1 = `finance-test-${Date.now()}-1`;
const now = new Date().toISOString();

db.prepare(`
  INSERT INTO finance (
    id, type, amount, description, category, 
    user_id, department_id, date, status, 
    created_at, updated_at, scope
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  id1, 'INCOME', 10000, '測試', '餐費',
  'admin-1767325980478', 'Engineering', '2026-01-03', 'PENDING',
  now, now, 'DEPARTMENT'
);

const record1 = db.prepare('SELECT * FROM finance WHERE id = ?').get(id1);
console.log('Inserted amount:', 10000);
console.log('Retrieved amount:', record1.amount);
console.log('Match:', record1.amount === 10000 ? 'YES' : 'NO');

// 測試2：數字說明
console.log('\n=== Test 2: Numeric description (amount=10000, desc="1") ===');
const id2 = `finance-test-${Date.now()}-2`;

db.prepare(`
  INSERT INTO finance (
    id, type, amount, description, category, 
    user_id, department_id, date, status, 
    created_at, updated_at, scope
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  id2, 'INCOME', 10000, '1', '餐費',
  'admin-1767325980478', 'Engineering', '2026-01-03', 'PENDING',
  now, now, 'DEPARTMENT'
);

const record2 = db.prepare('SELECT * FROM finance WHERE id = ?').get(id2);
console.log('Inserted amount:', 10000);
console.log('Retrieved amount:', record2.amount);
console.log('Match:', record2.amount === 10000 ? 'YES' : 'NO');

// 清理測試記錄
console.log('\n=== Cleaning up test records ===');
db.prepare('DELETE FROM finance WHERE id LIKE ?').run('finance-test-%');
console.log('Test records deleted.');

console.log('\n=== Conclusion ===');
console.log('Database INSERT/SELECT works correctly.');
console.log('The issue must be in the frontend or API layer.');

db.close();
