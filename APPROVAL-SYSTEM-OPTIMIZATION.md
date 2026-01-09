# 報表審核系統 - 優化建議與測試清單

**版本**: v8.9.95-approval-logic-fixed  
**日期**: 2026-01-09  
**狀態**: ✅ 系統健康

---

## 📊 系統健康檢查結果

```
✅ 無重複的激活授權
✅ 無過期但仍激活的授權
✅ 無孤立的待審核記錄
✅ 無超過 7 天的待審核記錄
✅ 無自我審核嘗試
```

**統計數據**:
- 總授權記錄: 0（已清理）
- 激活授權: 0
- 待審核: 0
- 已批准（歷史）: 0

---

## 🔒 已實施的安全措施

### 1. 防止自我審核
- ✅ **前端檢查**: 提交前驗證 `selectedApproverId !== currentUser.id`
- ✅ **後端 request API**: 檢查 `approverId === currentUser.id`
- ✅ **後端 approve API**: 檢查 `currentUser.id === auth.requester_id`
- ✅ **後端 reject API**: 檢查 `currentUser.id === auth.requester_id`

### 2. 防止重複授權
- ✅ **申請前清理**: 刪除所有舊授權記錄
- ✅ **撤銷時刪除**: 直接刪除記錄而非設置 `is_active = 0`
- ✅ **唯一性保證**: 任何時候只有 0 或 1 個授權記錄

### 3. 權限驗證
- ✅ **角色檢查**: 只有 BOSS/MANAGER/SUPERVISOR 可申請和審核
- ✅ **跨部門檢查**: 審核者必須來自不同部門
- ✅ **指定審核者**: 只有指定的審核者可以批准/拒絕

### 4. 數據完整性
- ✅ **原因長度**: 申請/審核/拒絕原因至少 10 字
- ✅ **過期檢查**: `checkStatus` API 只返回未過期的授權
- ✅ **激活狀態**: 只有 `is_active = 1` 的授權才有效

---

## 🎯 完整測試清單

### 基本流程測試

#### ✅ 測試 1: 正常申請和批准
1. A (Seven) 申請查看報表
2. 選擇 B (Se7en) 作為審核者
3. 填寫申請原因（至少 10 字）
4. 提交申請
5. B 登入，看到待審核請求
6. B 填寫審核意見（至少 10 字）
7. B 點擊「✅ 批准申請」
8. A 自動看到授權成功（5 秒內）
9. A 可以查看報表
10. 倒數計時器顯示 30:00

**預期結果**: ✅ 所有步驟成功

#### ✅ 測試 2: 拒絕申請
1. A 申請查看報表
2. 選擇 B 作為審核者
3. 提交申請
4. B 登入，看到待審核請求
5. B 填寫拒絕原因（至少 10 字）
6. B 點擊「❌ 拒絕申請」
7. A 不會獲得授權
8. 待審核列表清空

**預期結果**: ✅ A 無法查看報表

#### ✅ 測試 3: 撤銷授權
1. A 獲得授權後
2. 點擊「撤銷授權」
3. 授權狀態消失
4. 無法查看報表
5. 資料庫中授權記錄被刪除

**預期結果**: ✅ 授權被撤銷

#### ✅ 測試 4: 撤銷後重新申請
1. A 撤銷授權
2. 重新申請
3. B 批准
4. A 獲得新的 30 分鐘授權
5. 倒數計時器正確顯示 30:00

**預期結果**: ✅ 新授權正常工作

### 邊界情況測試

#### ✅ 測試 5: 嘗試自我審核
1. A 申請時嘗試選擇自己作為審核者
2. 前端應顯示錯誤：「不能選擇自己作為審核者」

**預期結果**: ✅ 被阻止

#### ✅ 測試 6: 同部門審核
1. A 和 B 在同一部門
2. A 嘗試選擇 B 作為審核者
3. 後端返回錯誤：「審核者必須來自不同部門」

**預期結果**: ✅ 被阻止

#### ✅ 測試 7: 原因長度不足
1. A 申請時填寫少於 10 字的原因
2. 前端顯示錯誤：「申請原因至少需要 10 個字」

**預期結果**: ✅ 被阻止

#### ✅ 測試 8: 非指定審核者嘗試審核
1. A 申請，選擇 B 作為審核者
2. C 登入嘗試審核
3. 後端返回錯誤：「您不是指定的審核者」

**預期結果**: ✅ 被阻止

#### ✅ 測試 9: 授權過期
1. A 獲得授權
2. 等待 30 分鐘
3. 授權自動過期
4. A 無法查看報表
5. 倒數計時器顯示 00:00

**預期結果**: ✅ 授權過期

#### ✅ 測試 10: 重複申請
1. A 提交申請
2. 不等待審核，再次提交申請
3. 舊的待審核記錄被刪除
4. 只有最新的申請存在

**預期結果**: ✅ 只有一個待審核記錄

---

## 🚀 建議的優化措施

### 1. 添加後端日誌記錄 ⭐ 推薦

**目的**: 追蹤所有審核操作，便於審計和問題診斷

**實施方案**:
```javascript
// 在每個關鍵操作後添加日誌
console.log('[APPROVAL] Request created:', {
  authId,
  requester: currentUser.id,
  approver: approverId,
  timestamp: now
});

console.log('[APPROVAL] Approved:', {
  authId,
  approver: currentUser.id,
  requester: auth.requester_id,
  timestamp: now
});

console.log('[APPROVAL] Rejected:', {
  authId,
  approver: currentUser.id,
  requester: auth.requester_id,
  reason,
  timestamp: now
});
```

