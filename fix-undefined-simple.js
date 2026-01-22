const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Fixing阿德 and 翔哥 undefined items ===\n');

const today = new Date().toISOString().split('T')[0];

// Get阿德's record
const adeId = 'user-1767674246285-zcacyuf86';
const xianggeId = 'user-1767674494450-bnl3nau1f';

const correctItems = [
  { text: '下班前工作日志回报', completed: false },
  { text: '每天阅读公司安全规范表', completed: false },
  { text: '下班注意门禁管制，大门确实关闭后再离开', completed: false }
];

// Fix阿德
const adeRecord = db.prepare('SELECT * FROM routine_records WHERE user_id = ? AND date = ?').get(adeId, today);
if (adeRecord) {
  const oldItems = JSON.parse(adeRecord.completed_items);
  const newItems = correctItems.map((item, i) => ({
    text: item.text,
    completed: oldItems[i] ? oldItems[i].completed : false
  }));
  
  db.prepare('UPDATE routine_records SET completed_items = ? WHERE id = ?').run(
    JSON.stringify(newItems),
    adeRecord.id
  );
  console.log('✅ Fixed阿德');
} else {
  console.log('⚠️  阿德 no record today');
}

// Fix 翔哥
const xianggeRecord = db.prepare('SELECT * FROM routine_records WHERE user_id = ? AND date = ?').get(xianggeId, today);
if (xianggeRecord) {
  const oldItems = JSON.parse(xianggeRecord.completed_items);
  const newItems = correctItems.map((item, i) => ({
    text: item.text,
    completed: oldItems[i] ? oldItems[i].completed : false
  }));
  
  db.prepare('UPDATE routine_records SET completed_items = ? WHERE id = ?').run(
    JSON.stringify(newItems),
    xianggeRecord.id
  );
  console.log('✅ Fixed 翔哥');
} else {
  console.log('⚠️  翔哥 no record today');
}

console.log('\nDone!');
db.close();
