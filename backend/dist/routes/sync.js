"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncRoutes = void 0;
const express_1 = __importDefault(require("express"));
const logger_1 = require("../utils/logger");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
exports.syncRoutes = router;
// GET /api/sync/status - 獲取同步狀態
router.get('/status', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        // 獲取待同步項目
        const pendingSyncs = await db.getSyncQueue(currentUser.id);
        // 獲取統計資訊
        const stats = await Promise.all([
            db.get('SELECT COUNT(*) as count FROM sync_queue WHERE user_id = ? AND status = "pending"', [currentUser.id]),
            db.get('SELECT COUNT(*) as count FROM sync_queue WHERE user_id = ? AND status = "failed"', [currentUser.id]),
            db.get('SELECT COUNT(*) as count FROM tasks WHERE assigned_to_user_id = ? AND offline_pending = TRUE', [currentUser.id])
        ]);
        res.json({
            pendingCount: stats[0].count,
            failedCount: stats[1].count,
            offlineTasksCount: stats[2].count,
            queue: pendingSyncs,
            lastSyncAt: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('獲取同步狀態錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});
// POST /api/sync/upload - 上傳離線變更
router.post('/upload', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { changes } = req.body; // 陣列格式: [{table, recordId, data, version, timestamp}]
        if (!Array.isArray(changes)) {
            return res.status(400).json({ error: '變更資料格式錯誤' });
        }
        const results = {
            success: [],
            conflicts: [],
            errors: []
        };
        // 使用事務處理所有變更
        try {
            db.transaction(() => {
                for (const change of changes) {
                    try {
                        const { table, recordId, data, version, timestamp } = change;
                        // 檢查記錄是否存在及版本
                        const existingRecord = db.get(`SELECT * FROM ${table} WHERE id = ?`, [recordId]);
                        if (!existingRecord) {
                            // 新記錄
                            if (table === 'tasks') {
                                db.run(`
                  INSERT INTO tasks (
                    id, title, description, urgency, deadline, status,
                    progress, created_by, target_department, assigned_to_user_id,
                    offline_pending, last_synced_at, version
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                                    recordId,
                                    data.title,
                                    data.description || '',
                                    data.urgency,
                                    data.deadline || null,
                                    data.status || 'Open',
                                    data.progress || 0,
                                    currentUser.id,
                                    data.target_department || null,
                                    data.assigned_to_user_id || null,
                                    1,
                                    new Date(timestamp).toISOString(),
                                    1
                                ]);
                            }
                            results.success.push({ recordId, action: 'created' });
                        }
                        else {
                            // 檢查版本衝突
                            if (existingRecord && existingRecord.version > version) {
                                // 版本衝突，需要解決
                                const conflictFields = [];
                                // 比較各個欄位
                                for (const [key, value] of Object.entries(data)) {
                                    if (existingRecord[key] !== value && key !== 'version') {
                                        conflictFields.push(key);
                                    }
                                }
                                if (conflictFields.length > 0) {
                                    results.conflicts.push({
                                        recordId,
                                        table,
                                        localVersion: version,
                                        remoteVersion: existingRecord.version,
                                        localData: data,
                                        remoteData: existingRecord,
                                        conflictFields
                                    });
                                    continue;
                                }
                            }
                            // 更新記錄
                            if (table === 'tasks') {
                                const updates = [];
                                const params = [];
                                for (const [key, value] of Object.entries(data)) {
                                    if (key !== 'id' && key !== 'version') {
                                        updates.push(`${key} = ?`);
                                        params.push(value);
                                    }
                                }
                                if (updates.length > 0) {
                                    updates.push('version = version + 1', 'offline_pending = 0', 'last_synced_at = datetime("now")');
                                    params.push(recordId);
                                    db.run(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, params);
                                    results.success.push({ recordId, action: 'updated' });
                                }
                            }
                        }
                        // 移除同步佇列項目
                        db.run('DELETE FROM sync_queue WHERE record_id = ? AND user_id = ?', [recordId, currentUser.id]);
                    }
                    catch (error) {
                        console.error(`同步記錄 ${change.recordId} 失敗:`, error);
                        results.errors.push({ recordId: change.recordId, error: error.message });
                        // 事務內部錯誤會自動回滾整個事務
                        throw error;
                    }
                }
            })();
        }
        catch (transactionError) {
            console.error('事務執行失敗，已回滾:', transactionError);
            throw transactionError;
        }
        // 記錄同步日誌
        await (0, logger_1.logSystemAction)(db, currentUser, 'SYNC_UPLOAD', `上傳 ${results.success.length} 項變更，${results.conflicts.length} 項衝突，${results.errors.length} 項錯誤`);
        res.json({
            results,
            summary: {
                total: changes.length,
                success: results.success.length,
                conflicts: results.conflicts.length,
                errors: results.errors.length
            }
        });
    }
    catch (error) {
        console.error('上傳同步錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});
// POST /api/sync/download - 下載最新資料
router.post('/download', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { lastSyncAt, tables } = req.body;
        const results = {};
        // 根據請求的表格下載資料
        for (const table of tables || ['tasks', 'departments', 'users']) {
            let query = '';
            let params = [];
            switch (table) {
                case 'tasks':
                    if (currentUser.role === 'EMPLOYEE') {
                        query = `
              SELECT * FROM tasks 
              WHERE (assigned_to_user_id = ? OR assigned_to_department = ?)
              AND (last_synced_at > ? OR created_at > ?)
              ORDER BY last_synced_at DESC
            `;
                        params = [currentUser.id, currentUser.department, lastSyncAt, lastSyncAt];
                    }
                    else if (currentUser.role === 'SUPERVISOR') {
                        query = `
              SELECT * FROM tasks 
              WHERE target_department = ? OR created_by = ?
              AND (last_synced_at > ? OR created_at > ?)
              ORDER BY last_synced_at DESC
            `;
                        params = [currentUser.department, currentUser.id, lastSyncAt, lastSyncAt];
                    }
                    else {
                        query = `
              SELECT * FROM tasks 
              WHERE last_synced_at > ? OR created_at > ?
              ORDER BY last_synced_at DESC
            `;
                        params = [lastSyncAt, lastSyncAt];
                    }
                    break;
                case 'departments':
                    query = 'SELECT * FROM departments ORDER BY name';
                    break;
                case 'users':
                    query = `
            SELECT id, name, role, department, avatar, username, created_at, updated_at 
            FROM users 
            WHERE department = ? OR role IN ('BOSS', 'MANAGER')
            ORDER BY name
          `;
                    params = [currentUser.department];
                    break;
            }
            if (query) {
                results[table] = await db.all(query, params);
            }
        }
        // 獲取用戶的同步佇列
        results.syncQueue = await db.getSyncQueue(currentUser.id);
        res.json({
            data: results,
            serverTime: new Date().toISOString(),
            lastSyncAt
        });
    }
    catch (error) {
        console.error('下載同步錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});
// POST /api/sync/resolve - 解決衝突
router.post('/resolve', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { recordId, table, strategy, resolvedData } = req.body;
        if (!recordId || !table || !strategy) {
            return res.status(400).json({ error: '缺少必要參數' });
        }
        if (!['local', 'remote', 'merge'].includes(strategy)) {
            return res.status(400).json({ error: '無效的解決策略' });
        }
        // 獲取現有記錄
        const existingRecord = await db.get(`SELECT * FROM ${table} WHERE id = ?`, [recordId]);
        if (!existingRecord) {
            return res.status(404).json({ error: '記錄不存在' });
        }
        // 檢查權限
        if (table === 'tasks') {
            const canEdit = currentUser.role === 'BOSS' ||
                currentUser.role === 'MANAGER' ||
                (currentUser.role === 'SUPERVISOR' && existingRecord.target_department === currentUser.department) ||
                existingRecord.created_by === currentUser.id ||
                existingRecord.assigned_to_user_id === currentUser.id;
            if (!canEdit) {
                return res.status(403).json({ error: '無權修改此記錄' });
            }
        }
        let finalData;
        let actionDescription;
        switch (strategy) {
            case 'local':
                // 使用本地資料
                finalData = resolvedData;
                actionDescription = '使用本地版本';
                break;
            case 'remote':
                // 使用遠端資料（不更新）
                finalData = existingRecord;
                actionDescription = '使用遠端版本';
                break;
            case 'merge':
                // 合併資料
                finalData = { ...existingRecord, ...resolvedData, id: recordId };
                actionDescription = '合併版本';
                break;
        }
        // 如果需要更新資料庫
        if (strategy !== 'remote') {
            const updates = [];
            const params = [];
            for (const [key, value] of Object.entries(finalData)) {
                if (key !== 'id' && key !== 'version') {
                    updates.push(`${key} = ?`);
                    params.push(value);
                }
            }
            if (updates.length > 0) {
                updates.push('version = version + 1', 'offline_pending = FALSE', 'last_synced_at = datetime("now")');
                params.push(recordId);
                db.run(`UPDATE ${table} SET ${updates.join(', ')} WHERE id = ?`, params);
            }
        }
        // 移除同步佇列中的衝突項目
        db.run('DELETE FROM sync_queue WHERE record_id = ? AND user_id = ?', [recordId, currentUser.id]);
        // 記錄解決日誌
        await (0, logger_1.logSystemAction)(db, currentUser, 'RESOLVE_CONFLICT', `解決 ${table} 記錄 ${recordId} 衝突: ${actionDescription}`);
        res.json({
            message: '衝突解決成功',
            recordId,
            strategy,
            finalData
        });
    }
    catch (error) {
        console.error('解決衝突錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});
// GET /api/sync/ping - 網路連接檢測
router.get('/ping', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        // 檢查資料庫連接
        const dbStatus = await db.get('SELECT 1 as test');
        // 檢查待同步項目數量
        const pendingCount = await db.get('SELECT COUNT(*) as count FROM sync_queue WHERE user_id = ? AND status = "pending"', [currentUser.id]);
        res.json({
            status: 'online',
            timestamp: new Date().toISOString(),
            database: dbStatus ? 'connected' : 'disconnected',
            pending_syncs: pendingCount.count,
            server_time: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Ping 檢測錯誤:', error);
        res.status(500).json({
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
// POST /api/sync/retry - 重試失敗的同步項目
router.post('/retry', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { syncIds } = req.body;
        if (!Array.isArray(syncIds)) {
            return res.status(400).json({ error: '同步項目 ID 格式錯誤' });
        }
        const results = {
            retried: [],
            errors: []
        };
        for (const syncId of syncIds) {
            try {
                // 獲取同步項目
                const syncItem = await db.get('SELECT * FROM sync_queue WHERE id = ? AND user_id = ?', [syncId, currentUser.id]);
                if (!syncItem) {
                    results.errors.push({ syncId, error: '同步項目不存在' });
                    continue;
                }
                // 檢查重試次數（最多重試 5 次）
                if (syncItem.retry_count >= 5) {
                    results.errors.push({ syncId, error: '重試次數超過限制' });
                    continue;
                }
                // 實施指數退避
                const backoffDelay = Math.min(1000 * Math.pow(2, syncItem.retry_count), 30000);
                // 更新重試次數和狀態
                await db.run('UPDATE sync_queue SET retry_count = retry_count + 1, status = "pending" WHERE id = ?', [syncId]);
                results.retried.push({ syncId, nextRetryIn: backoffDelay });
            }
            catch (error) {
                results.errors.push({ syncId, error: error.message });
            }
        }
        res.json({
            results,
            summary: {
                total: syncIds.length,
                retried: results.retried.length,
                errors: results.errors.length
            }
        });
    }
    catch (error) {
        console.error('重試同步錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});
//# sourceMappingURL=sync.js.map