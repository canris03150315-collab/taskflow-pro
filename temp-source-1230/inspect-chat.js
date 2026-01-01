const better_sqlite3 = require('better-sqlite3');
const path = require('path');

try {
    const db = new better_sqlite3('/app/data/taskflow.db');
    
    console.log('--- Chat Channels ---');
    const channels = db.prepare("SELECT id, type, name, participants, updated_at FROM chat_channels").all();
    channels.forEach(c => {
        console.log(`ID: ${c.id}, Type: ${c.type}, Name: ${c.name}, Updated: ${c.updated_at}`);
        console.log(`Participants: ${c.participants}`);
        console.log('---');
    });
    
    db.close();
} catch (error) {
    console.error('Error:', error);
}
