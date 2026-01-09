// Diagnose tasks query issue
const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('Diagnosing tasks query...');

// Simulate EMPLOYEE query
const userId = 'user-1767326481715-40lkufxrh';
const userDept = 'dept-1';

try {
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
    
    // EMPLOYEE permission logic
    query += ' AND (t.assigned_to_user_id = ? OR t.assigned_to_department = ? OR (t.assigned_to_user_id IS NULL AND t.assigned_to_department IS NULL))';
    params.push(userId, userDept);
    
    // Archive filter
    query += ' AND t.is_archived = ?';
    params.push(0);
    
    // Add ORDER BY and LIMIT
    query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    params.push(50, 0);
    
    console.log('\n=== Main Query ===');
    console.log(query);
    console.log('Params:', params);
    
    const tasks = db.prepare(query).all(...params);
    console.log('\nTasks found:', tasks.length);
    
    // Test count query
    const countQuery = query.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as total FROM').replace(/ORDER BY.*$/, '');
    console.log('\n=== Count Query ===');
    console.log(countQuery);
    console.log('Count Params:', params.slice(0, -2));
    
    const countResult = db.prepare(countQuery).get(...params.slice(0, -2));
    console.log('\nCount Result:', countResult);
    
    if (countResult) {
        console.log('Total:', countResult.total);
    } else {
        console.log('ERROR: countResult is undefined!');
    }
    
} catch (error) {
    console.error('ERROR:', error.message);
    console.error(error.stack);
}

db.close();
