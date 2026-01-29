const Database = require('better-sqlite3');

console.log('=== Check Production Database (Shared by Both Environments) ===\n');

const db = new Database('/app/data/taskflow.db');

// Since test and production share the same backend database,
// we need to check if there are any announcements that might be visible only on test frontend

console.log('Test 1: All announcements in database');
const allAnn = db.prepare('SELECT * FROM announcements ORDER BY created_at DESC').all();

console.log('Total announcements:', allAnn.length);
console.log('\nAll announcements:');
allAnn.forEach((ann, i) => {
  const creator = db.prepare('SELECT name FROM users WHERE id = ?').get(ann.created_by);
  console.log(`\n${i + 1}. "${ann.title}"`);
  console.log(`   ID: ${ann.id}`);
  console.log(`   Priority: ${ann.priority}`);
  console.log(`   Created: ${ann.created_at}`);
  console.log(`   By: ${creator?.name || ann.created_by}`);
  console.log(`   Content: ${ann.content.substring(0, 100)}${ann.content.length > 100 ? '...' : ''}`);
  
  // Check read_by
  try {
    const readBy = JSON.parse(ann.read_by || '[]');
    console.log(`   Read by: ${readBy.length} users`);
  } catch (e) {
    console.log(`   Read by: Error parsing`);
  }
});

// Test 2: Check recent announcements (last 7 days)
console.log('\n\nTest 2: Recent announcements (last 7 days)');
const recentAnn = db.prepare(`
  SELECT * FROM announcements 
  WHERE created_at >= datetime('now', '-7 days')
  ORDER BY created_at DESC
`).all();

console.log('Announcements in last 7 days:', recentAnn.length);
if (recentAnn.length > 0) {
  recentAnn.forEach(ann => {
    const creator = db.prepare('SELECT name FROM users WHERE id = ?').get(ann.created_by);
    console.log(`  - "${ann.title}" (${ann.created_at}) by ${creator?.name || ann.created_by}`);
  });
}

// Test 3: Check if there are any announcements created today
console.log('\n\nTest 3: Announcements created today (2026-01-29)');
const todayAnn = db.prepare(`
  SELECT * FROM announcements 
  WHERE DATE(created_at) = '2026-01-29'
  ORDER BY created_at
`).all();

console.log('Today announcements:', todayAnn.length);
if (todayAnn.length > 0) {
  todayAnn.forEach(ann => {
    const creator = db.prepare('SELECT name FROM users WHERE id = ?').get(ann.created_by);
    console.log(`  - "${ann.title}"`);
    console.log(`    Time: ${ann.created_at}`);
    console.log(`    By: ${creator?.name || ann.created_by}`);
    console.log(`    Full content: ${ann.content}`);
  });
}

db.close();

console.log('\n=== Important Note ===');
console.log('Both test and production environments use the SAME backend database.');
console.log('If employees see different announcements, it might be:');
console.log('  1. Frontend caching issue');
console.log('  2. Different frontend versions (test vs production)');
console.log('  3. Permission/department filtering differences');

console.log('\n=== Check Complete ===');
