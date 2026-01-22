#!/bin/bash
# 測試後端是否返回 NANA 的排班數據

echo "Testing schedule API for NANA..."

# 使用 Node.js 直接查詢數據庫
docker exec taskflow-pro node -e "
const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

// 1. 找 NANA
const nana = db.prepare(\"SELECT id, name, department FROM users WHERE name = 'NANA'\").get();
console.log('1. NANA user:', JSON.stringify(nana));

if (!nana) {
  console.log('ERROR: NANA not found');
  process.exit(1);
}

// 2. 查詢 NANA 的 2026年1月排班
const schedule = db.prepare(\`
  SELECT * FROM schedules 
  WHERE user_id = ? AND year = 2026 AND month = 1
\`).get(nana.id);

console.log('2. NANA Jan 2026 schedule:', JSON.stringify(schedule, null, 2));

if (schedule) {
  console.log('3. Department ID:', schedule.department_id);
  console.log('4. Status:', schedule.status);
  console.log('5. Selected days:', schedule.selected_days);
}

// 3. 查詢 DEPT_63 的所有 2026年1月排班
const dept63Schedules = db.prepare(\`
  SELECT s.id, s.user_id, s.department_id, s.status, u.name 
  FROM schedules s 
  JOIN users u ON s.user_id = u.id 
  WHERE s.department_id = 'DEPT_63' AND s.year = 2026 AND s.month = 1
\`).all();

console.log('6. All DEPT_63 Jan 2026 schedules:');
dept63Schedules.forEach(s => {
  console.log('  -', s.name, '(status:', s.status + ')');
});

db.close();
"
