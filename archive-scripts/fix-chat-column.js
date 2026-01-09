const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

try {
    db.exec('ALTER TABLE chat_channels ADD COLUMN last_message_id TEXT');
    console.log('Column last_message_id added!');
} catch (e) {
    if (e.message.includes('duplicate column')) {
        console.log('Column already exists');
    } else {
        console.error('Error:', e.message);
    }
}

db.close();
