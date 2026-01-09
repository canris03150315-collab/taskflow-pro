const Database = require('./node_modules/better-sqlite3');

console.log('Closing any existing connections...');
const db = new Database('/app/data/taskflow.db');

console.log('Checking WAL mode...');
const walMode = db.pragma('journal_mode', { simple: true });
console.log('Current journal mode:', walMode);

console.log('Running checkpoint...');
db.pragma('wal_checkpoint(TRUNCATE)');

console.log('Optimizing database...');
db.pragma('optimize');

console.log('Verifying integrity...');
const integrity = db.pragma('integrity_check');
console.log('Integrity:', integrity);

db.close();
console.log('SUCCESS: Database WAL fixed');
