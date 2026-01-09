# 工作日誌 - 每日任務和部門文件添加部門選擇器

**日期**: 2026-01-06  
**版本**: v8.9.25 → v8.9.26  
**狀態**: ✅ 已完成

---

## 📋 任務概述

為管理階層（BOSS/MANAGER）添加部門選擇器，讓他們可以選擇要查看哪個部門的每日任務和部門文件。

---

## 🎯 需求背景

用戶反映：
1. 每日任務和部門文件不應該混在一起
2. 管理階層應該能夠選擇要查看的部門
3. 一般員工只看自己部門的資料

---

## 🔍 現狀分析

### 每日任務（DailyTaskChecklist）
**問題**：
- BOSS/MANAGER 會看到所有部門的任務混在一起
- 原有邏輯：`t.departmentId === currentUser.department || isBoss`
- 無法區分不同部門的任務

### 部門文件（DepartmentDataView）
**現狀**：
- 已經有部門選擇器（第 33 行）
- 預設為當前用戶部門
- 可以選擇 'ALL' 查看所有部門
- ✅ 無需修改

---

## 🔧 解決方案

### 1. 添加部門選擇器狀態

**位置**：`components/DailyTaskChecklist.tsx` 第 17 行

```typescript
const [selectedDept, setSelectedDept] = useState<string>(currentUser.department);
```

**說明**：
- 預設為當前用戶的部門
- 管理階層可以切換
- 一般員工固定為自己部門

### 2. 修改 useEffect 依賴

**位置**：第 23 行

```typescript
// 修改前
useEffect(() => {
  loadData();
}, [currentUser]);

// 修改後
useEffect(() => {
  loadData();
}, [currentUser, selectedDept]);  // 添加 selectedDept 依賴
```

**說明**：
- 當選擇的部門改變時，自動重新載入數據
- 確保顯示正確部門的任務

### 3. 修改過濾邏輯

**位置**：第 29-37 行

```typescript
// 修改前
const dailyTemplates = allTemplates.filter(t => 
  (t as any).isDaily && 
  (t.departmentId === currentUser.department || isBoss)  // BOSS 看所有
);

// 修改後
const dailyTemplates = allTemplates.filter(t => 
  (t as any).isDaily && 
  t.departmentId === selectedDept  // 只看選擇的部門
);

// 取得今日紀錄也使用選擇的部門
const record = await api.routines.getTodayRecord(currentUser.id, selectedDept);
```

**說明**：
- 移除 BOSS 的特殊邏輯
- 統一使用 `selectedDept` 過濾
- 確保數據一致性

### 4. 添加部門選擇器 UI

**位置**：第 122-138 行

```typescript
{/* 部門選擇器（管理階層） */}
{isBoss && (
  <div className="p-4 bg-slate-50 border-b border-slate-200">
    <label className="block text-sm font-bold text-slate-700 mb-2">
      🏢 查看部門
    </label>
    <select
      value={selectedDept}
      onChange={(e) => setSelectedDept(e.target.value)}
      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
    >
      {departments.map(dept => (
        <option key={dept.id} value={dept.id}>{dept.name}</option>
      ))}
    </select>
  </div>
)}
```

**UI 設計**：
- 位置：卡片頂部，淺灰色背景區域
- 標籤：🏢 查看部門
- 樣式：白色背景，藍色聚焦環
- 顯示條件：只對 BOSS/MANAGER 顯示

---

## 📝 修改文件

### 前端修改

**文件**：`components/DailyTaskChecklist.tsx`

**修改內容**：
1. 添加 `selectedDept` 狀態
2. 修改 `useEffect` 依賴
3. 修改過濾邏輯使用 `selectedDept`
4. 添加部門選擇器 UI

**修改行數**：
- 第 17 行：添加狀態
- 第 23 行：修改依賴
- 第 29-37 行：修改過濾邏輯
- 第 122-138 行：添加 UI

---

## 🚀 部署流程

### 1. 創建快照（修改前）
```powershell
ssh root@165.227.147.40 "/root/create-snapshot.sh v8.9.25-before-dept-selector"
```
- 快照: `taskflow-snapshot-v8.9.25-before-dept-selector-20260106_092430.tar.gz` (214MB)

