const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Testing Announcement API Response Format ===\n');

const announcements = db.prepare('SELECT * FROM announcements ORDER BY created_at DESC').all();

console.log('Raw database data:');
console.log(JSON.stringify(announcements[0], null, 2));

console.log('\n=== After parsing (simulating API response) ===');

function parseAnnouncementJson(ann) {
  if (!ann) return ann;
  
  try {
    ann.read_by = ann.read_by ? JSON.parse(ann.read_by) : [];
  } catch (e) {
    ann.read_by = [];
  }
  
  return ann;
}

const parsed = announcements.map(parseAnnouncementJson);

console.log('Parsed announcement:');
console.log(JSON.stringify(parsed[0], null, 2));

console.log('\n=== Verification ===');
console.log('read_by type:', typeof parsed[0].read_by);
console.log('read_by is Array:', Array.isArray(parsed[0].read_by));
console.log('read_by length:', parsed[0].read_by.length);
console.log('read_by content:', parsed[0].read_by);

console.log('\n=== User lookup ===');
const creator = db.prepare('SELECT id, username, name FROM users WHERE id = ?').get(parsed[0].created_by);
console.log('Creator:', creator);

db.close();
