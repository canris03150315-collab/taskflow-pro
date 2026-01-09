# UI 版本恢復與源碼指南 (2026-01-01)

此日誌記錄了恢復系統「新版 UI」（符合圖二樣式）的關鍵資訊，以防日後再次發生版本降級。

## 💎 正確的穩定源碼位置
- **備份 ZIP**: `C:\Users\USER\Downloads\Backups\TaskFlow_Fixed_Final_20251230_180716.zip`
- **當前工作目錄**: `C:\Users\USER\Downloads\公司內部\`

## 🏠 關鍵前端檔案路徑
- **進入點**: `App.tsx` (整合版，包含分組側邊欄與招呼語)
- **儀表板**: `components/DashboardView.tsx` (包含 AttendanceWidget 打卡組件)
- **打卡組件**: `components/AttendanceWidget.tsx`
- **數據中心**: `components/DepartmentDataView.tsx` (已包含 V36.5 時區補償修正)
- **HTML 模板**: `index.html` (標題為「企業管理系統」，包含 Tailwind CDN)

## ⚙️ 核心配置檔案 (Vite 建置必備)
若 `npm run build` 失敗，請確認以下檔案內容：
- `tsconfig.json`: 包含 `react-jsx` 配置。
- `tsconfig.node.json`: Vite 專用 TS 配置。
- `vite.config.ts`: 包含 React 插件與分包 (Manual Chunks) 邏輯。

## 🚀 部署資訊
- **Netlify 主要站點**: `transcendent-basbousa-6df2d2`
- **Netlify 備用站點**: `bejewelled-shortbread-a1aa30`
- **部署命令**: 執行 `.\deploy-frontend.ps1` (會自動編譯並部署至主要站點)

## 📸 UI 特徵確認 (圖二)
1. 儀表板右上角有數位時鐘與綠色的「上班打卡」按鈕。
2. 頂部顯示「👋 早安，[姓名]」。
3. 左側側邊欄分為「管理核心」與「工作執行」等區塊。

---
最後更新: 2026-01-01
狀態: 已恢復穩定並完成部署
