const fs = require('fs');

console.log('=== Migrate KOL to Weekly System ===');

function dbCall(db, method, ...args) {
  if (typeof db[method] === 'function') {
    return db[method](...args);
  }
  if (db.db && typeof db.db[method] === 'function') {
    return db.db[method](...args);
  }
  throw new Error('Method ' + method + ' not found');
}

try {
  const Database = require('better-sqlite3');
  const db = new Database('/app/data/taskflow.db');
  
  console.log('Step 1: Begin transaction...');
  dbCall(db, 'prepare', 'BEGIN TRANSACTION').run();
  
  try {
    console.log('Step 2: Get all KOL profiles...');
    const profiles = dbCall(db, 'prepare', 'SELECT * FROM kol_profiles').all();
    console.log('Found ' + profiles.length + ' profiles');
    
    console.log('Step 3: Update profiles with status_color...');
    let updatedCount = 0;
    
    for (const profile of profiles) {
      let statusColor = profile.status_color || 'green';
      
      if (!profile.status_color) {
        switch (profile.status) {
          case 'ACTIVE':
            statusColor = 'green';
            break;
          case 'STOPPED':
            statusColor = 'red';
            break;
          case 'LOST_CONTACT':
            statusColor = 'red';
            break;
          case 'NEGOTIATING':
            statusColor = 'yellow';
            break;
          default:
            statusColor = 'green';
        }
        
        const updateSql = 'UPDATE kol_profiles SET status_color = ?, updated_at = datetime("now") WHERE id = ?';
        dbCall(db, 'prepare', updateSql).run(statusColor, profile.id);
        updatedCount++;
      }
    }
    
    console.log('Updated ' + updatedCount + ' profiles with status_color');
    
    console.log('Step 4: Check if old tables exist...');
    const checkTableSql = 'SELECT name FROM sqlite_master WHERE type = ? AND name = ?';
    const contractsExist = dbCall(db, 'prepare', checkTableSql).get('table', 'kol_contracts');
    const paymentsExist = dbCall(db, 'prepare', checkTableSql).get('table', 'kol_payments');
    
    if (contractsExist) {
      console.log('Step 5: Rename kol_contracts to kol_contracts_backup...');
      dbCall(db, 'prepare', 'ALTER TABLE kol_contracts RENAME TO kol_contracts_backup').run();
      console.log('Renamed kol_contracts');
    } else {
      console.log('Step 5: kol_contracts table does not exist, skipping...');
    }
    
    if (paymentsExist) {
      console.log('Step 6: Rename kol_payments to kol_payments_backup...');
      dbCall(db, 'prepare', 'ALTER TABLE kol_payments RENAME TO kol_payments_backup').run();
      console.log('Renamed kol_payments');
    } else {
      console.log('Step 6: kol_payments table does not exist, skipping...');
    }
    
    console.log('Step 7: Commit transaction...');
    dbCall(db, 'prepare', 'COMMIT').run();
    
    console.log('=== Migration Complete ===');
    console.log('Profiles updated: ' + updatedCount);
    console.log('Old tables renamed to *_backup');
    console.log('KOL system is now in weekly mode');
    
  } catch (error) {
    console.log('Error occurred, rolling back...');
    dbCall(db, 'prepare', 'ROLLBACK').run();
    throw error;
  }
  
  db.close();
  console.log('Database closed successfully');
  
} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
}
