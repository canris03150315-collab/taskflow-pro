"use strict";
/**
 * 資料庫索引優化腳本
 * 為常用查詢欄位建立索引，加速查詢效能
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.optimizeDatabase = void 0;

// 可直接在 server 啟動時呼叫，使用現有的 db 連線
const optimizeDatabase = async (db) => {
    console.log('[DB優化] 開始建立索引...');
    
    const indexes = [
        // 使用者表索引
        { table: 'users', column: 'username', unique: true },
        { table: 'users', column: 'department' },
        { table: 'users', column: 'role' },
        
        // 任務表索引
        { table: 'tasks', column: 'status' },
        { table: 'tasks', column: 'created_by' },
        { table: 'tasks', column: 'assigned_to_user_id' },
        { table: 'tasks', column: 'target_department' },
        { table: 'tasks', column: 'is_archived' },
        { table: 'tasks', column: 'created_at' },
        { table: 'tasks', column: 'deadline' },
        
        // 訊息表索引
        { table: 'messages', column: 'channel_id' },
        { table: 'messages', column: 'user_id' },
        { table: 'messages', column: 'created_at' },
        
        // 頻道表索引
        { table: 'channels', column: 'type' },
        { table: 'channels', column: 'updated_at' },
        
        // 公告表索引
        { table: 'announcements', column: 'created_at' },
        
        // 報表表索引
        { table: 'reports', column: 'user_id' },
        { table: 'reports', column: 'type' },
        { table: 'reports', column: 'created_at' },
        
        // 財務記錄表索引
        { table: 'finance_records', column: 'department_id' },
        { table: 'finance_records', column: 'type' },
        { table: 'finance_records', column: 'date' },
        { table: 'finance_records', column: 'status' },
        
        // 出勤記錄表索引
        { table: 'attendance', column: 'user_id' },
        { table: 'attendance', column: 'date' },
        
        // 績效考核表索引
        { table: 'performance_reviews', column: 'target_user_id' },
        { table: 'performance_reviews', column: 'period' },
        
        // 系統日誌表索引
        { table: 'system_logs', column: 'user_id' },
        { table: 'system_logs', column: 'level' },
        { table: 'system_logs', column: 'timestamp' },
        { table: 'system_logs', column: 'action' },
        
        // 文件規範表索引
        { table: 'routine_templates', column: 'department_id' },
        
        // 備忘錄表索引
        { table: 'memos', column: 'user_id' },
        
        // 論壇表索引
        { table: 'forum_suggestions', column: 'author_id' },
        { table: 'forum_suggestions', column: 'status' },
        { table: 'forum_suggestions', column: 'created_at' }
    ];
    
    let created = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const idx of indexes) {
        const indexName = `idx_${idx.table}_${idx.column}`;
        const uniqueStr = idx.unique ? 'UNIQUE ' : '';
        
        try {
            await db.run(`CREATE ${uniqueStr}INDEX IF NOT EXISTS ${indexName} ON ${idx.table}(${idx.column})`);
            created++;
        } catch (err) {
            // 表可能不存在，跳過
            if (err.message.includes('no such table')) {
                skipped++;
            } else {
                console.warn(`[DB優化] 建立索引 ${indexName} 失敗:`, err.message);
                errors++;
            }
        }
    }
    
    // 建立複合索引（常用查詢組合）
    const compositeIndexes = [
        { name: 'idx_tasks_status_archived', table: 'tasks', columns: 'status, is_archived' },
        { name: 'idx_tasks_dept_status', table: 'tasks', columns: 'target_department, status' },
        { name: 'idx_messages_channel_time', table: 'messages', columns: 'channel_id, created_at' },
        { name: 'idx_attendance_user_date', table: 'attendance', columns: 'user_id, date' },
        { name: 'idx_finance_dept_date', table: 'finance_records', columns: 'department_id, date' },
        { name: 'idx_logs_level_time', table: 'system_logs', columns: 'level, timestamp' }
    ];
    
    for (const idx of compositeIndexes) {
        try {
            await db.run(`CREATE INDEX IF NOT EXISTS ${idx.name} ON ${idx.table}(${idx.columns})`);
            created++;
        } catch (err) {
            if (!err.message.includes('no such table')) {
                console.warn(`[DB優化] 建立複合索引 ${idx.name} 失敗:`, err.message);
            }
        }
    }
    
    // 執行 ANALYZE 更新統計資訊
    try {
        await db.run('ANALYZE');
        console.log('[DB優化] 統計資訊已更新');
    } catch (err) {
        console.warn('[DB優化] ANALYZE 失敗:', err.message);
    }
    
    // 執行 VACUUM 整理資料庫（可選，耗時較長）
    // await db.run('VACUUM');
    
    console.log(`[DB優化] 索引建立完成: ${created} 個成功, ${skipped} 個跳過, ${errors} 個錯誤`);
    
    return { created, skipped, errors };
};

exports.optimizeDatabase = optimizeDatabase;

// 查詢優化建議
const queryOptimizationTips = `
=== SQLite 查詢優化建議 ===

1. 任務查詢優化:
   - 使用 idx_tasks_status_archived 索引
   - 查詢: SELECT * FROM tasks WHERE status = ? AND is_archived = ?

2. 訊息查詢優化:
   - 使用 idx_messages_channel_time 索引
   - 查詢: SELECT * FROM messages WHERE channel_id = ? ORDER BY created_at DESC LIMIT ?

3. 出勤查詢優化:
   - 使用 idx_attendance_user_date 索引
   - 查詢: SELECT * FROM attendance WHERE user_id = ? AND date = ?

4. 財務查詢優化:
   - 使用 idx_finance_dept_date 索引
   - 查詢: SELECT * FROM finance_records WHERE department_id = ? AND date BETWEEN ? AND ?

5. 日誌查詢優化:
   - 使用 idx_logs_level_time 索引
   - 查詢: SELECT * FROM system_logs WHERE level = ? ORDER BY timestamp DESC LIMIT ?
`;