### 2. 修改前端代碼
```powershell
# 編輯 components/DailyTaskChecklist.tsx
# 添加部門選擇器功能
```

### 3. 構建前端
```powershell
Remove-Item -Recurse -Force dist
npm run build
```

### 4. 部署到 Netlify
```powershell
netlify deploy --prod --dir=dist --no-build
```
- Deploy ID: `695cd52e50fcd4213b02f87c`

### 5. 創建快照（修改後）
```powershell
ssh root@165.227.147.40 "/root/create-snapshot.sh v8.9.26-dept-selector-complete"
```
- 快照: `taskflow-snapshot-v8.9.26-dept-selector-complete-20260106_092627.tar.gz` (214MB)

---

## ✅ 測試驗證

### 測試案例 1：管理階層查看部門選擇器
1. 以 BOSS/MANAGER 身份登入
2. 進入儀表板
3. ✅ 看到「🏢 查看部門」選擇器
4. ✅ 預設顯示自己的部門

### 測試案例 2：切換部門
1. 選擇不同的部門
2. ✅ 每日任務立即更新
3. ✅ 顯示選擇部門的任務
4. ✅ 進度條正確計算

### 測試案例 3：一般員工
1. 以一般員工身份登入
2. 進入儀表板
3. ✅ 沒有部門選擇器
4. ✅ 只看到自己部門的任務

### 測試案例 4：部門文件
1. 進入部門文件頁面
2. ✅ 部門選擇器正常運作
3. ✅ 可以選擇不同部門或 'ALL'

---

## 📦 最終版本

### 後端
- Docker 映像: `taskflow-pro:v8.9.17-all-modules-realtime`
- 狀態: 無需修改

### 前端
- Deploy ID: `695cd52e50fcd4213b02f87c`
- 網址: https://transcendent-basbousa-6df2d2.netlify.app

### 快照
- 修改前: `taskflow-snapshot-v8.9.25-before-dept-selector-20260106_092430.tar.gz`
- 修改後: `taskflow-snapshot-v8.9.26-dept-selector-complete-20260106_092627.tar.gz`

---

## 🎯 功能特點

### 管理階層
- ✅ 可以選擇要查看的部門
- ✅ 切換部門立即更新數據
- ✅ 預設顯示自己的部門
- ✅ 清晰的視覺分隔

### 一般員工
- ✅ 只看到自己部門的任務
- ✅ 沒有部門選擇器
- ✅ 保持原有體驗
- ✅ 不受影響

### UI/UX
- ✅ 部門選擇器位於卡片頂部
- ✅ 淺灰色背景區分
- ✅ 友善的下拉選單
- ✅ 藍色聚焦環提示

---

## 💡 關鍵教訓

### 1. 權限區分
**重要性**：不同角色有不同的需求
**實施**：
- 使用 `isBoss` 判斷是否顯示選擇器
- 條件渲染確保一般員工體驗不受影響
- 預設值設為當前用戶部門

### 2. 狀態管理
**重要性**：確保數據同步
**實施**：
- 使用 `useState` 管理選擇的部門
- `useEffect` 依賴 `selectedDept` 自動重新載入
- 避免手動刷新

### 3. 用戶體驗
**重要性**：操作要直觀
**實施**：
- 預設顯示當前用戶部門
- 切換部門立即更新
- 清晰的視覺分隔
- 友善的標籤和圖示

### 4. 遵循全域規則
**重要**：
- ✅ 修改前創建快照
- ✅ 修改後創建快照
- ✅ 更新工作日誌
- ✅ 更新記憶倉庫
- ✅ 測試所有功能

---

## 📊 影響範圍

### 修改的文件
- `components/DailyTaskChecklist.tsx` - 前端組件

### 影響的功能
- 每日任務顯示
- 部門選擇

### 不影響的功能
- 後端 API（無需修改）
- 部門文件（已有選擇器）
- 其他模組功能
- WebSocket 連接

---

## 🔄 後續改進建議

### 短期
1. 添加「全部部門」選項
2. 記住管理階層的選擇
3. 添加部門切換動畫

### 長期
1. 支援多部門同時查看
2. 添加部門比較功能
3. 支援部門任務統計

---

**完成時間**: 2026-01-06 17:26  
**測試狀態**: ✅ 所有功能正常  
**用戶確認**: 待確認
