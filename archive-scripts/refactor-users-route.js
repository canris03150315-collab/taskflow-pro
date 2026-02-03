const fs = require('fs');

console.log('開始重構用戶路由...\n');

// 讀取原始文件
const originalContent = fs.readFileSync('/app/dist/routes/users.js', 'utf8');

// 檢查是否已經使用服務層
if (originalContent.includes("require('../services')") || originalContent.includes("require('../services/userService')")) {
  console.log('✅ 路由已經使用服務層，無需重構');
  process.exit(0);
}

console.log('原始文件大小:', originalContent.length, '字符');

// 創建重構後的內容
// 保留原有的導入和認證邏輯，只替換資料庫操作部分
const refactoredContent = originalContent
  // 在文件開頭添加服務層導入
  .replace(
    /(const express = require\(['"]express['"]\);)/,
    '$1\nconst services = require(\'../services\');'
  )
  // 替換直接的資料庫操作為服務層調用
  // 這裡保持原有邏輯，只是將資料庫調用改為服務層調用
  .replace(
    /database_1\.dbCall\(db, 'prepare', 'SELECT \* FROM users'\)\.all\(\)/g,
    'services.userService.getAllUsers()'
  )
  .replace(
    /database_1\.dbCall\(db, 'prepare', 'SELECT \* FROM users WHERE id = \?'\)\.get\(([^)]+)\)/g,
    'services.userService.getUserById($1)'
  );

// 寫入重構後的文件
fs.writeFileSync('/app/dist/routes/users.js', refactoredContent);

console.log('✅ 用戶路由重構完成');
console.log('重構後文件大小:', refactoredContent.length, '字符');

// 驗證語法
try {
  require('/app/dist/routes/users.js');
  console.log('✅ 語法驗證通過');
} catch (error) {
  console.error('❌ 語法錯誤:', error.message);
  // 恢復原始文件
  fs.writeFileSync('/app/dist/routes/users.js', originalContent);
  console.log('已恢復原始文件');
  process.exit(1);
}
