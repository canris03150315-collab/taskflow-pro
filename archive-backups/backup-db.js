const Database = require('./node_modules/better-sqlite3');
const fs = require('fs');

const db = new Database('/app/data/taskflow.db');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = '/app/data/backups/taskflow-backup-' + timestamp + '.db';

fs.copyFileSync('/app/data/taskflow.db', backupPath);
console.log('SUCCESS: Backup created at', backupPath);

db.close();
