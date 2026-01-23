const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== 檢查 routine_templates 表 ===');

const allTemplates = db.prepare('SELECT id, title, department_id, is_daily FROM routine_templates').all();
console.log('總共模板數:', allTemplates.length);

const dailyTasks = allTemplates.filter(t => t.is_daily === 1 || t.is_daily === true);
const documents = allTemplates.filter(t => !t.is_daily || t.is_daily === 0);

console.log('\n每日任務 (is_daily = 1):', dailyTasks.length);
dailyTasks.forEach(t => {
  console.log('  - ' + t.title + ' (' + t.department_id + ')');
});

console.log('\n部門文件 (is_daily = 0 或 null):', documents.length);
documents.forEach(t => {
  console.log('  - ' + t.title + ' (' + t.department_id + ')');
});

db.close();
console.log('\n=== 診斷完成 ===');
