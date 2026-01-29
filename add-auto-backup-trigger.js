const fs = require('fs');

console.log('=== 添加自動備份觸發器到後端 API ===\n');

// 創建備份觸發函數
const backupTriggerCode = `
// 自動備份觸發器
const { exec } = require('child_process');
const path = require('path');

let lastBackupTime = 0;
const BACKUP_COOLDOWN = 10 * 60 * 1000; // 10 分鐘冷卻時間

function triggerBackupIfNeeded(reason = 'data_change') {
  const now = Date.now();
  
  // 避免頻繁備份
  if (now - lastBackupTime < BACKUP_COOLDOWN) {
    console.log('[Backup] 跳過備份（冷卻中）');
    return;
  }
  
  lastBackupTime = now;
  
  console.log(\`[Backup] 觸發備份: \${reason}\`);
  
  // 非阻塞執行備份
  exec('docker exec taskflow-pro node /app/trigger-backup.js', (error, stdout, stderr) => {
    if (error) {
      console.error('[Backup] 備份失敗:', error.message);
      return;
    }
    console.log('[Backup] 備份完成');
  });
}

// 導出函數
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { triggerBackupIfNeeded };
}
`;

// 創建容器內的備份觸發腳本
const containerBackupScript = `
const { exec } = require('child_process');

console.log('觸發容器外備份...');

exec('ssh root@localhost "/root/trigger-backup.sh"', (error, stdout, stderr) => {
  if (error) {
    console.error('備份失敗:', error.message);
    process.exit(1);
  }
  console.log(stdout);
  process.exit(0);
});
`;

console.log('1. 創建備份觸發器模組...');
fs.writeFileSync('/tmp/backup-trigger.js', backupTriggerCode);
console.log('✅ 已創建 backup-trigger.js');

console.log('\n2. 創建容器內備份腳本...');
fs.writeFileSync('/tmp/trigger-backup-container.js', containerBackupScript);
console.log('✅ 已創建 trigger-backup-container.js');

console.log('\n3. 需要手動整合到以下 API 路由：');
console.log('   - /api/work-logs (POST, PUT, DELETE)');
console.log('   - /api/reports (POST, PUT, DELETE)');
console.log('   - /api/announcements (POST, PUT, DELETE)');
console.log('   - /api/tasks (POST, PUT, DELETE)');

console.log('\n4. 整合方式：');
console.log('   在路由文件頂部添加：');
console.log('   const { triggerBackupIfNeeded } = require("./backup-trigger");');
console.log('');
console.log('   在成功寫入資料後調用：');
console.log('   triggerBackupIfNeeded("work_log_created");');

console.log('\n=== 完成 ===');
