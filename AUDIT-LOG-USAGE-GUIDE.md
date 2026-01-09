# 審核歷史查看功能 - 使用指南

**版本**: v8.9.97-audit-log-api  
**日期**: 2026-01-09  
**狀態**: ✅ 後端 API 已完成，前端組件已創建

---

## 📊 **功能概述**

審核歷史查看功能允許管理階層（BOSS/MANAGER/SUPERVISOR）查看所有報表審核操作的完整歷史記錄。

### **權限控制**
- **BOSS/MANAGER**: 可以查看所有審核記錄
- **SUPERVISOR**: 只能查看自己部門相關的審核記錄
- **EMPLOYEE**: 無權訪問

---

## 🔧 **後端 API**

### **端點**: `GET /api/reports/approval/audit-log`

### **查詢參數**

| 參數 | 類型 | 說明 | 預設值 |
|-----|------|------|--------|
| `action` | string | 操作類型篩選（ALL/REQUEST/APPROVE/REJECT/REVOKE） | ALL |
| `startDate` | string | 開始日期（ISO 格式） | - |
| `endDate` | string | 結束日期（ISO 格式） | - |
| `limit` | number | 每頁記錄數 | 50 |
| `offset` | number | 偏移量（分頁） | 0 |

### **響應格式**

```json
{
  "success": true,
  "logs": [
    {
      "id": "audit-1234567890",
      "authorization_id": "auth-1234567890",
      "action": "APPROVE",
      "user_id": "user-123",
      "user_name": "Se7en",
      "user_role": "MANAGER",
      "user_dept": "系統資訊部",
      "target_user_id": "user-456",
      "target_user_name": "Seven",
      "reason": "同意查看報表",
      "created_at": "2026-01-09T15:30:00.000Z",
      "metadata": "{\"ip\":\"127.0.0.1\"}"
    }
  ],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

### **使用範例**

```bash
# 查詢所有記錄
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://165.227.147.40:3001/api/reports/approval/audit-log"

# 查詢批准操作
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://165.227.147.40:3001/api/reports/approval/audit-log?action=APPROVE"

# 查詢日期範圍
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://165.227.147.40:3001/api/reports/approval/audit-log?startDate=2026-01-01&endDate=2026-01-09"

# 分頁查詢
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://165.227.147.40:3001/api/reports/approval/audit-log?limit=20&offset=40"
```

---

## 💻 **前端集成**

### **已創建的組件**: `components/AuditLogView.tsx`

### **組件特性**

1. **篩選功能**
   - 操作類型篩選（全部/申請/批准/拒絕/撤銷）
   - 日期範圍篩選
   - 一鍵清除篩選

2. **分頁功能**
   - 每頁 20 條記錄
   - 頁碼導航
   - 上一頁/下一頁按鈕

3. **數據顯示**
   - 操作時間
   - 操作類型（帶顏色標籤）
   - 操作者信息（姓名、部門、角色）
   - 目標用戶
   - 操作原因

### **集成方式 1: 添加到 ReportView 標籤頁**

修改 `components/ReportView.tsx`：

```typescript
import { AuditLogView } from './AuditLogView';

// 在組件中添加新的標籤頁狀態
const [activeTab, setActiveTab] = useState<'worklogs' | 'reports' | 'audit'>('worklogs');

// 在標籤頁切換按鈕中添加
<button
  onClick={() => setActiveTab('audit')}
  className={`px-4 py-2 rounded-lg font-bold transition ${
    activeTab === 'audit'
      ? 'bg-blue-600 text-white'
      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
  }`}
>
  📋 審核歷史
</button>

// 在內容區域添加
{activeTab === 'audit' && (
  <AuditLogView currentUser={currentUser} />
)}
```

### **集成方式 2: 創建獨立頁面**

在 `App.tsx` 中添加新的路由：

```typescript
import { AuditLogView } from './components/AuditLogView';

// 在路由配置中添加
{currentView === 'audit-log' && currentUser && (
  <AuditLogView currentUser={currentUser} />
)}
```

### **集成方式 3: 添加到系統設定**

在系統設定頁面添加「審核歷史」選項，點擊後顯示 `AuditLogView` 組件。

---

## 🎨 **UI 設計**

### **操作類型標籤顏色**

- 📤 **申請** (REQUEST): 藍色 `bg-blue-100 text-blue-800`
- ✅ **批准** (APPROVE): 綠色 `bg-green-100 text-green-800`
- ❌ **拒絕** (REJECT): 紅色 `bg-red-100 text-red-800`
- 🔄 **撤銷** (REVOKE): 灰色 `bg-gray-100 text-gray-800`

### **響應式設計**

- 桌面版：完整表格顯示
- 移動版：自動適應（已包含 `overflow-x-auto`）

---

## 📝 **數據結構**

### **審核日誌記錄**

```typescript
interface AuditLog {
  id: string;                    // 記錄 ID
  authorization_id: string;      // 授權 ID
  action: string;                // 操作類型
  user_id: string;               // 操作者 ID
  user_name: string;             // 操作者姓名
  user_role: string;             // 操作者角色
  user_dept: string;             // 操作者部門
  target_user_id: string;        // 目標用戶 ID
  target_user_name: string;      // 目標用戶姓名
  reason: string;                // 操作原因
  created_at: string;            // 操作時間
  metadata: string;              // 元數據（JSON 格式）
}
```

---

## 🔍 **查詢範例**

### **前端 API 調用**

```typescript
import { api } from '../services/api';

