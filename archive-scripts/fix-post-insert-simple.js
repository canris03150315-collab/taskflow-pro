const fs = require('fs');

const filePath = '/app/dist/routes/announcements.js';

try {
  console.log('Fixing POST route INSERT statement...');
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Step 1: Fix the run() parameters to add images
  const oldRun = "id, title, content, priority || 'NORMAL', created_by, now, now, '[]'";
  const newRun = "id, title, content, priority || 'NORMAL', created_by, now, now, '[]', JSON.stringify(images || [])";
  
  content = content.replace(oldRun, newRun);
  
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log('SUCCESS: Fixed POST route to include images parameter');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
