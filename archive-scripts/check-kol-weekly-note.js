const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Checking KOL Weekly Pay Notes ===\n');

const profiles = db.prepare('SELECT id, platform_account, weekly_pay_note, notes FROM kol_profiles ORDER BY updated_at DESC').all();

console.log('Total profiles:', profiles.length);
console.log('\nProfiles with weekly_pay_note:');

let hasNoteCount = 0;
let emptyNoteCount = 0;

profiles.forEach((p, i) => {
  if (p.weekly_pay_note) {
    hasNoteCount++;
    console.log(`${i + 1}. ${p.platform_account}: "${p.weekly_pay_note}"`);
  } else {
    emptyNoteCount++;
  }
});

console.log('\nSummary:');
console.log('- Has weekly_pay_note:', hasNoteCount);
console.log('- Empty weekly_pay_note:', emptyNoteCount);

db.close();
