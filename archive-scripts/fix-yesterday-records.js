const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Fixing yesterday (2026-01-21) undefined items ===\n');

const yesterday = '2026-01-21';

// 阿德 and 翔哥的 ID
const adeId = 'user-1767674246285-zcacyuf86';
const xianggeId = 'user-1767674494450-bnl3nau1f';

const correctItems = [
  { text: '下班前工作日志回报', completed: false },
  { text: '每天阅读公司安全规范表', completed: false },
  { text: '下班注意门禁管制，大门确实关闭后再离开', completed: false }
];

// Fix 阿德
const adeRecord = db.prepare('SELECT * FROM routine_records WHERE user_id = ? AND date = ?').get(adeId, yesterday);
if (adeRecord && adeRecord.completed_items) {
  const oldItems = JSON.parse(adeRecord.completed_items);
  console.log('阿德 old items:', oldItems);
  
  const newItems = correctItems.map((item, i) => ({
    text: item.text,
    completed: oldItems[i] ? oldItems[i].completed : false
  }));
  
  db.prepare('UPDATE routine_records SET completed_items = ? WHERE id = ?').run(
    JSON.stringify(newItems),
    adeRecord.id
  );
  console.log('✅ Fixed 阿德');
  console.log('New items:', newItems);
} else {
  console.log('⚠️  阿德 no record on', yesterday);
}

// Fix 翔哥
const xianggeRecord = db.prepare('SELECT * FROM routine_records WHERE user_id = ? AND date = ?').get(xianggeId, yesterday);
if (xianggeRecord && xianggeRecord.completed_items) {
  const oldItems = JSON.parse(xianggeRecord.completed_items);
  console.log('\n翔哥 old items:', oldItems);
  
  const newItems = correctItems.map((item, i) => ({
    text: item.text,
    completed: oldItems[i] ? oldItems[i].completed : false
  }));
  
  db.prepare('UPDATE routine_records SET completed_items = ? WHERE id = ?').run(
    JSON.stringify(newItems),
    xianggeRecord.id
  );
  console.log('✅ Fixed 翔哥');
  console.log('New items:', newItems);
} else {
  console.log('⚠️  翔哥 no record on', yesterday);
}

console.log('\n✅ Done!');
db.close();
