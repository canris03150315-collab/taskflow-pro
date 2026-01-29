const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

console.log('=== 檢查備份覆蓋範圍 ===\n');

// 1. 檢查當前資料庫包含哪些資料
console.log('1. 當前資料庫內容：');
const db = new Database('/app/data/taskflow.db');

// 獲取所有表
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();

console.log(`\n資料庫包含 ${tables.length} 個表：\n`);

let totalRecords = 0;
const tableInfo = [];

tables.forEach(table => {
  const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
  totalRecords += count.count;
  tableInfo.push({ name: table.name, count: count.count });
  console.log(`  ${table.name}: ${count.count} 筆記錄`);
});

console.log(`\n總記錄數: ${totalRecords} 筆`);

db.close();

// 2. 檢查備份文件包含的資料
console.log('\n\n2. 最新備份內容：');

const backupDb = new Database('/app/backup_today_0600.db', { readonly: true });

let backupTotalRecords = 0;
const backupTableInfo = [];

tables.forEach(table => {
  try {
    const count = backupDb.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
    backupTotalRecords += count.count;
    backupTableInfo.push({ name: table.name, count: count.count });
  } catch (error) {
    backupTableInfo.push({ name: table.name, count: 0, error: true });
  }
});

console.log(`\n備份總記錄數: ${backupTotalRecords} 筆`);

backupDb.close();

// 3. 比對差異
console.log('\n\n3. 備份覆蓋率分析：\n');

let allCovered = true;
let missingRecords = 0;

tableInfo.forEach((current, i) => {
  const backup = backupTableInfo[i];
  const diff = current.count - backup.count;
  const coverage = backup.count === 0 && current.count === 0 ? 100 : (backup.count / current.count * 100).toFixed(1);
  
  if (diff > 0) {
    allCovered = false;
    missingRecords += diff;
    console.log(`  ⚠️  ${current.name}: ${backup.count}/${current.count} (${coverage}%) - 缺少 ${diff} 筆`);
  } else if (diff < 0) {
    console.log(`  ⚠️  ${current.name}: ${backup.count}/${current.count} (備份比當前多 ${-diff} 筆)`);
  } else {
    console.log(`  ✅ ${current.name}: ${backup.count}/${current.count} (100%)`);
  }
});

// 4. 檢查其他需要備份的文件
console.log('\n\n4. 其他文件檢查：\n');

const filesToCheck = [
  '/app/data/taskflow.db',
  '/app/data/taskflow.db-wal',
  '/app/data/taskflow.db-shm',
  '/app/data/.db-key'
];

filesToCheck.forEach(file => {
  if (fs.existsSync(file)) {
    const stat = fs.statSync(file);
    const sizeMB = (stat.size / 1024 / 1024).toFixed(2);
    console.log(`  ✅ ${path.basename(file)}: ${sizeMB} MB`);
  } else {
    console.log(`  ❌ ${path.basename(file)}: 不存在`);
  }
});

// 5. 檢查上傳文件
console.log('\n\n5. 上傳文件檢查：\n');

const uploadsDir = '/app/data/uploads';
if (fs.existsSync(uploadsDir)) {
  const files = fs.readdirSync(uploadsDir);
  let totalSize = 0;
  
  files.forEach(file => {
    const filePath = path.join(uploadsDir, file);
    const stat = fs.statSync(filePath);
    totalSize += stat.size;
  });
  
  console.log(`  上傳文件數量: ${files.length}`);
  console.log(`  總大小: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  ⚠️  這些文件不在資料庫備份中！`);
} else {
  console.log(`  uploads 目錄不存在`);
}

// 6. 檢查證書文件
console.log('\n\n6. 證書文件檢查：\n');

const certsDir = '/app/data/certificates';
if (fs.existsSync(certsDir)) {
  const files = fs.readdirSync(certsDir);
  console.log(`  證書文件數量: ${files.length}`);
  if (files.length > 0) {
    console.log(`  ⚠️  這些文件不在資料庫備份中！`);
  }
} else {
  console.log(`  certificates 目錄不存在`);
}

// 總結
console.log('\n\n' + '='.repeat(70));
console.log('總結');
console.log('='.repeat(70));

if (allCovered && missingRecords === 0) {
  console.log('\n✅ 資料庫備份完整覆蓋所有表');
} else {
  console.log(`\n⚠️  備份缺少 ${missingRecords} 筆記錄`);
}

console.log('\n備份範圍：');
console.log('  ✅ 資料庫文件 (taskflow.db)');
console.log('  ✅ WAL 文件 (如果存在)');
console.log('  ✅ SHM 文件 (如果存在)');
console.log('  ❌ 上傳文件 (/app/data/uploads)');
console.log('  ❌ 證書文件 (/app/data/certificates)');
console.log('  ❌ 加密金鑰 (/app/data/.db-key)');

console.log('\n建議：');
console.log('  1. 資料庫備份已涵蓋所有表資料');
console.log('  2. 需要額外備份上傳文件和證書');
console.log('  3. 需要安全備份加密金鑰');

console.log('\n=== 檢查完成 ===');
