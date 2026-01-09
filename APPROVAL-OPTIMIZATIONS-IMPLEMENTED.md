# 報表審核系統 - 優化措施實施報告

**版本**: v8.9.96-approval-audit-log  
**日期**: 2026-01-09  
**狀態**: ✅ 已完成 3/4 項優化

---

## 📊 實施總結

### ✅ 已完成的優化

#### 1. ✅ 審核歷史記錄表（Audit Log）

**目的**: 保留所有審核操作的完整歷史，即使授權被刪除也能追溯

**實施內容**:
- 創建 `approval_audit_log` 資料表
- 記錄所有審核操作（REQUEST, APPROVE, REJECT, REVOKE）
- 包含完整的用戶信息、時間戳、原因和元數據

**資料表結構**:
```sql
CREATE TABLE approval_audit_log (
  id TEXT PRIMARY KEY,
  authorization_id TEXT,
  action TEXT NOT NULL,           -- REQUEST/APPROVE/REJECT/REVOKE
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_role TEXT,
  user_dept TEXT,
  target_user_id TEXT,
  target_user_name TEXT,
  reason TEXT,
  created_at TEXT NOT NULL,
  metadata TEXT                   -- JSON format
)
```

**驗證**:
```bash
ssh root@165.227.147.40 "docker exec -w /app taskflow-pro node -e \"
const db = require('./node_modules/better-sqlite3')('/app/data/taskflow.db');
console.log(db.prepare('SELECT COUNT(*) as count FROM approval_audit_log').get());
db.close();
\""
```

---

#### 2. ✅ 後端日誌記錄和歷史追蹤

**目的**: 追蹤所有審核操作，便於審計和問題診斷

**實施內容**:
- 添加 `logAudit()` 輔助函數
- 在所有關鍵操作後記錄日誌
- Console 日誌格式：`[APPROVAL-AUDIT] ACTION - User: NAME - Auth: ID`

**修改文件**: `report-approval-routes-v2.js`

**添加的日誌點**:
1. **REQUEST** - 申請提交時
   ```javascript
   await logAudit(db, 'REQUEST', currentUser, approver, authId, reason, {
     ip: clientIp,
     userAgent: userAgent
   });
   ```

2. **APPROVE** - 批准時
   ```javascript
   await logAudit(db, 'APPROVE', currentUser, requester, authorizationId, reason, {
     ip: clientIp,
     expiresAt: expiresAt
   });
   ```

3. **REJECT** - 拒絕時
   ```javascript
   await logAudit(db, 'REJECT', currentUser, requester, authorizationId, reason, {});
   ```

4. **REVOKE** - 撤銷時
   ```javascript
   await logAudit(db, 'REVOKE', currentUser, null, authorizationId || 'all', '', {});
   ```

**查看日誌**:
```bash
ssh root@165.227.147.40 "docker logs taskflow-pro --tail 50 | grep APPROVAL-AUDIT"
```

---

#### 3. ✅ 手動清理過期授權腳本

**目的**: 提供手動清理過期授權記錄的工具

**腳本**: `manual-cleanup-expired.js`

**功能**:
- 查找所有過期但仍激活的授權
- 刪除過期授權
- 顯示清理統計信息

**使用方法**:
```bash
# 上傳腳本
Get-Content manual-cleanup-expired.js -Raw | ssh root@165.227.147.40 "cat > /tmp/cleanup.js"

# 執行清理
ssh root@165.227.147.40 "docker cp /tmp/cleanup.js taskflow-pro:/app/cleanup.js && docker exec -w /app taskflow-pro node cleanup.js"
```

**建議頻率**: 每週執行一次，或在發現異常時執行

---

### 📝 文檔和指南

#### 4. 📋 WebSocket 通知集成指南

**目的**: 當申請被批准/拒絕時通知申請者

**狀態**: 提供集成指南，需要手動實施

**文件**: `add-websocket-notifications.js`

**後端集成**（在 `report-approval-routes-v2.js` 中添加）:

**批准通知**:
```javascript
// After approval success
if (global.io) {
  global.io.emit('approval-granted', {
    userId: requester.id,
    userName: requester.name,
    approverName: currentUser.name,
    expiresAt: expiresAt,
    authorizationId: authorizationId
  });
}
```

**拒絕通知**:
```javascript
// After rejection
if (global.io) {
  global.io.emit('approval-rejected', {
    userId: requester.id,
    userName: requester.name,
    approverName: currentUser.name,
    reason: reason,
    authorizationId: authorizationId
  });
}
```

**前端集成**（在 `ReportView.tsx` 中添加）:
```typescript
useEffect(() => {
  const socket = (window as any).socket;
  if (!socket) return;

  const handleApprovalGranted = (data: any) => {
    if (data.userId === currentUser.id) {
      toast.success(`您的報表查看申請已被 ${data.approverName} 批准！`);
      checkAuthorizationStatus();
    }
  };

  const handleApprovalRejected = (data: any) => {
    if (data.userId === currentUser.id) {
      toast.error(`您的報表查看申請已被 ${data.approverName} 拒絕`);
    }
  };

  socket.on('approval-granted', handleApprovalGranted);
  socket.on('approval-rejected', handleApprovalRejected);

  return () => {
    socket.off('approval-granted', handleApprovalGranted);
    socket.off('approval-rejected', handleApprovalRejected);
  };
}, [currentUser.id]);
```

