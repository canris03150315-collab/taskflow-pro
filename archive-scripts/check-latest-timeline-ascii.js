// Check latest timeline records with full content (Pure ASCII)
const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('Checking latest timeline records...');

const taskId = 'task-1767350493468-icvplvfqs';

try {
    const timeline = db.prepare('SELECT * FROM task_timeline WHERE task_id = ? ORDER BY timestamp DESC LIMIT 3').all(taskId);
    
    console.log('\n=== Latest 3 Timeline Records ===');
    
    if (timeline.length > 0) {
        timeline.forEach((entry, idx) => {
            console.log(`\n--- Record ${idx + 1} (Latest) ---`);
            console.log('ID:', entry.id);
            console.log('User ID:', entry.user_id);
            console.log('Content:', entry.content);
            console.log('Progress:', entry.progress);
            console.log('Timestamp:', entry.timestamp);
        });
        
        const latestEntry = timeline[0];
        console.log('\n=== Analysis ===');
        console.log('Latest content:', latestEntry.content);
        console.log('Content length:', latestEntry.content.length);
        
        const contentParts = latestEntry.content.split(';').map(s => s.trim()).filter(s => s);
        console.log('Number of parts:', contentParts.length);
        
        contentParts.forEach((part, i) => {
            console.log(`Part ${i + 1}: ${part}`);
        });
        
        if (contentParts.length === 1) {
            console.log('\nPROBLEM: Only one part found (likely only auto-generated)');
        } else {
            console.log('\nOK: Multiple parts found');
        }
    } else {
        console.log('No timeline records found!');
    }
    
} catch (error) {
    console.error('ERROR:', error.message);
}

db.close();
