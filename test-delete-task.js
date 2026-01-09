const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

// Get a task to test delete
const task = db.prepare('SELECT id, title FROM tasks LIMIT 1').get();
console.log('Test task:', task);

if (task) {
  try {
    // Test delete
    const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(task.id);
    console.log('Delete result:', result);
    console.log('SUCCESS: Delete works');
  } catch (error) {
    console.log('Delete error:', error.message);
  }
}

db.close();