---

## 🔧 維護工具

### 查詢審核歷史

```bash
# 查詢所有審核記錄
ssh root@165.227.147.40 "docker exec -w /app taskflow-pro node -e \"
const db = require('./node_modules/better-sqlite3')('/app/data/taskflow.db');
const logs = db.prepare('SELECT * FROM approval_audit_log ORDER BY created_at DESC LIMIT 10').all();
console.log(JSON.stringify(logs, null, 2));
db.close();
\""

# 查詢特定用戶的審核記錄
ssh root@165.227.147.40 "docker exec -w /app taskflow-pro node -e \"
const db = require('./node_modules/better-sqlite3')('/app/data/taskflow.db');
const logs = db.prepare('SELECT * FROM approval_audit_log WHERE user_id = ? ORDER BY created_at DESC').all('USER_ID');
console.log(JSON.stringify(logs, null, 2));
db.close();
\""

# 統計審核操作
ssh root@165.227.147.40 "docker exec -w /app taskflow-pro node -e \"
const db = require('./node_modules/better-sqlite3')('/app/data/taskflow.db');
const stats = db.prepare('SELECT action, COUNT(*) as count FROM approval_audit_log GROUP BY action').all();
console.log(JSON.stringify(stats, null, 2));
db.close();
\""
```

### 清理過期授權

```bash
# 手動執行清理
Get-Content manual-cleanup-expired.js -Raw | ssh root@165.227.147.40 "cat > /tmp/cleanup.js"
ssh root@165.227.147.40 "docker cp /tmp/cleanup.js taskflow-pro:/app/cleanup.js && docker exec -w /app taskflow-pro node cleanup.js"
```

---

## 📊 系統狀態

**後端版本**: `v8.9.96-approval-audit-log`  
**前端版本**: Deploy ID `6960ad105bb7ddb7b3dbb802`（無需修改）  
**資料庫**: 
- ✅ `approval_audit_log` 表已創建
- ✅ 所有審核操作都會記錄

**已實施的優化**:
1. ✅ 審核歷史記錄表
2. ✅ 後端日誌記錄
3. ✅ 手動清理腳本
4. 📋 WebSocket 通知（提供集成指南）

---

## 🎯 優化效果

### 審計追蹤
- **修改前**: 授權被刪除後無法追溯
- **修改後**: 所有操作永久記錄在 `approval_audit_log` 表

### 問題診斷
- **修改前**: 只能通過前端錯誤推測問題
- **修改後**: 完整的 Console 日誌和資料庫記錄

### 系統維護
- **修改前**: 過期授權需要手動查詢和刪除
- **修改後**: 一鍵執行清理腳本

### 用戶體驗
- **未來**: 添加 WebSocket 通知後，申請者會立即收到批准/拒絕通知

---

## 📝 下一步建議

### 短期（可選）
1. 實施 WebSocket 通知（按照集成指南）
2. 設置定期清理任務（cron job）
3. 創建審核報表查詢工具

### 中期（增強）
1. 添加審核統計儀表板
2. 導出審核記錄為 CSV
3. 添加異常行為檢測

### 長期（擴展）
1. 多級審核支持
2. 自定義授權時長
3. 審核流程自動化

---

## 🔐 安全和合規

### 審計追蹤
- ✅ 所有操作記錄用戶 ID、姓名、角色、部門
- ✅ 記錄操作時間和原因
- ✅ 記錄 IP 地址和 User Agent
- ✅ 即使授權被刪除，歷史記錄仍保留

### 數據保留
- 審核歷史記錄永久保存
- 建議定期備份 `approval_audit_log` 表
- 可根據合規要求設置保留期限

---

## 📞 維護命令速查

```bash
# 查看最近的審核日誌
ssh root@165.227.147.40 "docker logs taskflow-pro --tail 100 | grep APPROVAL-AUDIT"

# 執行健康檢查
ssh root@165.227.147.40 "docker exec -w /app taskflow-pro node health-check.js"

# 手動清理過期授權
Get-Content manual-cleanup-expired.js -Raw | ssh root@165.227.147.40 "cat > /tmp/cleanup.js"
ssh root@165.227.147.40 "docker cp /tmp/cleanup.js taskflow-pro:/app/cleanup.js && docker exec -w /app taskflow-pro node cleanup.js"

# 查詢審核統計
ssh root@165.227.147.40 "docker exec -w /app taskflow-pro node -e \"
const db = require('./node_modules/better-sqlite3')('/app/data/taskflow.db');
const stats = db.prepare('SELECT action, COUNT(*) as count FROM approval_audit_log GROUP BY action').all();
console.log(JSON.stringify(stats, null, 2));
db.close();
\""
```

---

**最後更新**: 2026-01-09  
**實施者**: AI Assistant  
**狀態**: ✅ 生產環境已部署
