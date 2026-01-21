const fs = require('fs');
const Database = require('better-sqlite3');

console.log('START: Fix KOL weekly pay note');

// Add database column
try {
  const db = new Database('/app/data/taskflow.db');
  
  const tableInfo = db.prepare("PRAGMA table_info(kol_profiles)").all();
  const hasColumn = tableInfo.some(col => col.name === 'weekly_pay_note');
  
  if (!hasColumn) {
    db.prepare('ALTER TABLE kol_profiles ADD COLUMN weekly_pay_note TEXT').run();
    console.log('SUCCESS: Added weekly_pay_note column');
  } else {
    console.log('INFO: Column already exists');
  }
  
  db.close();
} catch (error) {
  console.error('ERROR DB:', error.message);
}

// Fix backend route
try {
  const routePath = '/app/dist/routes/kol-profiles.js';
  let content = fs.readFileSync(routePath, 'utf8');
  
  // Find and replace UPDATE statement
  if (content.includes('UPDATE kol_profiles SET platform = ?, platform_id = ?, platform_account = ?, contact_info = ?, status = ?, notes = ?, updated_at = ? WHERE id = ?')) {
    content = content.replace(
      'UPDATE kol_profiles SET platform = ?, platform_id = ?, platform_account = ?, contact_info = ?, status = ?, notes = ?, updated_at = ? WHERE id = ?',
      'UPDATE kol_profiles SET platform = ?, platform_id = ?, platform_account = ?, contact_info = ?, status = ?, status_color = ?, weekly_pay_note = ?, notes = ?, updated_at = ? WHERE id = ?'
    );
    
    content = content.replace(
      '.run(platform, platformId, platformAccount, contactInfo || null, status, notes || null, updatedAt, id)',
      '.run(platform, platformId, platformAccount, contactInfo || null, status, statusColor || null, weeklyPayNote || null, notes || null, updatedAt, id)'
    );
    
    fs.writeFileSync(routePath, content, 'utf8');
    console.log('SUCCESS: Backend route updated');
  } else {
    console.log('INFO: Route already updated or pattern not found');
  }
} catch (error) {
  console.error('ERROR ROUTE:', error.message);
}

console.log('DONE: Please restart container');
