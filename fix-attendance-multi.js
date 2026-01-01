// 修復後端 attendance.js 支持一天多次打卡
const fs = require('fs');
const path = '/app/dist/routes/attendance.js';

let content = fs.readFileSync(path, 'utf8');

// 修改 clock-in 邏輯：移除「今天已經打卡」的限制，改為檢查是否有未結束的班次
const oldClockInCheck = `if (existingRecord && existingRecord.clock_in) {
      return res.status(400).json({ error: '今天已經上班打卡' });
    }`;

const newClockInCheck = `// 允許多次打卡，但如果有未結束的班次則不能再打卡
    const activeSession = await db.get(
      'SELECT * FROM attendance_records WHERE user_id = ? AND date = ? AND clock_out IS NULL',
      [currentUser.id, today]
    );
    if (activeSession) {
      return res.status(400).json({ error: '您有未結束的班次，請先下班打卡' });
    }`;

if (content.includes(oldClockInCheck)) {
    content = content.replace(oldClockInCheck, newClockInCheck);
    console.log('已修改 clock-in 檢查邏輯');
} else {
    console.log('找不到原始 clock-in 檢查邏輯，嘗試其他方式...');
    // 嘗試更寬鬆的匹配
    content = content.replace(
        /if\s*\(existingRecord\s*&&\s*existingRecord\.clock_in\)\s*\{[\s\S]*?今天已經上班打卡[\s\S]*?\}/,
        newClockInCheck
    );
}

// 修改 clock-in 創建邏輯：總是創建新記錄而不是更新
const oldCreateLogic = `if (existingRecord) {
      // 更新現有記錄`;

const newCreateLogic = `// 總是創建新記錄以支持多次打卡
    if (false) {
      // 保留原邏輯但不執行`;

if (content.includes(oldCreateLogic)) {
    content = content.replace(oldCreateLogic, newCreateLogic);
    console.log('已修改創建邏輯為總是新建記錄');
}

// 修改 clock-out 邏輯：找到最新未結束的班次而不是當天記錄
const oldClockOutQuery = `const existingRecord = await db.get(
      'SELECT * FROM attendance_records WHERE user_id = ? AND date = ?',
      [currentUser.id, today]
    );`;

const newClockOutQuery = `// 找到最新未結束的班次
    const existingRecord = await db.get(
      'SELECT * FROM attendance_records WHERE user_id = ? AND clock_out IS NULL ORDER BY clock_in DESC LIMIT 1',
      [currentUser.id]
    );`;

if (content.includes(oldClockOutQuery)) {
    content = content.replace(oldClockOutQuery, newClockOutQuery);
    console.log('已修改 clock-out 查詢邏輯');
}

// 修改 status 端點：找到最新的活躍班次
const oldStatusQuery = `const todayRecord = await db.get(
      'SELECT * FROM attendance_records WHERE user_id = ? AND date = ?',
      [currentUser.id, today]
    );`;

const newStatusQuery = `// 先找活躍班次，再找今天最新記錄
    let todayRecord = await db.get(
      'SELECT * FROM attendance_records WHERE user_id = ? AND clock_out IS NULL ORDER BY clock_in DESC LIMIT 1',
      [currentUser.id]
    );
    if (!todayRecord) {
      todayRecord = await db.get(
        'SELECT * FROM attendance_records WHERE user_id = ? AND date = ? ORDER BY clock_in DESC LIMIT 1',
        [currentUser.id, today]
      );
    }`;

if (content.includes(oldStatusQuery)) {
    content = content.replace(oldStatusQuery, newStatusQuery);
    console.log('已修改 status 查詢邏輯');
}

fs.writeFileSync(path, content);
console.log('attendance.js 已更新完成！');
