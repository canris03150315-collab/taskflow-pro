const Database = require('better-sqlite3');
const path = require('path');

console.log('=== KOL 系統完整診斷 ===\n');

try {
  // 1. 檢查資料庫連接
  console.log('1. 檢查資料庫...');
  const dbPath = path.join('/app/data', 'taskflow.db');
  const db = new Database(dbPath);
  console.log('✅ 資料庫連接成功');
  
  // 2. 檢查 KOL 表是否存在
  console.log('\n2. 檢查 KOL 表結構...');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'kol_%'").all();
  console.log(`找到 ${tables.length} 個 KOL 相關表:`, tables.map(t => t.name));
  
  if (tables.length === 0) {
    console.log('⚠️  KOL 表不存在，需要創建');
  } else {
    console.log('✅ KOL 表已存在');
    
    // 檢查每個表的結構
    tables.forEach(table => {
      const info = db.prepare(`PRAGMA table_info(${table.name})`).all();
      console.log(`\n   ${table.name} 欄位:`, info.map(i => i.name).join(', '));
    });
  }
  
  // 3. 檢查 KOL 路由文件
  console.log('\n3. 檢查 KOL 路由文件...');
  const fs = require('fs');
  const kolRoutePath = '/app/dist/routes/kol.js';
  
  if (fs.existsSync(kolRoutePath)) {
    console.log('✅ KOL 路由文件存在');
    
    const content = fs.readFileSync(kolRoutePath, 'utf8');
    
    // 檢查關鍵導入
    const hasAuthToken = content.includes('authenticateToken');
    const hasDbCall = content.includes('function dbCall') || content.includes('dbCall');
    const hasRouter = content.includes('module.exports = router');
    
    console.log('   - authenticateToken:', hasAuthToken ? '✅' : '❌');
    console.log('   - dbCall 函數:', hasDbCall ? '✅' : '❌');
    console.log('   - module.exports:', hasRouter ? '✅' : '❌');
    
    // 檢查路由定義
    const routes = content.match(/router\.(get|post|put|delete)\(/g);
    console.log(`   - 定義的路由數量: ${routes ? routes.length : 0}`);
    
  } else {
    console.log('❌ KOL 路由文件不存在');
  }
  
  // 4. 檢查 server.js 中的路由註冊
  console.log('\n4. 檢查路由註冊...');
  const serverPath = '/app/dist/server.js';
  const serverContent = fs.readFileSync(serverPath, 'utf8');
  
  const hasKolImport = serverContent.includes('kol') || serverContent.includes('KOL');
  const hasKolRoute = serverContent.includes("/api/kol");
  
  console.log('   - KOL 路由導入:', hasKolImport ? '✅' : '❌');
  console.log('   - KOL 路由註冊:', hasKolRoute ? '✅' : '❌');
  
  // 5. 測試簡單查詢
  console.log('\n5. 測試資料庫查詢...');
  if (tables.length > 0) {
    try {
      const count = db.prepare('SELECT COUNT(*) as count FROM kol_profiles').get();
      console.log(`✅ kol_profiles 表查詢成功，記錄數: ${count.count}`);
    } catch (error) {
      console.log('❌ 查詢失敗:', error.message);
    }
  }
  
  db.close();
  
  console.log('\n=== 診斷完成 ===');
  
} catch (error) {
  console.error('❌ 診斷過程出錯:', error);
  process.exit(1);
}
