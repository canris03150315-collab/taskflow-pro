const fs = require('fs');
const path = require('path');

// 清空本地數據庫文件
const dbPath = path.join(__dirname, 'server', 'data', 'taskflow.db');

if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('✅ 數據庫文件已刪除');
} else {
    console.log('❌ 數據庫文件不存在');
}

console.log('📋 數據庫已清空，可以重新初始化');
