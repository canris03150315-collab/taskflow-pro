const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

// 檢查所有訊息的 channel_id
const msgs = db.prepare('SELECT id, channel_id, content FROM chat_messages').all();
console.log('All messages:');
msgs.forEach(m => {
    console.log('  ID:', m.id, 'Channel:', m.channel_id, 'Content:', m.content?.substring(0, 30));
});

// 檢查特定頻道
const channelId = 'channel-1766404216961-mnegl3igl';
const channelMsgs = db.prepare('SELECT * FROM chat_messages WHERE channel_id = ?').all(channelId);
console.log('\nMessages for channel', channelId, ':', channelMsgs.length);

db.close();
