const fs = require('fs');

const filePath = '/app/dist/routes/announcements.js';

try {
  console.log('Fixing announcements.js to support images...');
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 1. Fix parseAnnouncementJson function to parse images
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

  content = content.replace(oldParseFunction, newParseFunction);
  
  // 2. Fix POST route to accept images
  content = content.replace(
    /const { title, content, priority, createdBy } = req\.body;/g,
    'const { title, content, priority, createdBy, images } = req.body;'
  );
  
  // 3. Fix POST route INSERT to include images
  content = content.replace(
    /INSERT INTO announcements \(id, title, content, priority, created_at, updated_at, created_by, read_by\) VALUES \(\?, \?, \?, \?, \?, \?, \?, \?\)/g,
    'INSERT INTO announcements (id, title, content, priority, created_at, updated_at, created_by, read_by, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  
  // 4. Fix POST route run() to include images JSON
  content = content.replace(
    /\.run\(\s*id,\s*title,\s*content,\s*priority \|\| 'NORMAL',\s*now,\s*now,\s*createdBy,\s*JSON\.stringify\(\[\]\)\s*\);/g,
    '.run(id, title, content, priority || \'NORMAL\', now, now, createdBy, JSON.stringify([]), JSON.stringify(images || []));'
  );
  
  // 5. Fix PUT route to accept images
  content = content.replace(
    /router\.put\('\/mark-read\/:id', authenticateToken, async \(req, res\) => {[\s\S]*?}\);[\s\S]*?router\.put\('\/:id', authenticateToken, async \(req, res\) => {[\s\S]*?const { title, content, priority } = req\.body;/g,
    (match) => {
      return match.replace(
        /const { title, content, priority } = req\.body;/,
        'const { title, content, priority, images } = req.body;'
      );
    }
  );
  
  // 6. Fix PUT route UPDATE to include images
  content = content.replace(
    /UPDATE announcements SET title = \?, content = \?, priority = \?, updated_at = \? WHERE id = \?/g,
    'UPDATE announcements SET title = ?, content = ?, priority = ?, images = ?, updated_at = ? WHERE id = ?'
  );
  
  // 7. Fix PUT route run() to include images JSON
  content = content.replace(
    /\.run\(\s*title,\s*content,\s*priority,\s*now,\s*id\s*\);/g,
    '.run(title, content, priority, JSON.stringify(images || []), now, id);'
  );
  
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log('SUCCESS: Fixed announcements.js');
  console.log('Changes applied:');
  console.log('  - Added images parsing in parseAnnouncementJson');
  console.log('  - POST route now accepts and stores images');
  console.log('  - PUT route now accepts and updates images');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