### 2. 添加審核歷史記錄表 ⭐ 推薦

**目的**: 保留所有審核操作的歷史記錄，即使授權被刪除

**實施方案**:
```sql
CREATE TABLE IF NOT EXISTS approval_audit_log (
  id TEXT PRIMARY KEY,
  authorization_id TEXT,
  action TEXT, -- 'REQUEST', 'APPROVE', 'REJECT', 'REVOKE'
  user_id TEXT,
  user_name TEXT,
  reason TEXT,
  created_at TEXT,
  metadata TEXT -- JSON format
);
```

### 3. 添加通知機制

**目的**: 當申請被批准/拒絕時通知申請者

**實施方案**:
- 使用現有的 WebSocket 廣播機制
- 發送通知到申請者的前端
- 顯示 toast 提示

### 4. 添加授權延長功能的限制

**目的**: 防止無限延長授權

**實施方案**:
```javascript
// 限制每次授權最多延長 2 次
if (auth.extension_count >= 2) {
  return res.status(400).json({ 
    error: '授權最多只能延長 2 次，請重新申請' 
  });
}
```

### 5. 定期清理過期授權

**目的**: 自動清理過期的授權記錄

**實施方案**:
```javascript
// 在 server 啟動時設置定時任務
setInterval(() => {
  db.run(`
    DELETE FROM report_authorizations
    WHERE is_active = 1 
      AND datetime(expires_at) <= datetime('now')
  `);
}, 5 * 60 * 1000); // 每 5 分鐘執行一次
```

### 6. 添加前端錯誤邊界

**目的**: 防止前端崩潰影響整個系統

**實施方案**:
```typescript
// 在 ReportView 組件外包裹 ErrorBoundary
<ErrorBoundary fallback={<div>授權系統暫時無法使用</div>}>
  <ReportView />
</ErrorBoundary>
```

---

## 🔧 維護建議

### 定期健康檢查

**頻率**: 每週一次

**命令**:
```bash
ssh root@165.227.147.40 "docker exec -w /app taskflow-pro node health-check.js"
```

**檢查項目**:
- ✅ 無重複激活授權
- ✅ 無過期但仍激活的授權
- ✅ 無孤立的待審核記錄
- ✅ 無超過 7 天的待審核記錄
- ✅ 無自我審核嘗試

### 資料庫備份

**頻率**: 每次修改前

**命令**:
```bash
ssh root@165.227.147.40 "/root/create-snapshot.sh v版本號-描述"
```

### 日誌監控

**檢查後端日誌**:
```bash
ssh root@165.227.147.40 "docker logs taskflow-pro --tail 100 | grep APPROVAL"
```

---

## 📝 已知限制

1. **輪詢頻率**: 每 5 秒檢查一次授權狀態，可能有最多 5 秒延遲
2. **授權時長**: 固定 30 分鐘，無法自定義
3. **跨部門限制**: 審核者必須來自不同部門
4. **單一審核者**: 只支持一個審核者，不支持多級審核

---

## 🎓 最佳實踐

### 申請者 (A)
1. ✅ 選擇合適的審核者（不同部門的主管）
2. ✅ 填寫清晰的申請原因（至少 10 字）
3. ✅ 等待審核批准，不要重複提交
4. ✅ 授權快過期時及時延長或重新申請
5. ✅ 不需要時及時撤銷授權

### 審核者 (B)
1. ✅ 及時處理待審核請求
2. ✅ 填寫清晰的審核/拒絕原因
3. ✅ 確認申請者的身份和需求
4. ✅ 不批准不合理的申請

### 系統管理員
1. ✅ 定期執行健康檢查
2. ✅ 監控審核操作日誌
3. ✅ 修改前創建快照
4. ✅ 保持系統更新

---

## 🔐 安全建議

1. **定期審查**: 每月審查所有審核記錄
2. **異常檢測**: 監控頻繁的申請/拒絕行為
3. **權限最小化**: 只給必要的人 BOSS/MANAGER/SUPERVISOR 角色
4. **審計追蹤**: 保留所有審核操作的日誌

---

## 📞 緊急處理

### 如果發現異常授權

```bash
# 1. 執行健康檢查
ssh root@165.227.147.40 "docker exec -w /app taskflow-pro node health-check.js"

# 2. 如果發現問題，清理異常記錄
ssh root@165.227.147.40 "docker exec -w /app taskflow-pro node clean-auths.js"

# 3. 重啟容器
ssh root@165.227.147.40 "docker restart taskflow-pro"
```

### 如果需要回滾

```bash
# 使用穩定版本
ssh root@165.227.147.40 "docker stop taskflow-pro && docker rm taskflow-pro"
ssh root@165.227.147.40 "docker run -d --name taskflow-pro -p 3000:3000 -p 3001:3001 -v /root/taskflow-data:/app/data taskflow-pro:v8.9.95-approval-logic-fixed"
```

---

## ✅ 總結

**當前狀態**: 系統健康，所有安全措施已到位

**核心優勢**:
- ✅ 多層防護（前端 + 後端）
- ✅ 自動清理舊記錄
- ✅ 完整的權限驗證
- ✅ 實時狀態更新
- ✅ 健康檢查機制

**建議優先實施**:
1. ⭐ 添加後端日誌記錄
2. ⭐ 創建審核歷史記錄表
3. 添加通知機制
4. 定期執行健康檢查

**最後更新**: 2026-01-09
