// 資料庫索引優化腳本 - 直接執行 SQL
const sqlite3 = require('better-sqlite3');

try {
    const db = new sqlite3('/app/data/taskflow.db');
    
    const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_users_department ON users(department)',
        'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
        'CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)',
        'CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by)',
        'CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to_user_id ON tasks(assigned_to_user_id)',
        'CREATE INDEX IF NOT EXISTS idx_tasks_target_department ON tasks(target_department)',
        'CREATE INDEX IF NOT EXISTS idx_tasks_is_archived ON tasks(is_archived)',
        'CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at)',
        'CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON messages(channel_id)',
        'CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)',
        'CREATE INDEX IF NOT EXISTS idx_channels_type ON channels(type)',
        'CREATE INDEX IF NOT EXISTS idx_channels_updated_at ON channels(updated_at)',
        'CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at)',
        'CREATE INDEX IF NOT EXISTS idx_finance_records_department_id ON finance_records(department_id)',
        'CREATE INDEX IF NOT EXISTS idx_finance_records_date ON finance_records(date)',
        'CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date)',
        'CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level)',
        'CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp)',
        // 複合索引
        'CREATE INDEX IF NOT EXISTS idx_tasks_status_archived ON tasks(status, is_archived)',
        'CREATE INDEX IF NOT EXISTS idx_messages_channel_time ON messages(channel_id, created_at)',
        'CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, date)'
    ];
    
    let success = 0;
    for (const sql of indexes) {
        try {
            db.exec(sql);
            success++;
        } catch (e) {
            // 表可能不存在，跳過
        }
    }
    
    // 更新統計
    db.exec('ANALYZE');
    
    console.log('索引優化完成: ' + success + ' 個');
    db.close();
} catch (e) {
    console.error('錯誤:', e.message);
}
