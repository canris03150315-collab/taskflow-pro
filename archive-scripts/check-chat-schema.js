const better_sqlite3 = require('better-sqlite3');
const path = require('path');

try {
    const db = new better_sqlite3('/app/data/taskflow.db');
    
    console.log('--- Table: chat_channels ---');
    const channelsColumns = db.prepare("PRAGMA table_info(chat_channels)").all();
    console.log(JSON.stringify(channelsColumns, null, 2));
    
    console.log('\n--- Table: chat_messages ---');
    const messagesColumns = db.prepare("PRAGMA table_info(chat_messages)").all();
    console.log(JSON.stringify(messagesColumns, null, 2));
    
    db.close();
} catch (error) {
    console.error('Error:', error);
}
