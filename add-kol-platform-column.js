const db = require('better-sqlite3')('/app/data/taskflow.db');

console.log('=== Add KOL Platform Column ===');

try {
  // Check if platform column exists
  const tableInfo = db.pragma("table_info(kol_profiles)");
  const hasPlatform = tableInfo.some(col => col.name === 'platform');
  const hasPlatformId = tableInfo.some(col => col.name === 'platform_id');
  
  if (!hasPlatform) {
    console.log('Adding platform column...');
    db.exec("ALTER TABLE kol_profiles ADD COLUMN platform TEXT DEFAULT 'FACEBOOK'");
    console.log('SUCCESS: platform column added');
  } else {
    console.log('platform column already exists');
  }
  
  if (!hasPlatformId) {
    console.log('Adding platform_id column...');
    db.exec("ALTER TABLE kol_profiles ADD COLUMN platform_id TEXT");
    // Copy facebook_id to platform_id for existing records
    db.exec("UPDATE kol_profiles SET platform_id = facebook_id WHERE platform_id IS NULL");
    console.log('SUCCESS: platform_id column added and data migrated');
  } else {
    console.log('platform_id column already exists');
  }
  
  // Verify
  const updatedInfo = db.pragma("table_info(kol_profiles)");
  console.log('\nCurrent columns:', updatedInfo.map(c => c.name).join(', '));
  
  db.close();
  console.log('\n=== Done ===');
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
