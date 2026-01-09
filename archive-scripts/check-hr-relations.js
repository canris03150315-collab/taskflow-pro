const db = require('./node_modules/better-sqlite3')('/app/data/taskflow.db');

const deptId = 'HR';

console.log('=== Checking HR department relations ===\n');

// Get all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();

console.log('Checking all tables for department_id or department references...\n');

tables.forEach(table => {
  try {
    // Get table schema
    const schema = db.prepare(`PRAGMA table_info(${table.name})`).all();
    const hasDeptId = schema.some(col => col.name === 'department_id' || col.name === 'department');
    
    if (hasDeptId) {
      // Check for department_id
      let count = 0;
      try {
        const result = db.prepare(`SELECT COUNT(*) as count FROM ${table.name} WHERE department_id = ?`).get(deptId);
        count = result.count;
      } catch (e) {
        // Try department column
        try {
          const result = db.prepare(`SELECT COUNT(*) as count FROM ${table.name} WHERE department = ?`).get(deptId);
          count = result.count;
        } catch (e2) {}
      }
      
      if (count > 0) {
        console.log(`✗ ${table.name}: ${count} records`);
        
        // Show sample records
        try {
          const samples = db.prepare(`SELECT * FROM ${table.name} WHERE department_id = ? LIMIT 3`).all(deptId);
          samples.forEach(s => console.log('  ', JSON.stringify(s)));
        } catch (e) {
          try {
            const samples = db.prepare(`SELECT * FROM ${table.name} WHERE department = ? LIMIT 3`).all(deptId);
            samples.forEach(s => console.log('  ', JSON.stringify(s)));
          } catch (e2) {}
        }
      } else {
        console.log(`✓ ${table.name}: 0 records`);
      }
    }
  } catch (e) {
    // Skip tables with errors
  }
});

db.close();
