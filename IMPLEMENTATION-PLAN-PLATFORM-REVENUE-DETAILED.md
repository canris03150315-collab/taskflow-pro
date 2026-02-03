# 平台營收詳細欄位擴展 - 實施計劃

## 📋 任務概述

**目標**: 擴展平台營收系統，保留 Excel 檔案中的所有詳細欄位（彩票工資、反點、真人AG、棋牌等），並在前端提供詳細視圖顯示。

**方案**: 方案 A - 擴展數據庫保留詳細欄位

**版本**: v8.9.208-platform-revenue-detailed

**日期**: 2026-02-03

---

## ✅ 已完成工作

### 1. 數據庫遷移腳本
- 文件: `migrate-platform-revenue-detailed.cjs`
- 功能: 添加 10 個詳細欄位到 `platform_transactions` 表
- 新欄位:
  - `lottery_wage` (彩票工資)
  - `lottery_rebate` (彩票反點)
  - `game_ag` (真人AG)
  - `game_chess` (棋牌)
  - `game_rebate` (外接返點)
  - `game_private` (真人私返)
  - `lottery_dividend_receive` (彩票領取分紅)
  - `lottery_dividend_send` (彩票下發分紅)
  - `external_dividend_receive` (外接領取分紅)
  - `external_dividend_send` (外接下發分紅)

### 2. 更新解析器
- 文件: `platform-revenue-detailed.js`
- 功能: 解析 Excel 檔案並存儲所有詳細欄位
- 改進:
  - 保留所有原始詳細數據
  - 同時計算合併欄位（向後兼容）
  - 更新 INSERT/UPDATE 語句包含所有欄位

### 3. 前端組件更新
- 文件: `components/RevenueStatsTab-Detailed.tsx`
- 功能: 添加詳細/簡要視圖切換
- 新增:
  - `detailView` 狀態（summary/detailed）
  - 詳細視圖顯示所有子欄位
  - 簡要視圖保持原有格式

### 4. 測試腳本
- 文件: `test-parse-detailed.cjs`
- 功能: 驗證 Excel 解析邏輯
- 結果: ✅ 測試通過，解析邏輯正確

### 5. 部署腳本
- 文件: `deploy-platform-revenue-detailed.ps1`
- 功能: 自動化部署流程
- 步驟:
  1. 創建快照備份
  2. 上傳遷移腳本
  3. 上傳解析器
  4. 執行數據庫遷移
  5. 替換路由文件
  6. 重啟容器
  7. Commit 新映像
  8. 創建最終快照

---

## 🚀 部署流程

### 前置條件
- ✅ 已創建所有必要文件
- ✅ 測試腳本通過
- ⏳ 需要創建快照備份

### 執行步驟

#### 步驟 1: 創建快照備份
```powershell
.\deploy-platform-revenue-detailed.ps1
```

#### 步驟 2: 驗證部署
```bash
ssh root@165.227.147.40 "docker logs taskflow-pro --tail 50"
```

#### 步驟 3: 測試功能
1. 上傳 Excel 檔案
2. 檢查數據庫是否包含詳細欄位
3. 驗證前端詳細視圖顯示

#### 步驟 4: Git Commit
```powershell
git add .
git commit -m "Add platform revenue detailed columns - v8.9.208"
```

#### 步驟 5: 更新 WORK_LOG_CURRENT.md
添加更新記錄到工作日誌

---

## ⚠️ 風險評估

### 低風險
- 數據庫遷移腳本會檢查欄位是否已存在
- 不會影響現有數據
- 向後兼容（保留合併欄位）

### 中風險
- 需要重啟容器（約 30 秒停機）
- 需要測試確保所有功能正常

### 緩解措施
- 部署前創建快照
- 保留舊版解析器作為回滾
- 測試環境驗證後再部署

---

## 📊 驗收標準

### 功能驗收
- [ ] Excel 解析正確存儲所有詳細欄位
- [ ] 前端詳細視圖顯示所有子欄位
- [ ] 前端簡要視圖保持原有格式
- [ ] 統計功能正常工作

### 數據完整性
- [ ] 所有詳細欄位正確存儲
- [ ] 合併欄位計算正確
- [ ] 歷史記錄正常追蹤

### 性能
- [ ] 解析速度無明顯下降
- [ ] 查詢性能正常
- [ ] 前端渲染無延遲

---

## 🔄 回滾計劃

如果部署失敗：
1. 使用快照恢復：`ssh root@165.227.147.40 "/root/restore-snapshot.sh v8.9.207-backup-timestamps-fixed"`
2. 或使用舊版映像：`docker run -d --name taskflow-pro taskflow-pro:v8.9.207-backup-timestamps-fixed`

---

## 📝 後續工作

部署完成後：
1. 更新 `WORK_LOG_CURRENT.md`
2. 更新 `API-ENDPOINTS.md`
3. 創建用戶文檔（如何使用詳細視圖）
4. 更新 `PROJECT-KNOWLEDGE-BASE.md`
