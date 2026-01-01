// 更新考勤系統以支援多次打卡
const fs = require('fs');
const path = require('path');

console.log('🔄 更新考勤系統支援多次打卡...\n');

// 1. 備份原始文件
const originalPath = './src/routes/attendance.ts';
const backupPath = './src/routes/attendance.ts.backup';

if (fs.existsSync(originalPath)) {
  fs.copyFileSync(originalPath, backupPath);
  console.log('✅ 已備份原始 attendance.ts');
}

// 2. 讀取新的實現
const newImplementation = fs.readFileSync('./attendance-multi-clock.ts', 'utf8');

// 3. 寫入新實現
fs.writeFileSync(originalPath, newImplementation);
console.log('✅ 已更新 attendance.ts 支援多次打卡');

// 4. 創建資料庫更新腳本
const dbUpdateScript = `
-- 更新 attendance_records 表以支援多次打卡
-- 注意：這會清空現有記錄

-- 備份現有數據
CREATE TABLE IF NOT EXISTS attendance_records_old AS SELECT * FROM attendance_records;

-- 刪除舊表
DROP TABLE attendance_records;

-- 創建新表
CREATE TABLE attendance_records (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date DATE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('clock-in', 'clock-out')),
    clock_in_time TIME,
    clock_out_time TIME,
    location_address TEXT,
    work_hours REAL,
    location_lat REAL,
    location_lng REAL,
    is_offline BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 創建索引
CREATE INDEX idx_attendance_user_date ON attendance_records(user_id, date);
CREATE INDEX idx_attendance_type ON attendance_records(type);
`;

fs.writeFileSync('./update-attendance.sql', dbUpdateScript);
console.log('✅ 已創建資料庫更新腳本');

console.log('\n📋 後續步驟：');
console.log('1. 執行資料庫更新：');
console.log('   ssh taskflow "docker exec taskflow-pro sh -c \\"sqlite3 /app/data/taskflow.db < /tmp/update-attendance.sql\\""');
console.log('\n2. 重新編譯後端：');
console.log('   ssh taskflow "docker exec taskflow-pro sh -c \\"cd /app && npm run build\\""');
console.log('\n3. 重啟容器：');
console.log('   ssh taskflow "docker restart taskflow-pro"');

console.log('\n✨ 更新完成！');
