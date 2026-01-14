const db = require('better-sqlite3')('/app/data/taskflow.db');

console.log('=== Clear All KOL Data ===');

db.prepare('DELETE FROM kol_payments').run();
db.prepare('DELETE FROM kol_contracts').run();
db.prepare('DELETE FROM kol_profiles').run();

console.log('All KOL data cleared!');

const count = db.prepare('SELECT COUNT(*) as c FROM kol_profiles').get().c;
console.log('Total profiles:', count);

db.close();
console.log('Done!');
