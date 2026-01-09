const fs = require('fs');

const filePath = '/app/dist/routes/announcements.js';

try {
  console.log('Applying complete announcements images fix...');
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 1. Fix parseAnnouncementJson to parse images
  const oldParseFunction = `function parseAnnouncementJson(ann) {
  if (!ann) return ann;

  try {
    ann.read_by = ann.read_by ? JSON.parse(ann.read_by) : [];
  } catch (e) {
    ann.read_by = [];
  }

  ann.createdBy = ann.created_by;
  ann.createdAt = ann.created_at;
  ann.updatedAt = ann.updated_at;
  ann.readBy = ann.read_by;

  return ann;
}`;

  const newParseFunction = `function parseAnnouncementJson(ann) {
  if (!ann) return ann;

  try {
    ann.read_by = ann.read_by ? JSON.parse(ann.read_by) : [];
  } catch (e) {
    ann.read_by = [];
  }

  try {
    ann.images = ann.images ? JSON.parse(ann.images) : [];
  } catch (e) {
    ann.images = [];
  }

  ann.createdBy = ann.created_by;
  ann.createdAt = ann.created_at;
  ann.updatedAt = ann.updated_at;
  ann.readBy = ann.read_by;

  return ann;
}`;

  if (content.includes(oldParseFunction)) {
    content = content.replace(oldParseFunction, newParseFunction);
    console.log('SUCCESS: Fixed parseAnnouncementJson');
  } else {
    console.log('SKIP: parseAnnouncementJson already fixed or not found');
  }
  
  // 2. Fix PUT route to support images
  const oldPutExtract = "const { title, content, priority } = req.body;";
  const newPutExtract = "const { title, content, priority, images } = req.body;";
  
  if (content.includes(oldPutExtract) && content.includes("router.put('/:id'")) {
    content = content.replace(oldPutExtract, newPutExtract);
    console.log('SUCCESS: Fixed PUT route to extract images');
  }
  
  // 3. Fix PUT route UPDATE statement
  const oldUpdate = "UPDATE announcements SET title = ?, content = ?, priority = ?, updated_at = ? WHERE id = ?";
  const newUpdate = "UPDATE announcements SET title = ?, content = ?, priority = ?, images = ?, updated_at = ? WHERE id = ?";
  
  if (content.includes(oldUpdate)) {
    content = content.replace(oldUpdate, newUpdate);
    console.log('SUCCESS: Fixed PUT route UPDATE statement');
  }
  
  // 4. Fix PUT route run() parameters
  const oldPutRun = "title, content, priority, now, id";
  const newPutRun = "title, content, priority, JSON.stringify(images || []), now, id";
  
  if (content.includes(oldPutRun) && content.includes("UPDATE announcements")) {
    content = content.replace(oldPutRun, newPutRun);
    console.log('SUCCESS: Fixed PUT route run() parameters');
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log('\nSUCCESS: Complete announcements images fix applied');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
