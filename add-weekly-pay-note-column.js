const fs = require('fs');
const path = require('path');

console.log('=== Add weekly_pay_note column to kol_profiles ===');

// 1. Add database column
const dbPath = '/app/data/taskflow.db';
const Database = require('better-sqlite3');

try {
  const db = new Database(dbPath);
  
  // Check if column exists
  const tableInfo = db.prepare("PRAGMA table_info(kol_profiles)").all();
  const hasWeeklyPayNote = tableInfo.some(col => col.name === 'weekly_pay_note');
  
  if (!hasWeeklyPayNote) {
    console.log('Adding weekly_pay_note column...');
    db.prepare('ALTER TABLE kol_profiles ADD COLUMN weekly_pay_note TEXT').run();
    console.log('SUCCESS: weekly_pay_note column added');
  } else {
    console.log('INFO: weekly_pay_note column already exists');
  }
  
  db.close();
  console.log('SUCCESS: Database modification complete');
} catch (error) {
  console.error('ERROR: Database modification failed:', error);
  process.exit(1);
}

// 2. Modify backend API route
const routePath = '/app/dist/routes/kol-profiles.js';

try {
  let content = fs.readFileSync(routePath, 'utf8');
  
  // Modify PUT /profiles/:id route to add weekly_pay_note field
  const updatePattern = /UPDATE kol_profiles SET platform = \?, platform_id = \?, platform_account = \?, contact_info = \?, status = \?, notes = \?, updated_at = \? WHERE id = \?/g;
  
  if (updatePattern.test(content)) {
    content = content.replace(
      /UPDATE kol_profiles SET platform = \?, platform_id = \?, platform_account = \?, contact_info = \?, status = \?, notes = \?, updated_at = \? WHERE id = \?/g,
      'UPDATE kol_profiles SET platform = ?, platform_id = ?, platform_account = ?, contact_info = ?, status = ?, status_color = ?, weekly_pay_note = ?, notes = ?, updated_at = ? WHERE id = ?'
    );
    
    // Modify parameter binding
    content = content.replace(
      /\.run\(platform, platformId, platformAccount, contactInfo \|\| null, status, notes \|\| null, updatedAt, id\)/g,
      '.run(platform, platformId, platformAccount, contactInfo || null, status, statusColor || null, weeklyPayNote || null, notes || null, updatedAt, id)'
    );
    
    console.log('SUCCESS: Backend API route modified');
  } else {
    console.log('WARNING: Update statement not found, may already be modified');
  }
  
  fs.writeFileSync(routePath, content, 'utf8');
  console.log('SUCCESS: File written');
  
} catch (error) {
  console.error('ERROR: Backend modification failed:', error);
  process.exit(1);
}

console.log('\n=== Fix complete ===');
console.log('Please restart container: docker restart taskflow-pro');
