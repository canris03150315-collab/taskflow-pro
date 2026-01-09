const fs = require('fs');

const filePath = '/app/dist/routes/announcements.js';

try {
  console.log('Fixing POST route to include images...');
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix INSERT statement to include images column
  const oldInsert = "dbCall(db, 'prepare', 'INSERT INTO announcements (id, title, content, priority, created_by, created_at, updated_at, read_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(\n      id, title, content, priority || 'NORMAL', created_by, now, now, '[]'\n    );";
  
  const newInsert = "dbCall(db, 'prepare', 'INSERT INTO announcements (id, title, content, priority, created_by, created_at, updated_at, read_by, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(\n      id, title, content, priority || 'NORMAL', created_by, now, now, '[]', JSON.stringify(images || [])\n    );";
  
  content = content.replace(oldInsert, newInsert);
  
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log('SUCCESS: Fixed POST route to include images');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
