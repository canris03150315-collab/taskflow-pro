const db = require('better-sqlite3')('/app/data/taskflow.db');
const info = db.pragma('table_info(chat_messages)');
console.log('chat_messages columns:', info.map(c => c.name).join(', '));
db.close();
