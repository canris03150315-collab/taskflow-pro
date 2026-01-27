# KOL 管理系統完整架構分析

**分析日期**: 2026-01-26  
**當前版本**: v8.9.170-ai-assistant-fixed  
**分析狀態**: ✅ 完整深度分析完成

---

## 📋 目錄

1. [系統概述](#系統概述)
2. [資料庫架構](#資料庫架構)
3. [後端 API 架構](#後端-api-架構)
4. [前端組件架構](#前端組件架構)
5. [業務邏輯流程](#業務邏輯流程)
6. [部門權限系統](#部門權限系統)
7. [數據流向分析](#數據流向分析)
8. [關鍵功能實現](#關鍵功能實現)
9. [與其他模組的連動](#與其他模組的連動)
10. [潛在問題與改進建議](#潛在問題與改進建議)

---

## 1. 系統概述

### 1.1 功能定位
KOL 管理系統是 TaskFlow Pro 的核心業務模組之一，用於管理網紅（KOL）的資料、合約和支付記錄。

### 1.2 核心功能
- **KOL 檔案管理**：新增、編輯、刪除、查詢 KOL 基本資料
- **合約管理**：管理 KOL 的合作合約，包含工資、訂金、未付金額等
- **支付記錄**：記錄每次支付，自動更新合約的未付金額
- **統計分析**：總 KOL 數、活躍 KOL、未付款項、本月支出等
- **Excel 導入/匯出**：批量導入 KOL 資料，匯出報表
- **操作日誌**：記錄所有 KOL 相關操作的審計追蹤

### 1.3 支援平台
- Facebook (📘)
- Instagram (📸)
- YouTube (🎬)
- TikTok (🎵)
- Threads (🧵)
- 其他 (🌐)

---

## 2. 資料庫架構

### 2.1 表結構總覽

```
kol_profiles (KOL 檔案)
    ↓ (1:N)
kol_contracts (合約)
    ↓ (1:N)
kol_payments (支付記錄)

kol_operation_logs (操作日誌) - 獨立審計表
```

### 2.2 kol_profiles 表（KOL 檔案）

```sql
CREATE TABLE kol_profiles (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL DEFAULT 'FACEBOOK',        -- 平台類型
  platform_id TEXT NOT NULL,                        -- 平台 ID（通用）
  facebook_id TEXT NOT NULL,                        -- 臉書 ID（向後兼容）
  platform_account TEXT NOT NULL,                   -- 平台帳號
  contact_info TEXT,                                -- 聯絡方式
  status TEXT NOT NULL DEFAULT 'ACTIVE',            -- 狀態：ACTIVE/STOPPED/NEGOTIATING/LOST_CONTACT
  status_color TEXT,                                -- 狀態顏色：green/yellow/red
  weekly_pay_note TEXT,                             -- 週薪備註
  notes TEXT,                                       -- 備註
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  department_id TEXT,                               -- 部門 ID（關鍵欄位）
  UNIQUE(facebook_id, platform_account)
);

-- 索引
CREATE INDEX idx_kol_profiles_status ON kol_profiles(status);
CREATE INDEX idx_kol_profiles_dept ON kol_profiles(department_id);
```

**關鍵欄位說明**：
- `platform_id` 和 `facebook_id`：雙重存儲以支援多平台和向後兼容
- `status_color`：前端顯示用的顏色標記（綠/黃/紅）
- `weekly_pay_note`：週薪備註，用於快速查看支付狀態
- `department_id`：**部門隔離的關鍵欄位**

### 2.3 kol_contracts 表（合約）

```sql
CREATE TABLE kol_contracts (
  id TEXT PRIMARY KEY,
  kol_id TEXT NOT NULL,                             -- 關聯 KOL
  start_date TEXT,                                  -- 開始日期
  end_date TEXT,                                    -- 到期日
  salary_amount REAL NOT NULL DEFAULT 0,            -- 工資/傭金
  deposit_amount REAL NOT NULL DEFAULT 0,           -- 訂金
  unpaid_amount REAL NOT NULL DEFAULT 0,            -- 未付金額
  cleared_amount REAL NOT NULL DEFAULT 0,           -- 截清金額
  total_paid REAL NOT NULL DEFAULT 0,               -- 總付金額
  contract_type TEXT NOT NULL DEFAULT 'NORMAL',     -- 合約類型：NORMAL/ADVANCE/ACTIVITY/VIDEO
  notes TEXT,                                       -- 備註
  weekly_notes TEXT,                                -- 週記備註
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  department_id TEXT,                               -- 部門 ID
  FOREIGN KEY (kol_id) REFERENCES kol_profiles(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_kol_contracts_kol_id ON kol_contracts(kol_id);
CREATE INDEX idx_kol_contracts_dates ON kol_contracts(start_date, end_date);
CREATE INDEX idx_kol_contracts_dept ON kol_contracts(department_id);
```

**金額邏輯**：
- `salary_amount`：合約總金額
- `deposit_amount`：預付訂金
- `unpaid_amount`：尚未支付的金額（初始值 = salary_amount）
- `total_paid`：已支付總額（通過 payments 累加）
- `cleared_amount`：截清金額（特殊用途）

**自動計算**：
- 每次新增支付記錄時：
  - `total_paid += payment.amount`
  - `unpaid_amount -= payment.amount`

### 2.4 kol_payments 表（支付記錄）

```sql
CREATE TABLE kol_payments (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL,                        -- 關聯合約
  payment_date TEXT NOT NULL,                       -- 支付日期
  amount REAL NOT NULL,                             -- 支付金額
  payment_type TEXT NOT NULL DEFAULT 'SALARY',      -- 支付類型：DEPOSIT/SALARY/ADVANCE/ACTIVITY
  notes TEXT,                                       -- 備註
  attachment TEXT,                                  -- 附件（未使用）
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  FOREIGN KEY (contract_id) REFERENCES kol_contracts(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_kol_payments_contract_id ON kol_payments(contract_id);
CREATE INDEX idx_kol_payments_date ON kol_payments(payment_date);
```

### 2.5 kol_operation_logs 表（操作日誌）

```sql
CREATE TABLE kol_operation_logs (
  id TEXT PRIMARY KEY,
  operation_type TEXT NOT NULL,                     -- 操作類型：CREATE/UPDATE/DELETE/IMPORT/BATCH_CREATE
  target_type TEXT NOT NULL,                        -- 目標類型：KOL_PROFILE/KOL_CONTRACT/KOL_PAYMENT
  target_id TEXT NOT NULL,                          -- 目標 ID
  user_id TEXT NOT NULL,                            -- 操作用戶 ID
  user_name TEXT NOT NULL,                          -- 操作用戶名稱
  changes TEXT,                                     -- 變更內容（JSON）
  created_at TEXT NOT NULL
);

-- 索引
CREATE INDEX idx_kol_logs_target ON kol_operation_logs(target_type, target_id);
CREATE INDEX idx_kol_logs_user ON kol_operation_logs(user_id);
```

---

## 3. 後端 API 架構

### 3.1 路由文件位置
- **文件**: `/app/dist/routes/kol.js`
- **總行數**: 570 行
- **掛載路徑**: `/api/kol`

### 3.2 中間件

#### authenticateToken
- **來源**: `../middleware/auth`
- **功能**: JWT 驗證，設置 `req.user`

#### checkKOLPermission
```javascript
function checkKOLPermission(req, res, next) {
  const currentUser = req.user;
  if (!currentUser) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
}
```
- **功能**: 檢查用戶是否已登入
- **權限**: 所有已登入用戶都可訪問 KOL 管理

### 3.3 輔助函數

#### dbCall
```javascript
function dbCall(db, method, ...args) {
  if (typeof db[method] === 'function') {
    return db[method](...args);
  }
  if (db.db && typeof db.db[method] === 'function') {
    return db.db[method](...args);
  }
  throw new Error(`Method ${method} not found on database object`);
}
```
- **功能**: 統一資料庫調用接口，支援不同資料庫包裝器

#### logOperation
```javascript
function logOperation(db, operationType, targetType, targetId, userId, userName, changes) {
  const logId = uuidv4();
  const now = new Date().toISOString();
  dbCall(db, 'prepare', `
    INSERT INTO kol_operation_logs (id, operation_type, target_type, target_id, user_id, user_name, changes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(logId, operationType, targetType, targetId, userId, userName, JSON.stringify(changes), now);
}
```
- **功能**: 記錄所有 KOL 操作到審計日誌

### 3.4 API 端點總覽

#### KOL 檔案管理
| 方法 | 路徑 | 功能 | 部門過濾 |
|------|------|------|----------|
| GET | `/profiles` | 獲取 KOL 列表 | ✅ |
| GET | `/profiles/:id` | 獲取 KOL 詳情 | ❌ |
| POST | `/profiles` | 新增 KOL | ✅ |
| PUT | `/profiles/:id` | 更新 KOL | ❌ |
| DELETE | `/profiles/:id` | 刪除 KOL | ❌ |

#### 合約管理
| 方法 | 路徑 | 功能 | 部門過濾 |
|------|------|------|----------|
| GET | `/contracts` | 獲取合約列表 | ✅ |
| POST | `/contracts` | 新增合約 | ✅ |
| PUT | `/contracts/:id` | 更新合約 | ❌ |
| DELETE | `/contracts/:id` | 刪除合約 | ❌ |

#### 支付記錄
| 方法 | 路徑 | 功能 | 部門過濾 |
|------|------|------|----------|
| GET | `/payments` | 獲取支付列表 | ❌ |
| POST | `/payments` | 新增支付 | ❌ |
| DELETE | `/payments/:id` | 刪除支付 | ❌ |

#### 統計與工具
| 方法 | 路徑 | 功能 | 部門過濾 |
|------|------|------|----------|
| GET | `/stats` | 獲取統計數據 | ✅ |
| POST | `/import-excel` | Excel 導入 | ✅ |
| GET | `/export-excel` | Excel 匯出 | ❌ |
| POST | `/batch/payments` | 批量支付 | ❌ |

### 3.5 關鍵 API 詳解

#### GET /profiles（獲取 KOL 列表）

**請求參數**：
```typescript
{
  status?: 'ACTIVE' | 'STOPPED' | 'NEGOTIATING' | 'LOST_CONTACT' | 'ALL',
  search?: string,
  departmentId?: string
}
```

**部門過濾邏輯**：
```javascript
const userDept = req.query.departmentId || currentUser.department;
let query = 'SELECT * FROM kol_profiles WHERE (department_id = ? OR department_id IS NULL)';
```

**重要特性**：
- 支援 `department_id IS NULL` 的記錄（全公司共用）
- 自動計算每個 KOL 的統計數據：
  - `contractCount`：合約總數
  - `activeContracts`：活躍合約數
  - `totalUnpaid`：未付總額

**響應**：
```typescript
{
  profiles: Array<{
    ...profile,
    contractCount: number,
    activeContracts: number,
    totalUnpaid: number
  }>
}
```

#### POST /payments（新增支付）

**自動更新合約金額**：
```javascript
// 1. 新增支付記錄
INSERT INTO kol_payments (id, contract_id, payment_date, amount, payment_type, notes, created_at, created_by)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)

// 2. 自動更新合約
UPDATE kol_contracts 
SET total_paid = total_paid + ?, 
    unpaid_amount = unpaid_amount - ?, 
    updated_at = ? 
WHERE id = ?
```

**關鍵邏輯**：
- 支付金額會立即反映在合約的 `total_paid` 和 `unpaid_amount`
- 刪除支付時會反向更新合約金額

#### POST /import-excel（Excel 導入）

**導入邏輯**：
```javascript
for (let i = 0; i < data.length; i++) {
  const row = data[i];
  
  // 1. 檢查 KOL 是否存在
  const existing = db.prepare('SELECT id FROM kol_profiles WHERE facebook_id = ? OR platform_account = ?')
    .get(row.facebookId || row.platformAccount, row.platformAccount || row.facebookId);
  
  if (existing) {
    // 2a. 更新現有 KOL
    db.prepare('UPDATE kol_profiles SET contact_info = ?, status = ?, notes = ?, updated_at = ? WHERE id = ?')
      .run(row.contactInfo, row.status, row.notes, now, existing.id);
    
    // 2b. 如果有工資資料，新增合約
    if (row.salaryAmount) {
      db.prepare('INSERT INTO kol_contracts (...) VALUES (...)').run(...);
    }
  } else {
    // 3a. 新增 KOL
    db.prepare('INSERT INTO kol_profiles (...) VALUES (...)').run(...);
    
    // 3b. 如果有工資資料，新增合約
    if (row.salaryAmount) {
      db.prepare('INSERT INTO kol_contracts (...) VALUES (...)').run(...);
    }
  }
}
```

**特性**：
- 支援更新現有 KOL 或新增新 KOL
- 自動創建合約（如果提供工資資料）
- 返回成功/失敗統計和錯誤詳情

---

## 4. 前端組件架構

### 4.1 主組件
- **文件**: `components/KOLManagementView.tsx`
- **總行數**: 1662 行
- **組件類型**: 功能組件（React Hooks）

### 4.2 狀態管理

```typescript
const [profiles, setProfiles] = useState<KOLProfile[]>([]);
const [contracts, setContracts] = useState<KOLContract[]>([]);
const [payments, setPayments] = useState<KOLPayment[]>([]);
const [stats, setStats] = useState<KOLStats | null>(null);
const [loading, setLoading] = useState(true);
const [activeView, setActiveView] = useState<'profiles' | 'contracts' | 'payments'>('profiles');
const [statusFilter, setStatusFilter] = useState<string>('ALL');
const [searchQuery, setSearchQuery] = useState('');
const [selectedProfile, setSelectedProfile] = useState<KOLProfile | null>(null);
const [selectedContract, setSelectedContract] = useState<KOLContract | null>(null);
const [selectedDept, setSelectedDept] = useState<string>(currentUser.department);
const [showAddModal, setShowAddModal] = useState(false);
const [showEditModal, setShowEditModal] = useState(false);
const [showDetailModal, setShowDetailModal] = useState(false);
const [showAddContractModal, setShowAddContractModal] = useState(false);
const [showEditContractModal, setShowEditContractModal] = useState(false);
const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
```

### 4.3 UI 結構

```
KOLManagementView
├── 統計卡片區（4 個卡片）
│   ├── 總 KOL 數
│   ├── 活躍 KOL
│   ├── 未付款項
│   └── 本月支出
├── 主導航標籤頁
│   ├── 👥 KOL 列表
│   ├── 📄 合約管理
│   └── 💰 支付記錄
├── 工具列
│   ├── 部門選擇器（僅主管可見）
│   ├── 狀態篩選器
│   ├── 搜尋框
│   ├── + 新增 KOL
│   ├── 📥 導入 Excel
│   └── 📤 匯出 Excel
└── 內容區
    ├── KOL 列表視圖（表格）
    ├── 合約列表視圖（表格）
    └── 支付記錄視圖（表格）
```

### 4.4 數據轉換邏輯

**snake_case → camelCase 轉換**：
```typescript
const transformedProfiles = profilesRes.profiles.map((p: any) => ({
  id: p.id,
  platform: p.platform || 'FACEBOOK',
  platformId: p.platform_id || p.platformId || p.facebook_id || p.facebookId,
  platformAccount: p.platform_account || p.platformAccount,
  contactInfo: p.contact_info || p.contactInfo,
  status: p.status,
  statusColor: (p.status_color || p.statusColor || 'green') as 'green' | 'yellow' | 'red',
  weeklyPayNote: p.weekly_pay_note || p.weeklyPayNote,
  notes: p.notes,
  createdAt: p.created_at || p.createdAt,
  updatedAt: p.updated_at || p.updatedAt,
  createdBy: p.created_by || p.createdBy,
  contractCount: p.contractCount,
  activeContracts: p.activeContracts,
  totalUnpaid: p.totalUnpaid
}));
```

**原因**：
- 後端使用 snake_case（資料庫慣例）
- 前端使用 camelCase（JavaScript 慣例）
- 需要雙向兼容以支援歷史數據

### 4.5 關鍵功能實現

#### 快速支付
```typescript
const handleQuickPayment = async (profile: KOLProfile) => {
  // 1. 獲取 KOL 的合約
  const contractsRes = await api.kol.getContracts({ kolId: profile.id });
  
  // 2. 檢查是否有合約
  if (contractsRes.contracts.length === 0) {
    alert('此 KOL 沒有合約，請先新增合約');
    setShowAddContractModal(true);
    return;
  }
  
  // 3. 使用第一個合約
  const contract = contractsRes.contracts[0];
  const remainingAmount = contract.unpaidAmount;
  
  // 4. 提示輸入金額
  const amount = prompt(`記錄支付金額（未付金額：$${remainingAmount}）：`);
  
  // 5. 驗證金額
  if (paymentAmount > remainingAmount) {
    alert(`支付金額不能超過未付金額！`);
    return;
  }
  
  // 6. 創建支付記錄
  await api.kol.createPayment({
    contractId: contract.id,
    paymentDate: new Date().toISOString().split('T')[0],
    amount: paymentAmount,
    paymentType: 'SALARY',
    notes: '快速支付'
  });
  
  // 7. 重新載入數據
  loadData();
};
```

#### Excel 導入
```typescript
const handleExcelImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  
  // 1. 讀取 Excel 文件
  const reader = new FileReader();
  reader.onload = async (e) => {
    const data = e.target?.result;
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(data, { type: 'binary' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    // 2. 格式化數據
    const formattedData = jsonData.map((row: any) => {
      const dateRange = parseDateRange(row['開始日期:到期日']);
      return {
        facebookId: row['臉書ID'] || row['平台ID'],
        platformAccount: row['平台帳號'],
        contactInfo: row['聯絡方式'],
        status: row['狀態'] || 'ACTIVE',
        notes: row['備註'],
        startDate: dateRange.start,
        endDate: dateRange.end,
        salaryAmount: parseFloat(row['工資/傭金'] || 0),
        depositAmount: parseFloat(row['訂金'] || 0),
        // ...
      };
    });
    
    // 3. 調用 API 導入
    const result = await api.kol.importExcel(formattedData);
    
    // 4. 顯示結果
    alert(`導入完成！\n成功: ${result.results.success} 筆\n失敗: ${result.results.failed} 筆`);
  };
  
  reader.readAsBinaryString(file);
};
```

---

## 5. 業務邏輯流程

### 5.1 新增 KOL 流程

```
用戶點擊「+ 新增 KOL」
    ↓
打開新增 Modal
    ↓
填寫 KOL 資料
    ↓
提交表單
    ↓
POST /api/kol/profiles
    ↓
後端驗證資料
    ↓
INSERT INTO kol_profiles
    ↓
記錄操作日誌
    ↓
返回新 KOL 資料
    ↓
前端重新載入列表
```

### 5.2 支付流程

```
用戶點擊「💰 支付」按鈕
    ↓
檢查 KOL 是否有合約
    ↓
顯示未付金額
    ↓
用戶輸入支付金額
    ↓
驗證金額（不能超過未付金額）
    ↓
POST /api/kol/payments
    ↓
後端處理：
  1. INSERT INTO kol_payments
  2. UPDATE kol_contracts (total_paid += amount, unpaid_amount -= amount)
  3. 記錄操作日誌
    ↓
返回支付記錄
    ↓
前端重新載入數據
    ↓
合約的未付金額自動更新
```

### 5.3 Excel 導入流程

```
用戶選擇 Excel 文件
    ↓
前端讀取並解析 Excel
    ↓
格式化數據（轉換欄位名稱）
    ↓
POST /api/kol/import-excel
    ↓
後端逐行處理：
  For each row:
    1. 檢查 KOL 是否存在（by facebook_id or platform_account）
    2a. 存在 → UPDATE kol_profiles
    2b. 不存在 → INSERT INTO kol_profiles
    3. 如果有工資資料 → INSERT INTO kol_contracts
    4. 記錄操作日誌
    5. 捕獲錯誤並記錄
    ↓
返回結果統計
    ↓
前端顯示成功/失敗詳情
    ↓
重新載入列表
```

---

## 6. 部門權限系統

### 6.1 部門隔離機制

**核心原則**：
- 每個 KOL 和合約都綁定到特定部門（`department_id`）
- 用戶只能看到自己部門的 KOL
- 主管（BOSS/MANAGER）可以切換查看不同部門

### 6.2 前端部門選擇器

```typescript
const isBoss = currentUser.role === Role.BOSS || currentUser.role === Role.MANAGER;

{isBoss && departments.length > 0 && (
  <select
    value={selectedDept}
    onChange={(e) => setSelectedDept(e.target.value)}
    className="px-4 py-2 border border-purple-300 rounded-lg"
  >
    {departments.map(dept => (
      <option key={dept.id} value={dept.id}>🏢 {dept.name}</option>
    ))}
  </select>
)}
```

**特性**：
- 只有主管可見
- 預設為當前用戶的部門
- 切換部門會立即重新載入數據

### 6.3 後端部門過濾

```javascript
const userDept = req.query.departmentId || currentUser.department;
let query = 'SELECT * FROM kol_profiles WHERE (department_id = ? OR department_id IS NULL)';
```

**重要邏輯**：
- `department_id = ?`：該部門的 KOL
- `department_id IS NULL`：全公司共用的 KOL
- 主管可以通過 `departmentId` 參數查看其他部門

### 6.4 部門數據隔離範圍

| 功能 | 是否隔離 | 說明 |
|------|----------|------|
| KOL 列表 | ✅ | 按部門過濾 |
| KOL 詳情 | ❌ | 可查看任何 KOL |
| 新增 KOL | ✅ | 綁定到當前部門 |
| 更新 KOL | ❌ | 可更新任何 KOL |
| 刪除 KOL | ❌ | 可刪除任何 KOL |
| 合約列表 | ✅ | 按部門過濾 |
| 支付列表 | ❌ | 顯示所有支付 |
| 統計數據 | ✅ | 按部門統計 |
| Excel 導入 | ✅ | 綁定到當前部門 |
| Excel 匯出 | ❌ | 匯出所有數據 |

**潛在問題**：
- 部門隔離不完整，詳情/更新/刪除操作沒有部門檢查
- 可能導致跨部門數據洩露或誤操作

---

## 7. 數據流向分析

### 7.1 前端 → 後端

```
前端組件 (KOLManagementView.tsx)
    ↓
API 服務層 (services/api.ts)
    ↓ HTTP Request
後端路由 (routes/kol.js)
    ↓
中間件驗證 (authenticateToken, checkKOLPermission)
    ↓
業務邏輯處理
    ↓
資料庫操作 (dbCall)
    ↓
操作日誌記錄 (logOperation)
    ↓ HTTP Response
API 服務層
    ↓
數據轉換 (snake_case → camelCase)
    ↓
前端組件更新狀態
```

### 7.2 資料庫關聯查詢

**獲取 KOL 列表時的關聯**：
```javascript
// 1. 獲取 KOL 基本資料
const profiles = db.prepare('SELECT * FROM kol_profiles WHERE ...').all();

// 2. 為每個 KOL 計算統計數據
profiles.map(profile => {
  const contractCount = db.prepare('SELECT COUNT(*) FROM kol_contracts WHERE kol_id = ?').get(profile.id);
  const activeContracts = db.prepare('SELECT COUNT(*) FROM kol_contracts WHERE kol_id = ? AND end_date >= date("now")').get(profile.id);
  const totalUnpaid = db.prepare('SELECT SUM(unpaid_amount) FROM kol_contracts WHERE kol_id = ?').get(profile.id);
  
  return { ...profile, contractCount, activeContracts, totalUnpaid };
});
```

**獲取合約列表時的關聯**：
```sql
SELECT c.*, p.facebook_id, p.platform_account, p.status as kol_status
FROM kol_contracts c
JOIN kol_profiles p ON c.kol_id = p.id
WHERE ...
```

**獲取支付列表時的關聯**：
```sql
SELECT p.*, c.kol_id, k.facebook_id, k.platform_account
FROM kol_payments p
JOIN kol_contracts c ON p.contract_id = c.id
JOIN kol_profiles k ON c.kol_id = k.id
WHERE ...
```

---

## 8. 關鍵功能實現

### 8.1 自動金額計算

**新增支付時**：
```javascript
// 1. 新增支付記錄
db.prepare(`
  INSERT INTO kol_payments (id, contract_id, payment_date, amount, payment_type, notes, created_at, created_by)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run(id, contractId, paymentDate, amount, paymentType, notes, now, currentUser.id);

// 2. 自動更新合約金額
db.prepare(`
  UPDATE kol_contracts 
  SET total_paid = total_paid + ?, 
      unpaid_amount = unpaid_amount - ?, 
      updated_at = ? 
  WHERE id = ?
`).run(amount, amount, now, contractId);
```

**刪除支付時**：
```javascript
// 1. 獲取支付記錄
const existing = db.prepare('SELECT * FROM kol_payments WHERE id = ?').get(id);

// 2. 反向更新合約金額
db.prepare(`
  UPDATE kol_contracts 
  SET total_paid = total_paid - ?, 
      unpaid_amount = unpaid_amount + ?, 
      updated_at = ? 
  WHERE id = ?
`).run(existing.amount, existing.amount, now, existing.contract_id);

// 3. 刪除支付記錄
db.prepare('DELETE FROM kol_payments WHERE id = ?').run(id);
```

### 8.2 級聯刪除

**刪除 KOL 時**：
```javascript
// 1. 刪除相關支付記錄
db.prepare('DELETE FROM kol_payments WHERE contract_id IN (SELECT id FROM kol_contracts WHERE kol_id = ?)').run(id);

// 2. 刪除相關合約
db.prepare('DELETE FROM kol_contracts WHERE kol_id = ?').run(id);

// 3. 刪除操作日誌
db.prepare('DELETE FROM kol_operation_logs WHERE target_id = ?').run(id);

// 4. 刪除 KOL 檔案
db.prepare('DELETE FROM kol_profiles WHERE id = ?').run(id);
```

**刪除合約時**：
```javascript
// 1. 刪除相關支付記錄
db.prepare('DELETE FROM kol_payments WHERE contract_id = ?').run(id);

// 2. 刪除合約
db.prepare('DELETE FROM kol_contracts WHERE id = ?').run(id);
```

### 8.3 操作日誌

**記錄格式**：
```javascript
logOperation(db, 'CREATE', 'KOL_PROFILE', id, currentUser.id, currentUser.name, {
  platform: 'FACEBOOK',
  platformId: 'example_id',
  platformAccount: '@example'
});
```

**日誌類型**：
- `CREATE`：新增記錄
- `UPDATE`：更新記錄
- `DELETE`：刪除記錄
- `IMPORT`：Excel 導入
- `BATCH_CREATE`：批量操作

**目標類型**：
- `KOL_PROFILE`：KOL 檔案
- `KOL_CONTRACT`：合約
- `KOL_PAYMENT`：支付記錄

---

## 9. 與其他模組的連動

### 9.1 用戶系統（Users）

**關聯**：
- `kol_profiles.created_by` → `users.id`
- `kol_contracts.created_by` → `users.id`
- `kol_payments.created_by` → `users.id`
- `kol_operation_logs.user_id` → `users.id`

**權限檢查**：
```javascript
function checkKOLPermission(req, res, next) {
  const currentUser = req.user;  // 來自 authenticateToken 中間件
  if (!currentUser) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
}
```

### 9.2 部門系統（Departments）

**關聯**：
- `kol_profiles.department_id` → `departments.id`
- `kol_contracts.department_id` → `departments.id`
- `currentUser.department` → `departments.id`

**部門選擇器**：
```typescript
{isBoss && departments.length > 0 && (
  <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)}>
    {departments.map(dept => (
      <option key={dept.id} value={dept.id}>🏢 {dept.name}</option>
    ))}
  </select>
)}
```

### 9.3 財務系統（Finance）

**潛在連動**：
- KOL 支付記錄可能需要同步到財務系統
- 未付款項統計可能影響財務報表

**當前狀態**：
- ❌ 目前沒有直接連動
- ⚠️ 可能需要手動對帳

### 9.4 審計系統（Audit Logs）

**操作日誌**：
- 所有 KOL 操作都記錄到 `kol_operation_logs`
- 包含操作類型、目標、用戶、變更內容

**查詢接口**：
```javascript
router.get('/logs', authenticateToken, checkKOLPermission, async (req, res) => {
  const { targetType, targetId, limit } = req.query;
  
  let query = 'SELECT * FROM kol_operation_logs WHERE 1=1';
  const params = [];
  
  if (targetType) {
    query += ' AND target_type = ?';
    params.push(targetType);
  }
  
  if (targetId) {
    query += ' AND target_id = ?';
    params.push(targetId);
  }
  
  query += ' ORDER BY created_at DESC';
  
  if (limit) {
    query += ' LIMIT ?';
    params.push(parseInt(limit));
  }
  
  const logs = db.prepare(query).all(...params);
  res.json({ logs });
});
```

---

## 10. 潛在問題與改進建議

### 10.1 部門權限問題

**問題**：
- KOL 詳情、更新、刪除操作沒有部門檢查
- 可能導致跨部門數據洩露或誤操作

**建議**：
```javascript
// 在更新/刪除前檢查部門權限
const profile = db.prepare('SELECT * FROM kol_profiles WHERE id = ?').get(id);
if (profile.department_id !== currentUser.department && currentUser.role !== 'BOSS') {
  return res.status(403).json({ error: '無權操作其他部門的 KOL' });
}
```

### 10.2 資料一致性問題

**問題**：
- 支付金額更新合約時沒有事務保護
- 可能導致金額不一致

**建議**：
```javascript
db.prepare('BEGIN TRANSACTION').run();
try {
  // 新增支付
  db.prepare('INSERT INTO kol_payments ...').run(...);
  // 更新合約
  db.prepare('UPDATE kol_contracts ...').run(...);
  db.prepare('COMMIT').run();
} catch (error) {
  db.prepare('ROLLBACK').run();
  throw error;
}
```

### 10.3 性能問題

**問題**：
- 獲取 KOL 列表時，為每個 KOL 執行 3 次額外查詢
- N+1 查詢問題

**建議**：
```sql
-- 使用 JOIN 和子查詢一次性獲取所有數據
SELECT 
  p.*,
  COUNT(DISTINCT c.id) as contractCount,
  COUNT(DISTINCT CASE WHEN c.end_date >= date('now') THEN c.id END) as activeContracts,
  SUM(c.unpaid_amount) as totalUnpaid
FROM kol_profiles p
LEFT JOIN kol_contracts c ON p.id = c.kol_id
WHERE (p.department_id = ? OR p.department_id IS NULL)
GROUP BY p.id
```

### 10.4 數據驗證不足

**問題**：
- 支付金額可以超過未付金額（後端沒有驗證）
- 前端有驗證，但後端應該也要驗證

**建議**：
```javascript
// 後端驗證支付金額
const contract = db.prepare('SELECT unpaid_amount FROM kol_contracts WHERE id = ?').get(contractId);
if (amount > contract.unpaid_amount) {
  return res.status(400).json({ error: '支付金額不能超過未付金額' });
}
```

### 10.5 Excel 導入錯誤處理

**問題**：
- 導入失敗時，部分數據可能已經寫入
- 沒有回滾機制

**建議**：
```javascript
db.prepare('BEGIN TRANSACTION').run();
try {
  for (let i = 0; i < data.length; i++) {
    // 處理每一行
  }
  db.prepare('COMMIT').run();
} catch (error) {
  db.prepare('ROLLBACK').run();
  throw error;
}
```

### 10.6 平台支援不完整

**問題**：
- 資料庫有 `platform` 欄位，但很多查詢仍使用 `facebook_id`
- 多平台支援不完整

**建議**：
- 統一使用 `platform_id` 和 `platform`
- 移除 `facebook_id` 欄位（或僅用於向後兼容）
- 更新所有查詢使用 `platform_id`

### 10.7 缺少軟刪除

**問題**：
- 刪除操作是硬刪除，無法恢復
- 可能導致歷史數據丟失

**建議**：
```sql
-- 添加 deleted_at 欄位
ALTER TABLE kol_profiles ADD COLUMN deleted_at TEXT;
ALTER TABLE kol_contracts ADD COLUMN deleted_at TEXT;
ALTER TABLE kol_payments ADD COLUMN deleted_at TEXT;

-- 軟刪除
UPDATE kol_profiles SET deleted_at = datetime('now') WHERE id = ?;

-- 查詢時排除已刪除
SELECT * FROM kol_profiles WHERE deleted_at IS NULL;
```

### 10.8 缺少數據驗證

**問題**：
- 沒有驗證 `platform_id` 格式
- 沒有驗證金額範圍
- 沒有驗證日期邏輯（開始日期 < 結束日期）

**建議**：
```javascript
// 驗證日期
if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
  return res.status(400).json({ error: '開始日期不能晚於結束日期' });
}

// 驗證金額
if (amount < 0) {
  return res.status(400).json({ error: '金額不能為負數' });
}
```

---

## 總結

### 系統優勢
1. ✅ **功能完整**：涵蓋 KOL 管理的所有核心功能
2. ✅ **部門隔離**：支援多部門數據隔離
3. ✅ **操作日誌**：完整的審計追蹤
4. ✅ **自動計算**：支付金額自動更新合約
5. ✅ **Excel 支援**：批量導入/匯出功能
6. ✅ **多平台支援**：支援 6 種社交平台

### 需要改進的地方
1. ⚠️ **部門權限不完整**：詳情/更新/刪除沒有部門檢查
2. ⚠️ **性能問題**：N+1 查詢問題
3. ⚠️ **數據一致性**：缺少事務保護
4. ⚠️ **數據驗證**：後端驗證不足
5. ⚠️ **錯誤處理**：Excel 導入缺少回滾
6. ⚠️ **軟刪除**：硬刪除可能導致數據丟失

### 建議優先級
1. **高優先級**：修復部門權限問題（安全性）
2. **中優先級**：添加事務保護（數據一致性）
3. **中優先級**：優化查詢性能（用戶體驗）
4. **低優先級**：實現軟刪除（數據安全）
5. **低優先級**：完善數據驗證（健壯性）

---

**文檔版本**: 1.0  
**最後更新**: 2026-01-26  
**分析者**: Cascade AI  
**狀態**: ✅ 完整分析完成，等待用戶確認
