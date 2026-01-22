const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('Fixing undefined items for 2026-01-21\n');

const yesterday = '2026-01-21';
const adeId = 'user-1767674246285-zcacyuf86';
const xianggeId = 'user-1767674494450-bnl3nau1f';

const correctItems = [
  { text: '\u4e0b\u73ed\u524d\u5de5\u4f5c\u65e5\u5fd7\u56de\u62a5', completed: false },
  { text: '\u6bcf\u5929\u9605\u8bfb\u516c\u53f8\u5b89\u5168\u89c4\u8303\u8868', completed: false },
  { text: '\u4e0b\u73ed\u6ce8\u610f\u95e8\u7981\u7ba1\u5236\uff0c\u5927\u95e8\u786e\u5b9e\u5173\u95ed\u540e\u518d\u79bb\u5f00', completed: false }
];

function fixUser(userId, userName) {
  const record = db.prepare('SELECT * FROM routine_records WHERE user_id = ? AND date = ?').get(userId, yesterday);
  if (record && record.completed_items) {
    const oldItems = JSON.parse(record.completed_items);
    const newItems = correctItems.map((item, i) => ({
      text: item.text,
      completed: oldItems[i] ? oldItems[i].completed : false
    }));
    
    db.prepare('UPDATE routine_records SET completed_items = ? WHERE id = ?').run(
      JSON.stringify(newItems),
      record.id
    );
    console.log('Fixed ' + userName);
  }
}

fixUser(adeId, 'Ade');
fixUser(xianggeId, 'Xiangge');

console.log('Done!');
db.close();
