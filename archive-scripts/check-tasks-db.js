const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('Checking tasks table...');

try {
    // Check all tasks
    const tasks = db.prepare(`
        SELECT id, title, assigned_to_user_id, assigned_to_department, target_department, created_by
        FROM tasks
        ORDER BY created_at DESC
        LIMIT 10
    `).all();
    
    console.log('Recent tasks:', JSON.stringify(tasks, null, 2));
    
    // Check public tasks (no assignment)
    const publicTasks = db.prepare(`
        SELECT id, title, created_by
        FROM tasks
        WHERE assigned_to_user_id IS NULL AND assigned_to_department IS NULL
    `).all();
    
    console.log('\nPublic tasks (no assignment):', JSON.stringify(publicTasks, null, 2));
    
} catch (error) {
    console.error('ERROR:', error.message);
}

db.close();
