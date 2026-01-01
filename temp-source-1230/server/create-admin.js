const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');
const path = require('path');

// 連接到資料庫
const dbPath = path.join(__dirname, 'data', 'taskflow.db');
const db = new Database(dbPath);

async function createAdmin() {
  try {
    // 檢查是否已有用戶
    const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
    if (existingUsers.count > 0) {
      console.log('❌ 系統已有用戶，無法重複初始化');
      console.log('   如需重新初始化，請先刪除資料庫文件');
      process.exit(1);
    }

    // 加密密碼
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 12);

    // 創建管理員用戶
    const adminId = `admin-${Date.now()}`;
    const stmt = db.prepare(`
      INSERT INTO users (id, name, role, department, avatar, username, password, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    stmt.run(
      adminId,
      '系統管理員',
      'BOSS',
      'Management',
      '',
      'admin',
      hashedPassword
    );

    console.log('✅ 管理員帳號創建成功！');
    console.log('');
    console.log('📋 登入資訊:');
    console.log('   用戶名: admin');
    console.log('   密碼: admin123');
    console.log('');
    console.log('🌐 請使用以下 URL 登入:');
    console.log('   https://taskflow-pro-server-production.up.railway.app/api/auth/login');
    console.log('');
    console.log('⚠️  請立即修改預設密碼！');

  } catch (error) {
    console.error('❌ 創建管理員失敗:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

createAdmin();
