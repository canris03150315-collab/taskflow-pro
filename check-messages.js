const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

const msgs = db.prepare('SELECT * FROM chat_messages LIMIT 10').all();
console.log('Messages in DB:', msgs.length);
console.log(JSON.stringify(msgs, null, 2));

const channels = db.prepare('SELECT * FROM chat_channels').all();
console.log('Channels in DB:', channels.length);
console.log(JSON.stringify(channels, null, 2));

db.close();
