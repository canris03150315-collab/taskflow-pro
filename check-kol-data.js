const db = require('better-sqlite3')('/app/data/taskflow.db');

console.log('=== KOL Profiles Data Format ===');
const profile = db.prepare('SELECT * FROM kol_profiles LIMIT 1').get();
console.log('Profile keys:', Object.keys(profile || {}));
console.log('Profile data:', JSON.stringify(profile, null, 2));

db.close();
