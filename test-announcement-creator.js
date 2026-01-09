const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Testing Announcement Creator Display ===\n');

const announcement = db.prepare('SELECT * FROM announcements ORDER BY created_at DESC LIMIT 1').get();

console.log('Raw database data:');
console.log(JSON.stringify(announcement, null, 2));

console.log('\n=== After parsing (simulating API response) ===');

function parseAnnouncementJson(ann) {
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
}

const parsed = parseAnnouncementJson(announcement);

console.log('Parsed announcement:');
console.log(JSON.stringify(parsed, null, 2));

console.log('\n=== User lookup ===');
const creator = db.prepare('SELECT id, username, name FROM users WHERE id = ?').get(parsed.createdBy);
console.log('Creator ID:', parsed.createdBy);
console.log('Creator data:', creator);

console.log('\n=== Verification ===');
console.log('Has createdBy field:', !!parsed.createdBy);
console.log('Has created_by field:', !!parsed.created_by);
console.log('createdBy value:', parsed.createdBy);
console.log('Creator name:', creator ? creator.name : 'NOT FOUND');

db.close();
