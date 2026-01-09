const Database = require('better-sqlite3');

// 檢查當前資料庫
const current = new Database('/app/data/taskflow.db');
console.log('=== 當前資料庫 ===');
console.log('用戶:', current.prepare('SELECT COUNT(*) as c FROM users').get().c);
console.log('任務:', current.prepare('SELECT COUNT(*) as c FROM tasks').get().c);
try { console.log('部門:', current.prepare('SELECT COUNT(*) as c FROM departments').get().c); } catch(e) { console.log('部門: 表不存在'); }
try { console.log('報表:', current.prepare('SELECT COUNT(*) as c FROM reports').get().c); } catch(e) { console.log('報表: 表不存在'); }

console.log('\n=== 用戶列表 ===');
const users = current.prepare('SELECT id, name, username, role, created_at FROM users').all();
users.forEach(u => console.log(`${u.name} | ${u.role} | 建立: ${u.created_at}`));

current.close();
