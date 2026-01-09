// Check task_timeline records
const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('Checking task_timeline records...');

const taskId = 'task-1767350493468-icvplvfqs';

try {
    // Check task_timeline table
    const timeline = db.prepare('SELECT * FROM task_timeline WHERE task_id = ? ORDER BY timestamp DESC').all(taskId);
    
    console.log('\n=== Task Timeline Records ===');
    console.log('Total records:', timeline.length);
    
    if (timeline.length > 0) {
        timeline.forEach((entry, idx) => {
            console.log(`\n--- Record ${idx + 1} ---`);
            console.log('ID:', entry.id);
            console.log('User ID:', entry.user_id);
            console.log('Content:', entry.content);
            console.log('Progress:', entry.progress);
            console.log('Timestamp:', entry.timestamp);
        });
    } else {
        console.log('❌ No timeline records found!');
    }
    
    // Check task progress
    const task = db.prepare('SELECT id, title, progress, status FROM tasks WHERE id = ?').get(taskId);
    console.log('\n=== Task Info ===');
    console.log('Title:', task.title);
    console.log('Progress:', task.progress);
    console.log('Status:', task.status);
    
} catch (error) {
    console.error('ERROR:', error.message);
}

db.close();
