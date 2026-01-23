# 假表月曆 NANA 不顯示問題 - 修復總結

**修復日期**: 2026-01-22  
**版本**: 前端修復（無後端變更）  
**狀態**: ✅ 代碼修改完成，等待部署

---

## 🐛 問題描述

### 用戶報告
- BOSS 查看 63 部門假表月曆時，NANA 的排班不顯示
- 其他部門顯示正常，只有 63 部門的 NANA 有問題
- 排班列表中可以看到 NANA，但月曆格子中看不到

### 診斷過程
1. ✅ 檢查資料庫：NANA 有 APPROVED 排班記錄（2026-01，休假日：11, 17, 24, 25, 31）
2. ✅ 檢查後端 API：邏輯正確，正常返回 NANA 的記錄
3. ✅ 模擬前端邏輯：篩選邏輯正常
4. ✅ 分析用戶截圖：發現真正原因

---

## 🎯 根本原因

### 問題 1：UI 文字被 truncate 截斷 ❌

**位置**: `components/LeaveManagementView.tsx:886`

```typescript
<p className="text-red-600 truncate text-[9px] sm:text-xs hidden sm:block">
  {offDuty.map(u => u.name).join(', ')}
</p>
```

**說明**:
- 月曆格子中顯示「錢來也, NANA」時
- `truncate` CSS class 會截斷超出寬度的文字
- 結果顯示為「錢來也, ...」，NANA 被省略號隱藏

### 問題 2：EMPLOYEE 無法看到同部門其他人的排班 ❌

**位置**: `components/LeaveManagementView.tsx:421`

```typescript
// 錯誤邏輯：EMPLOYEE 只能看到自己的
(canApprove ? s.department_id === selectedDepartment : s.user_id === currentUser.id)
```

**說明**:
- EMPLOYEE 只能看到自己的排班
- 無法看到同部門其他人的休假安排
- 不符合用戶需求（員工需要知道今天誰上班/誰休假）

---

## ✅ 修復方案

### 修復 1：改用徽章顯示（方案 B）

**修改位置**: `components/LeaveManagementView.tsx:883-896`

```typescript
// 修復前
<p className="text-red-600 truncate text-[9px] sm:text-xs hidden sm:block">
  {offDuty.map(u => u.name).join(', ')}
</p>

// 修復後
<div className="flex flex-wrap gap-1 hidden sm:flex">
  {offDuty.map(u => (
    <span key={u.id} className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[9px] sm:text-xs font-medium">
      {u.name}
    </span>
  ))}
</div>
```

**效果**:
- ✅ 每個名字顯示為獨立徽章
- ✅ 自動換行，不會被截斷
- ✅ 更清晰美觀

### 修復 2：修復 EMPLOYEE 篩選邏輯

**修改位置**: `components/LeaveManagementView.tsx:421-424`

```typescript
// 修復前
(canApprove ? s.department_id === selectedDepartment : s.user_id === currentUser.id)

// 修復後
(canApprove 
  ? s.department_id === selectedDepartment 
  : (s.user_id === currentUser.id || s.department_id === currentUser.department)
)
```

**效果**:
- ✅ EMPLOYEE 可以看到：自己的 + 部門內所有 APPROVED
- ✅ 與後端 API 邏輯保持一致
- ✅ 員工可以看到同部門其他人的休假安排

### 同時修復：上班人員顯示

**修改位置**: `components/LeaveManagementView.tsx:898-911`

同樣改用徽章顯示，保持 UI 一致性。

---

## 📦 修復記錄

### Git Commit
```
commit de63f13
fix: 修復假表月曆顯示問題 - NANA 不顯示 & 改進 EMPLOYEE 邏輯

問題:
1. BOSS 查看 63 部門時，NANA 的排班不顯示（被 truncate 截斷）
2. EMPLOYEE 無法看到同部門其他人的排班（不符合需求）

修復:
1. 修復 getApprovedSchedules() 篩選邏輯
   - EMPLOYEE 現在可以看到: 自己的 + 部門內所有 APPROVED
   - 與後端 API 邏輯保持一致
   
2. 修復月曆休息/上班人員名單被截斷問題
   - 移除 truncate class
   - 改用徽章 (badge) 顯示每個人名
   - 自動換行，完整顯示所有人員
```

### 修改文件
- `components/LeaveManagementView.tsx`

### 構建狀態
- ✅ 前端構建成功
- ✅ dist 文件夾已生成

---

## 🚀 部署狀態

### 當前狀態
- ⏸️ **等待手動部署到 Netlify**
- Netlify CLI 連結出現問題，需要手動處理

### 手動部署步驟

#### 方法 1：Netlify Web UI（推薦）
1. 登入 Netlify: https://app.netlify.com/
2. 找到生產網站（Deploy ID: `6971315ed8b93fb0c72c6606`）
3. 點擊 "Deploys" 標籤
4. 拖放 `dist` 文件夾到部署區域
5. 等待部署完成

#### 方法 2：使用 Netlify CLI
```powershell
# 在項目目錄下執行
cd "c:\Users\USER\Downloads\公司內部"

# 確認 dist 文件夾存在
ls dist

# 部署（如果 netlify link 正常）
netlify deploy --prod --dir=dist --message="修復假表月曆顯示問題"
```

---

## ✅ 驗證清單

部署完成後，請驗證以下功能：

### BOSS 角色
- [ ] 選擇 63 部門
- [ ] 查看 2026 年 1 月月曆
- [ ] 確認 1月11日、17日、24日、25日、31日 顯示「休息 2人」
- [ ] 確認可以看到「錢來也」和「NANA」兩個徽章
- [ ] 確認名字沒有被截斷

### EMPLOYEE 角色（如 NANA）
- [ ] 打開假表月曆
- [ ] 確認可以看到自己的排班
- [ ] 確認可以看到同部門其他人（錢來也）的排班
- [ ] 確認可以知道今天誰上班、誰休假

---

## 📊 影響評估

### 修改範圍
- ✅ 只修改前端 UI 顯示
- ❌ 不影響資料庫
- ❌ 不影響後端 API
- ❌ 不需要後端重啟或 Docker commit

### 風險等級
- 🟢 **低風險**：只修改前端顯示邏輯

### 回滾方案
如果有問題，可以回滾到前一個 Netlify 部署版本：
1. 進入 Netlify Dashboard
2. 點擊 "Deploys"
3. 找到之前的成功部署
4. 點擊 "Publish deploy"

---

## 📝 相關文檔

- 診斷報告：`SCHEDULE-NANA-DIAGNOSIS.md`
- 工作日誌：待更新 `WORK_LOG_CURRENT.md`

---

## 🎉 預期結果

修復完成後：
- ✅ BOSS 查看 63 部門月曆時，完整顯示 NANA 的排班
- ✅ 所有用戶名以徽章形式顯示，不會被截斷
- ✅ EMPLOYEE 可以看到同部門其他人的休假安排
- ✅ 月曆表能真正起到"讓員工知道今天和誰上班"的作用

---

**修復完成日期**: 2026-01-22  
**等待部署**: 是  
**需要後端修改**: 否
