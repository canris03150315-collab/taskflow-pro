const Database = require('better-sqlite3');

const dbPath = '/app/data/taskflow.db';
const db = new Database(dbPath);

try {
  console.log('=== Diagnosing Announcements Images ===\n');
  
  // Get all announcements
  const announcements = db.prepare('SELECT id, title, images, created_at FROM announcements ORDER BY created_at DESC LIMIT 5').all();
  
  console.log('Total announcements:', announcements.length);
  console.log('\nRecent announcements:\n');
  
  announcements.forEach((ann, index) => {
    console.log(`${index + 1}. ${ann.title}`);
    console.log('   ID:', ann.id);
    console.log('   Created:', ann.created_at);
    console.log('   Images field type:', typeof ann.images);
    console.log('   Images field value:', ann.images);
    
    if (ann.images) {
      try {
        const parsed = JSON.parse(ann.images);
        console.log('   Parsed images array length:', parsed.length);
        if (parsed.length > 0) {
          console.log('   First image preview:', parsed[0].substring(0, 50) + '...');
        }
      } catch (e) {
        console.log('   ERROR parsing images:', e.message);
      }
    }
    console.log('');
  });
  
  console.log('=== Diagnosis Complete ===');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
} finally {
  db.close();
}
