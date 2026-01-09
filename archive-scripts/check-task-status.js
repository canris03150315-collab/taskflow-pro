// Check task status after accept
const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('Checking task status after accept...');

const taskId = 'task-1767350493468-icvplvfqs';
const userId = 'user-1767326481715-40lkufxrh';

try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
    
    console.log('\n=== Task Info ===');
    console.log('ID:', task.id);
    console.log('Title:', task.title);
    console.log('Status:', task.status);
    console.log('Progress:', task.progress);
    console.log('Created by:', task.created_by);
    console.log('Assigned to user:', task.assigned_to_user_id);
    console.log('Assigned to dept:', task.assigned_to_department);
    console.log('Accepted by:', task.accepted_by_user_id);
    
    console.log('\n=== User Info ===');
    const user = db.prepare('SELECT id, username, name FROM users WHERE id = ?').get(userId);
    console.log('User ID:', user.id);
    console.log('Username:', user.username);
    console.log('Name:', user.name);
    
    console.log('\n=== Button Display Logic ===');
    console.log('task.status === "In Progress":', task.status === 'In Progress');
    console.log('task.acceptedByUserId === currentUser.id:', task.accepted_by_user_id === userId);
    console.log('Should show "回報進度" button:', task.status === 'In Progress' && task.accepted_by_user_id === userId);
    
    if (task.status !== 'In Progress') {
        console.log('\n❌ Problem: Task status is not "In Progress"');
        console.log('Expected: "In Progress"');
        console.log('Actual:', task.status);
    }
    
    if (task.accepted_by_user_id !== userId) {
        console.log('\n❌ Problem: accepted_by_user_id does not match current user');
        console.log('Expected:', userId);
        console.log('Actual:', task.accepted_by_user_id);
    }
    
    if (task.status === 'In Progress' && task.accepted_by_user_id === userId) {
        console.log('\n✅ Button should be displayed!');
        console.log('Frontend should show "回報進度" button');
    }
    
} catch (error) {
    console.error('ERROR:', error.message);
}

db.close();