// 查詢所有記錄
const response = await api.reports.approval.getAuditLog();

// 查詢批准操作
const response = await api.reports.approval.getAuditLog({
  action: 'APPROVE'
});

// 查詢日期範圍
const response = await api.reports.approval.getAuditLog({
  startDate: '2026-01-01',
  endDate: '2026-01-09'
});

// 分頁查詢
const response = await api.reports.approval.getAuditLog({
  limit: 20,
  offset: 40
});

// 組合查詢
const response = await api.reports.approval.getAuditLog({
  action: 'APPROVE',
  startDate: '2026-01-01',
  endDate: '2026-01-09',
  limit: 20,
  offset: 0
});
```

---

## 🚀 **部署狀態**

### **後端**
- ✅ API 路由已創建
- ✅ 權限控制已實現
- ✅ 篩選和分頁已實現
- ✅ 已部署到 `v8.9.97-audit-log-api`

### **前端**
- ✅ `AuditLogView.tsx` 組件已創建
- ✅ API 調用方法已添加到 `services/api.ts`
- ⏳ 等待集成到主應用（用戶可選擇集成方式）

---

## 📊 **統計功能（可選擴展）**

如果需要添加統計功能，可以創建額外的 API：

```javascript
// GET /api/reports/approval/audit-stats
router.get('/approval/audit-stats', async (req, res) => {
  const stats = {
    total: db.prepare('SELECT COUNT(*) as count FROM approval_audit_log').get().count,
    byAction: db.prepare('SELECT action, COUNT(*) as count FROM approval_audit_log GROUP BY action').all(),
    byUser: db.prepare('SELECT user_name, COUNT(*) as count FROM approval_audit_log GROUP BY user_id ORDER BY count DESC LIMIT 10').all()
  };
  res.json({ success: true, stats });
});
```

---

## 🔐 **安全性**

1. **權限驗證**: 每個請求都經過 `authenticateToken` 中間件驗證
2. **角色檢查**: 只有 BOSS/MANAGER/SUPERVISOR 可以訪問
3. **部門隔離**: SUPERVISOR 只能看到自己部門的記錄
4. **SQL 注入防護**: 使用參數化查詢

---

## 📞 **測試方法**

### **1. 測試 API 端點**

```bash
# 使用有效的 token 測試
TOKEN="YOUR_AUTH_TOKEN"

curl -H "Authorization: Bearer $TOKEN" \
  "http://165.227.147.40:3001/api/reports/approval/audit-log?limit=5"
```

### **2. 測試權限控制**

```bash
# 使用 EMPLOYEE 角色的 token（應該返回 403）
curl -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
  "http://165.227.147.40:3001/api/reports/approval/audit-log"
```

### **3. 測試篩選功能**

```bash
# 測試操作類型篩選
curl -H "Authorization: Bearer $TOKEN" \
  "http://165.227.147.40:3001/api/reports/approval/audit-log?action=APPROVE"

# 測試日期篩選
curl -H "Authorization: Bearer $TOKEN" \
  "http://165.227.147.40:3001/api/reports/approval/audit-log?startDate=2026-01-09"
```

---

## 💡 **使用建議**

1. **定期查看**: 建議每週查看一次審核記錄
2. **異常檢測**: 注意頻繁的拒絕操作或異常的申請模式
3. **合規審計**: 保留審核記錄用於合規檢查
4. **性能優化**: 如果記錄過多，考慮添加索引或歸檔舊記錄

---

## 🎯 **下一步**

### **立即可用**
- ✅ 後端 API 已完全可用
- ✅ 可以通過 API 直接查詢審核記錄

### **需要集成**
- 📝 選擇集成方式（標籤頁/獨立頁面/系統設定）
- 📝 在主應用中導入 `AuditLogView` 組件
- 📝 部署前端更新

### **可選擴展**
- 📊 添加統計儀表板
- 📥 添加導出為 CSV 功能
- 🔔 添加異常行為警報
- 📈 添加圖表可視化

---

**最後更新**: 2026-01-09  
**後端版本**: v8.9.97-audit-log-api  
**狀態**: ✅ 後端完成，前端組件已創建，等待集成
