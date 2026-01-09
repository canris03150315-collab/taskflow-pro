// Simulate B employee's actual query
const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('Simulating B employee query...');

// B employee info
const userId = 'user-1767326481715-40lkufxrh';
const userRole = 'SUPERVISOR'; // From logs

try {
    // Get user info
    const user = db.prepare('SELECT id, username, name, role, department FROM users WHERE id = ?').get(userId);
    console.log('\n=== User Info ===');
    console.log(JSON.stringify(user, null, 2));
    
    // Build query based on role
    let query = `
      SELECT t.*,
             u.name as assigned_user_name,
             creator.name as created_by_name,
             dept.name as department_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to_user_id = u.id
      LEFT JOIN users creator ON t.created_by = creator.id
      LEFT JOIN departments dept ON t.target_department = dept.id
      WHERE 1=1
    `;
    
    const params = [];
    
    // Apply role-based filter
    if (userRole === 'EMPLOYEE') {
        console.log('\nApplying EMPLOYEE filter...');
        query += ' AND (t.assigned_to_user_id = ? OR t.assigned_to_department = ? OR (t.assigned_to_user_id IS NULL AND t.assigned_to_department IS NULL))';
        params.push(userId, user.department);
    } else if (userRole === 'SUPERVISOR') {
        console.log('\nApplying SUPERVISOR filter...');
        query += ' AND (t.target_department = ? OR t.created_by = ?)';
        params.push(user.department, userId);
    }
    // BOSS and MANAGER see all tasks
    
    // Add archive filter
    query += ' AND t.is_archived = ?';
    params.push(0);
    
    // Add ORDER BY and LIMIT
    query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    params.push(50, 0);
    
    console.log('\n=== Query ===');
    console.log(query);
    console.log('Params:', params);
    
    const tasks = db.prepare(query).all(...params);
    console.log('\n=== Results ===');
    console.log('Tasks found:', tasks.length);
    
    if (tasks.length > 0) {
        console.log('\nTasks:');
        tasks.forEach(t => {
            console.log(`- ${t.id}: ${t.title} (created_by: ${t.created_by}, target_dept: ${t.target_department})`);
        });
    } else {
        console.log('\n❌ NO TASKS FOUND!');
        console.log('\nChecking all tasks in database:');
        const allTasks = db.prepare('SELECT id, title, created_by, target_department, assigned_to_user_id, assigned_to_department FROM tasks WHERE is_archived = 0').all();
        console.log('Total tasks in DB:', allTasks.length);
        allTasks.forEach(t => {
            console.log(`- ${t.id}: ${t.title}`);
            console.log(`  created_by: ${t.created_by}`);
            console.log(`  target_department: ${t.target_department}`);
            console.log(`  assigned_to_user_id: ${t.assigned_to_user_id}`);
            console.log(`  assigned_to_department: ${t.assigned_to_department}`);
        });
    }
    
} catch (error) {
    console.error('ERROR:', error.message);
    console.error(error.stack);
}

db.close();
