const fs = require('fs');
const { execSync } = require('child_process');

console.log('=== Find Today\'s Restore Point ===\n');

// Check all backup files in /app/data/
console.log('Test 1: Check /app/data/ backup files');
const dataFiles = fs.readdirSync('/app/data/');
const backupFiles = dataFiles.filter(f => f.includes('backup') && f.includes('taskflow'));

console.log('Backup files in /app/data/:');
backupFiles.forEach(f => {
  const stat = fs.statSync(`/app/data/${f}`);
  const date = stat.mtime.toISOString();
  const sizeMB = (stat.size / 1024 / 1024).toFixed(2);
  console.log(`  ${f}`);
  console.log(`    Modified: ${date}, Size: ${sizeMB} MB`);
});

// Check current database
console.log('\nTest 2: Current database info');
const dbStat = fs.statSync('/app/data/taskflow.db');
console.log('Current taskflow.db:');
console.log(`  Modified: ${dbStat.mtime.toISOString()}`);
console.log(`  Size: ${(dbStat.size / 1024 / 1024).toFixed(2)} MB`);

// Check if there's a backup created before today's restore
console.log('\nTest 3: Looking for backup created before restore');
const beforeRestoreBackup = dataFiles.find(f => f.includes('backup-before-restore'));
if (beforeRestoreBackup) {
  const stat = fs.statSync(`/app/data/${beforeRestoreBackup}`);
  console.log('Found backup before restore:');
  console.log(`  File: ${beforeRestoreBackup}`);
  console.log(`  Created: ${stat.mtime.toISOString()}`);
  console.log(`  Size: ${(stat.size / 1024 / 1024).toFixed(2)} MB`);
  console.log('\n⚠️ This backup contains data BEFORE the restore operation!');
  console.log('   This might be the correct state we want to restore to.');
}

// List all .db files
console.log('\nTest 4: All .db files in /app/data/');
const dbFiles = dataFiles.filter(f => f.endsWith('.db'));
dbFiles.forEach(f => {
  const stat = fs.statSync(`/app/data/${f}`);
  const date = stat.mtime.toISOString();
  const sizeMB = (stat.size / 1024 / 1024).toFixed(2);
  console.log(`  ${f}: ${date} (${sizeMB} MB)`);
});

console.log('\n=== Analysis ===');
console.log('Timeline of events:');
console.log('1. Before restore: System had complete data');
console.log('2. Restore operation: Used snapshot from 06:36');
console.log('3. Current state: Data from snapshot (incomplete)');
console.log('');
console.log('To get back to the correct state:');
console.log('- We need the backup created BEFORE the restore operation');
console.log('- Look for: taskflow.db.backup-before-restore-*');

console.log('\n=== Check Complete ===');
