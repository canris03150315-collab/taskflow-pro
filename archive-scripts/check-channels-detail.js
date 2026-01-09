const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

// 檢查所有頻道
const channels = db.prepare('SELECT * FROM chat_channels').all();
console.log('All channels:');
channels.forEach(ch => {
    console.log('  ID:', ch.id);
    console.log('  Type:', ch.type);
    console.log('  Participants:', ch.participants);
    console.log('  ---');
});

// 檢查所有用戶
const users = db.prepare('SELECT id, name FROM users').all();
console.log('\nAll users:');
users.forEach(u => {
    console.log('  ID:', u.id, 'Name:', u.name);
});

db.close();
