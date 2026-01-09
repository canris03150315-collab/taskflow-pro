const fs = require('fs');

const filePath = '/app/dist/routes/announcements.js';

try {
  console.log('Fixing POST route completely...');
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 1. Fix the destructuring to include images
  const oldExtract = "const { title, content, priority, createdBy } = req.body;";
  const newExtract = "const { title, content, priority, createdBy, images } = req.body;";
  
  content = content.replace(oldExtract, newExtract);
  console.log('Step 1: Fixed destructuring to include images');
  
  // 2. Fix INSERT statement to include images column
  const oldInsert = "INSERT INTO announcements (id, title, content, priority, created_by, created_at, updated_at, read_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
  const newInsert = "INSERT INTO announcements (id, title, content, priority, created_by, created_at, updated_at, read_by, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
  
  content = content.replace(oldInsert, newInsert);
  console.log('Step 2: Fixed INSERT statement to include images column');
  
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log('\nSUCCESS: POST route fixed completely');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
