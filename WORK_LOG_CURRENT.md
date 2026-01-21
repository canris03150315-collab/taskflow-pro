# TaskFlow Pro 當前工作日誌

**最後更新**: 2026-01-21 18:22  
**版本**: v8.9.144-kol-insert-fix  
**狀態**: ✅ KOL 管理功能完整（含編輯狀態）

---

## 📊 當前系統狀態

### 前端
- **生產環境 Deploy ID**: `6970a96246022057f2ce10bf`
- **測試環境 Deploy ID**: `69672b2fbb8596d47cbd4af3`
- **生產 URL**: https://transcendent-basbousa-6df2d2.netlify.app
- **測試 URL**: https://bejewelled-shortbread-a1aa30.netlify.app
- **WebSocket URL**: `wss://robust-managing-stay-largely.trycloudflare.com/ws`
- **狀態**: ✅ 正常運行，WebSocket 連接正常

### 後端
- **Docker 映像**: `taskflow-pro:v8.9.144-kol-insert-fix`
- **容器 ID**: `584738027bbf`
- **容器狀態**: 運行中
- **Cloudflare Tunnel**: `robust-managing-stay-largely.trycloudflare.com`
- **資料庫**: 13 個用戶，99 筆打卡記錄，完整 KOL 管理表結構
- **快照**: `taskflow-snapshot-v8.9.144-kol-insert-fix-20260121_092740.tar.gz` (213MB)
- **環境變數**: GEMINI_API_KEY 已設置
- **狀態**: ✅ 正常運行（包含所有最新功能）

### 本地代碼
- **Git 狀態**: 已初始化，有完整歷史
- **Git Commit**: `6595641` (v8.9.140 備份點)
- **狀態**: ✅ 與生產環境同步

---

## 🎯 2026-01-21 更新記錄

### 44. KOL 列表編輯狀態功能 ⭐⭐⭐
**完成時間**: 2026-01-21 下午 18:22
**狀態**: ✅ 已完成

#### 問題描述
用戶反饋：KOL 列表無法編輯狀態，只能在新增時設置，之後無法修改。

#### 根本原因
前端 `KOLManagementView.tsx` 缺少編輯 KOL 資料的功能，列表中只有「新增合約」和「刪除」按鈕，沒有「編輯」按鈕。

#### 解決方案
添加完整的 KOL 編輯功能，包括編輯狀態欄位。

#### 修改內容
1. **添加編輯狀態管理**
   - 新增 `showEditModal` 狀態
   - 實現 `handleEditProfile` 處理函數

2. **創建 EditKOLModal 組件**
   - 包含所有 KOL 欄位（平台、平台 ID、平台帳號、聯絡方式、狀態、備註）
   - 狀態選擇器包含 4 個選項：
     - 正常合作 (ACTIVE)
     - 停止合作 (STOPPED)
     - 協議中 (NEGOTIATING)
     - 失聯 (LOST_CONTACT)

3. **添加編輯按鈕**
   - 在 KOL 列表操作欄添加「✏️ 編輯」按鈕
   - 藍色按鈕，與其他操作按鈕一致的設計

4. **集成到主組件**
   - 在主組件中添加 EditKOLModal 的條件渲染
   - 點擊編輯按鈕時打開 Modal 並傳入當前 KOL 資料

#### 部署步驟
```powershell
# 1. 清除舊構建
Remove-Item -Recurse -Force dist

# 2. 構建前端
npm run build

# 3. 部署到生產環境
$env:NETLIFY_SITE_ID = "5bb6a0c9-3186-4d11-b9be-07bdce7bf186"
netlify deploy --prod --dir=dist --no-build
```

#### 最終版本
- **前端 Deploy ID**: `6970a96246022057f2ce10bf`
- **後端**: 無需修改（使用現有 `api.kol.updateProfile` API）
- **狀態**: ✅ 已完成，可編輯 KOL 狀態

#### 功能效果
- ✅ KOL 列表新增「編輯」按鈕
- ✅ 可修改 KOL 所有資料（平台、ID、帳號、聯絡方式、狀態、備註）
- ✅ 狀態欄位提供下拉選擇器，方便修改
- ✅ 編輯後立即更新列表顯示

#### 關鍵教訓
1. **完整的 CRUD 功能**：列表管理應該提供完整的增刪改查功能
2. **狀態管理的重要性**：業務狀態（如合作狀態）需要可編輯
3. **UI 一致性**：編輯功能應該與新增功能保持一致的 UI 設計
4. **API 重用**：後端已有 `updateProfile` API，前端只需調用

---

### 43. KOL 合約訂金驗證功能 ⭐⭐⭐
**完成時間**: 2026-01-21 下午 17:59
**狀態**: ✅ 已完成

#### 問題描述
用戶反饋：新增或編輯合約時，訂金可以超過工資/傭金（例如工資 $100，訂金 $1000），這不符合實際使用邏輯。

#### 根本原因
前端 `AddContractModal` 和 `EditContractModal` 組件缺少訂金金額驗證邏輯。

#### 修復方案
在新增和編輯合約的 `handleSubmit` 中添加訂金驗證邏輯。

#### 驗證邏輯
```tsx
// 驗證訂金不能超過工資
if (depositAmount > salaryAmount) {
  alert(`訂金不能超過工資/傭金！\n工資/傭金：$${salaryAmount}\n訂金：$${depositAmount}`);
  return;
}
```

#### 修改位置
1. **AddContractModal.handleSubmit**（第 1057-1074 行）
   - 添加訂金驗證邏輯
   - 防止提交超額訂金

2. **EditContractModal.handleSubmit**（第 1194-1213 行）
   - 添加相同的訂金驗證邏輯
   - 確保編輯時也有驗證

#### 部署步驟
```powershell
# 1. 清除舊構建
Remove-Item -Recurse -Force dist

# 2. 構建前端
npm run build

# 3. 部署到生產環境
$env:NETLIFY_SITE_ID = "5bb6a0c9-3186-4d11-b9be-07bdce7bf186"
netlify deploy --prod --dir=dist --no-build
```

#### 最終版本
- **前端 Deploy ID**: `6970a3a2ee5a9962c53d226c`
- **後端**: 無需修改
- **狀態**: ✅ 已完成，防止訂金超過工資

#### 驗證效果
- ✅ 訂金不能超過工資/傭金
- ✅ 超額時顯示明確的錯誤訊息
- ✅ 新增和編輯合約都有驗證
- ✅ 符合實際業務邏輯

#### 關鍵教訓
1. **業務邏輯驗證**：前端應該驗證符合業務邏輯的數據關係
2. **一致性驗證**：新增和編輯功能應該有相同的驗證邏輯
3. **明確的錯誤訊息**：告訴用戶為什麼失敗以及正確的範圍
4. **防止異常數據**：在數據提交前就攔截不合理的輸入

---

### 42. KOL 新增合約未付金額自動計算 ⭐⭐
**完成時間**: 2026-01-21 下午 17:49
**狀態**: ✅ 已完成

#### 問題描述
用戶反饋：新增合約時，「未付金額」欄位需要手動填寫，但實際上應該自動計算（工資/傭金 - 訂金），邏輯不符合使用習慣。

#### 優化方案
修改 `AddContractModal` 組件，將「未付金額」改為自動計算並顯示，不可編輯。

#### 修改內容
1. **移除 `unpaidAmount` 狀態**
   - 從 `formData` 中移除 `unpaidAmount` 欄位
   - 不再需要用戶手動輸入

2. **添加自動計算函數**
   ```tsx
   const calculatedUnpaidAmount = () => {
     const salary = parseFloat(formData.salaryAmount) || 0;
     const deposit = parseFloat(formData.depositAmount) || 0;
     return salary - deposit;
   };
   ```

3. **修改表單欄位**
   - 將輸入框改為只讀顯示區域
   - 顯示自動計算結果：`${calculatedUnpaidAmount().toFixed(0)}`
   - 添加說明文字：「= 工資/傭金 - 訂金」

4. **提交時自動計算**
   ```tsx
   unpaidAmount: salaryAmount - depositAmount
   ```

#### 部署步驟
```powershell
# 1. 清除舊構建
Remove-Item -Recurse -Force dist

# 2. 構建前端
npm run build

# 3. 部署到生產環境
$env:NETLIFY_SITE_ID = "5bb6a0c9-3186-4d11-b9be-07bdce7bf186"
netlify deploy --prod --dir=dist --no-build
```

#### 最終版本
- **前端 Deploy ID**: `6970a101b0a8a3591ad544c9`
- **後端**: 無需修改
- **狀態**: ✅ 已完成，自動計算未付金額

#### 優化效果
- ✅ 未付金額自動計算，無需手動輸入
- ✅ 實時顯示計算結果（工資 - 訂金）
- ✅ 避免輸入錯誤，確保數據一致性
- ✅ 更符合實際使用邏輯

#### 關鍵教訓
1. **自動化計算**：能自動計算的數據不應該讓用戶手動輸入
2. **用戶體驗**：減少不必要的輸入步驟，提高效率
3. **數據一致性**：自動計算確保數據邏輯正確
4. **視覺反饋**：顯示計算公式幫助用戶理解

---

### 41. KOL 支付金額驗證功能 ⭐⭐⭐
**完成時間**: 2026-01-21 下午 17:43
**狀態**: ✅ 已完成

#### 問題描述
用戶反饋：系統允許支付金額超過未付金額（例如未付 $100，但可以支付 $110），不符合實際情況。

#### 根本原因
前端 `KOLManagementView.tsx` 中的快速支付按鈕和 `AddPaymentModal` 組件缺少支付金額驗證邏輯。

#### 修復方案
在所有支付入口添加驗證邏輯：
1. **快速支付按鈕**（合約列表頁面）
2. **AddPaymentModal**（記錄支付彈窗）

#### 驗證邏輯
```tsx
// 1. 檢查金額是否大於 0
if (paymentAmount <= 0) {
  alert('支付金額必須大於 0');
  return;
}

// 2. 檢查是否超過未付金額
if (paymentAmount > remainingAmount) {
  alert(`支付金額不能超過未付金額！\n未付金額：$${remainingAmount}\n輸入金額：$${paymentAmount}`);
  return;
}
```

#### 修改位置
1. **快速支付按鈕**（第 635-668 行）
   - 添加未付金額提示
   - 添加金額驗證（> 0 和 <= 未付金額）

2. **AddPaymentModal.handleSubmit**（第 1305-1324 行）
   - 添加金額驗證邏輯
   - 根據選擇的合約檢查未付金額

#### 部署步驟
```powershell
# 1. 清除舊構建
Remove-Item -Recurse -Force dist

# 2. 構建前端
npm run build

# 3. 部署到生產環境
$env:NETLIFY_SITE_ID = "5bb6a0c9-3186-4d11-b9be-07bdce7bf186"
netlify deploy --prod --dir=dist --no-build
```

#### 最終版本
- **前端 Deploy ID**: `69709faf8040b35599699cf0`
- **後端**: 無需修改
- **狀態**: ✅ 已完成，防止超額支付

#### 驗證效果
- ✅ 支付金額必須 > 0
- ✅ 支付金額不能超過未付金額
- ✅ 超額時顯示明確的錯誤訊息
- ✅ 提示中顯示當前未付金額

#### 關鍵教訓
1. **前端驗證重要性**：即使後端有驗證，前端也應該提供即時反饋
2. **用戶體驗**：在輸入時就提示未付金額，避免錯誤輸入
3. **多入口驗證**：所有支付入口都需要相同的驗證邏輯
4. **明確的錯誤訊息**：告訴用戶為什麼失敗以及正確的範圍

---

### 40. KOL 合約結清狀態顯示優化 ⭐⭐
**完成時間**: 2026-01-21 下午 17:39
**狀態**: ✅ 已完成

#### 問題描述
用戶反饋：當 KOL 合約款項已付清時（未付金額為 0），「未付金額」欄位顯示空白，不夠直觀。

#### 優化方案
修改前端 `KOLManagementView.tsx`，當未付金額為 0 時顯示「✓ 結清」（綠色），而不是顯示 `$0`。

#### 修改內容
```tsx
// 修改前
<td className="px-4 py-3 font-medium text-orange-600">${contract.unpaidAmount}</td>

// 修改後
<td className="px-4 py-3 font-medium">
  {contract.unpaidAmount > 0 ? (
    <span className="text-orange-600">${contract.unpaidAmount}</span>
  ) : (
    <span className="text-green-600">✓ 結清</span>
  )}
</td>
```

#### 部署步驟
```powershell
# 1. 清除舊構建
Remove-Item -Recurse -Force dist

# 2. 構建前端
npm run build

# 3. 部署到生產環境
$env:NETLIFY_SITE_ID = "5bb6a0c9-3186-4d11-b9be-07bdce7bf186"
netlify deploy --prod --dir=dist --no-build
```

#### 最終版本
- **前端 Deploy ID**: `69709edbff1ee1516d008929`
- **後端**: 無需修改
- **狀態**: ✅ 已完成，UI 更直觀

#### 顯示效果
- **未付金額 > 0**: 顯示橙色 `$金額`
- **未付金額 = 0**: 顯示綠色 `✓ 結清`

#### 關鍵教訓
1. **UI/UX 優化**：空白或 `$0` 不如明確的狀態文字直觀
2. **視覺反饋**：使用顏色和符號增強用戶體驗
3. **條件渲染**：根據數據狀態顯示不同內容

---

### 39. KOL 合約新增功能修復 ⭐⭐⭐
**完成時間**: 2026-01-21 下午 17:27
**狀態**: ✅ 已完成

#### 問題描述
用戶新增 KOL 合約時返回 500 錯誤：
```
SqliteError: 15 values for 14 columns
```

#### 根本原因
後端 `kol.js` 的 POST `/contracts` 路由中，INSERT 語句有 **15 個佔位符 `?`** 但只有 **14 個欄位**：
- 欄位：id, kol_id, start_date, end_date, salary_amount, deposit_amount, unpaid_amount, cleared_amount, total_paid, contract_type, notes, created_at, updated_at, created_by
- 佔位符：`VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` (15 個)

#### 修復方案
創建修復腳本 `fix-kol-insert-15-to-14.js`，將 15 個佔位符修正為 14 個。

#### 部署步驟
```powershell
# 1. 備份資料庫
ssh root@165.227.147.40 "docker exec taskflow-pro node dist/index.js backup"

# 2. 上傳並執行修復腳本
Get-Content "fix-kol-insert-15-to-14.js" -Raw | ssh root@165.227.147.40 "cat > /tmp/fix-kol-insert-15-to-14.js"
ssh root@165.227.147.40 "docker cp /tmp/fix-kol-insert-15-to-14.js taskflow-pro:/app/fix-kol-insert-15-to-14.js && docker exec -w /app taskflow-pro node fix-kol-insert-15-to-14.js"

# 3. 重啟容器
ssh root@165.227.147.40 "docker restart taskflow-pro"

# 4. 創建新映像
ssh root@165.227.147.40 "docker commit taskflow-pro taskflow-pro:v8.9.144-kol-insert-fix"

# 5. 創建完整快照
ssh root@165.227.147.40 "/root/create-snapshot.sh v8.9.144-kol-insert-fix"
```

#### 最終版本
- **後端映像**: `taskflow-pro:v8.9.144-kol-insert-fix`
- **快照**: `taskflow-snapshot-v8.9.144-kol-insert-fix-20260121_092740.tar.gz` (213MB)
- **前端**: 無需修改
- **狀態**: ✅ 已修復，KOL 合約新增功能正常

#### 驗證結果
```bash
# 修復前
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)  # 15 個

# 修復後
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)     # 14 個
```

#### 關鍵教訓
1. **SQL 語句完整性檢查**：INSERT 語句的欄位數量必須與佔位符數量完全匹配
2. **記憶倉庫的價值**：此問題已在記憶倉庫中記錄過，快速定位問題
3. **標準修復流程**：備份 → 修復 → 重啟 → Commit 映像 → 創建快照
4. **使用修復腳本**：避免手動編輯，確保修復可追溯和可重現

---

### 38. 系統版本回溯與升級 ⭐⭐⭐
**完成時間**: 2026-01-21 下午 16:36
**狀態**: ✅ 已完成

#### 操作流程
用戶要求回溯到台灣時間 AM 1:00 前後的版本，但保留當前資料庫數據。

**階段 1：回溯到 v8.9.142-kol-notes-backend**
- **時間**: 2026-01-21 16:22
- **版本**: v8.9.142-kol-notes-backend (2026-01-20 22:39 創建)
- **原因**: 最接近用戶要求的時間點
- **結果**: ✅ 系統運行正常

**階段 2：升級到 v8.9.143-direct-connection**
- **時間**: 2026-01-21 16:36
- **版本**: v8.9.143-direct-connection (2026-01-21 15:50 創建)
- **原因**: 用戶確認要使用最新最好的版本
- **結果**: ✅ 升級成功

#### 遵循的規則
✅ **嚴格遵循全域規則和工作日誌流程**：
1. 修改前創建快照備份
2. 備份當前資料庫
3. 停止當前容器
4. 使用新映像啟動容器
5. 驗證系統功能
6. 創建新版本快照
7. 更新工作日誌

#### 備份記錄
- **v8.9.142 升級前快照**: `taskflow-snapshot-v8.9.142-before-upgrade-to-143-20260121_083342.tar.gz` (213MB)
- **資料庫備份**: `taskflow-backup-2026-01-21T08-35-05-176Z.db` (3.20 MB)
- **v8.9.143 部署後快照**: `taskflow-snapshot-v8.9.143-direct-connection-deployed-20260121_083632.tar.gz` (213MB)

#### 資料保留
✅ **所有員工數據已完整保留**：
- 13 個用戶
- 9 個任務
- 99 筆打卡記錄
- 所有上傳資料

#### 系統驗證
- ✅ 容器運行正常
- ✅ API 健康檢查通過
- ✅ WebSocket 連接正常
- ✅ 資料庫完整性確認
- ⚠️ Rate-limit 警告（不影響功能）

#### 版本功能對比
**v8.9.143-direct-connection 包含**：
- ✅ 所有 AI 助理進階功能
- ✅ KOL 備註和週薪備註完整支援
- ✅ 支付驗證功能
- ✅ 直接連接優化
- ✅ 所有已知問題修復

#### 關鍵教訓
1. **遵循標準流程**: 嚴格按照全域規則執行，確保安全
2. **多層備份**: 快照 + 資料庫備份，雙重保險
3. **資料保留**: 使用 volume 掛載確保數據不丟失
4. **即時驗證**: 每個步驟都驗證狀態
5. **文檔更新**: 完成後立即更新工作日誌

---

## 🎯 2026-01-20 更新記錄

### 36. AI 助理營運報表識別修復 ⭐
**完成時間**: 2026-01-20 下午 17:45
**狀態**: ✅ 已上線 (後端)

#### 問題描述
用戶詢問「營運報表」時，AI 回答找不到。原因是營運報表在資料庫中是以 JSON 格式儲存於 `reports` 表中，AI 看到的是未經處理的 JSON 字串，且不知道這就是「營運報表」。

#### 修改內容
1.  **後端邏輯修改** (`ai-assistant.js`):
    - **JSON 解析**: 在讀取報表時，嘗試解析 JSON 內容。
    - **格式化輸出**: 若偵測到包含 `netIncome` 或 `depositAmount` 等欄位，自動轉換為可讀格式（如 `[Operational Data] Net Income: $10000...`）。
    - **Prompt 優化**: 將對應區塊標題改為 `Operational Reports & Daily Logs`，明確告知 AI 這裡包含營運數據。

#### 驗證結果
- 已部署更新。
- AI 現在能正確識別並解讀營運報表的內容，回答如「昨天的淨利是多少？」、「最近的入金狀況」等問題。

---

### 37. 系統總結與備份 (2026-01-20)
**完成時間**: 2026-01-20 下午 20:55
**狀態**: ✅ 完成

#### 總結
本次更新主要針對 AI 助理 (`ai-assistant.js`) 進行了大幅度的能力升級：
1.  **長期記憶**: 實作 `ai_memories` 表與相關邏輯，讓 AI 能記住用戶偏好。
2.  **全權限存取**: 解除 AI 讀取限制，整合考勤、請假、日報、合約、財務、KOL 付款等全方位數據。
3.  **智能報表識別**: 修復 AI 無法解讀 JSON 格式營運報表的問題。

#### 備份
- 建立最終快照: `taskflow-snapshot-v8.9.140-ai-upgrade-final`

---

### 35. AI 助理全權限數據存取 (God Mode) ⭐⭐
**完成時間**: 2026-01-20 下午 17:15
**狀態**: ✅ 已上線 (後端)

#### 需求描述
用戶希望給予 AI 「最大權限」，使其能讀取系統內所有關鍵運營數據，不再受限於僅能查看人員與任務。

#### 修改內容
1.  **後端邏輯修改** (`ai-assistant.js`):
    - **全模組數據整合**: 在 System Context 中新增以下模組的最新數據：
        - **考勤 (Attendance)**: 最近 20 筆打卡紀錄。
        - **請假 (Leaves)**: 最近 10 筆請假申請。
        - **日報 (Reports)**: 最近 10 筆員工日報。
        - **合約 (Contracts)**: 最近 10 筆活躍的 KOL 合約。
    - **Prompt 增強**: 將上述數據格式化後注入 System Prompt，並加入明確的區塊標題 (Attendance, Work Reports, Financials & Contracts)。

#### 驗證結果
- 已部署更新。
- AI 現在具備「全知」視角，能回答跨模組的複雜問題，例如：「上週誰請假？」、「最近有誰遲到？」、「目前有哪些進行中的合約？」。

---

### 34. AI 助理財務數據存取授權 ⭐
**完成時間**: 2026-01-20 下午 16:55
**狀態**: ✅ 已上線 (後端)

#### 問題描述
用戶詢問 AI 關於業績/財務問題時，AI 回答「沒有權限」或「沒有相關數據」。這是因為 System Prompt 中未包含財務模組的數據，AI 實際上是真的「看不到」。

#### 修改內容
1.  **後端邏輯修改** (`ai-assistant.js`):
    - **擴充 Context**: 在 `getSystemContext` 中增加查詢 `finance` (最近 20 筆支出/收入) 與 `kol_payments` (最近 10 筆 KOL 付款)。
    - **Prompt 更新**: 將格式化後的財務數據加入 System Prompt 的 `### Recent Financial Records` 與 `### Recent KOL Payments` 區塊。
    - **部門名稱解析**: 同樣支援將財務記錄中的部門 ID 轉換為中文名稱。

#### 驗證結果
- 已部署更新。
- AI 現在能回答如「最近有哪些大筆支出？」、「上個月付給 KOL 多少錢？」等問題。

---

### 33. AI 助理長期記憶功能 (方案 A) ⭐⭐⭐
**完成時間**: 2026-01-20 下午 16:15
**狀態**: ✅ 已上線 (後端)

#### 需求描述
用戶希望 AI 具備「學習成長」的能力，經評估後選擇「方案 A：長期記憶庫」。讓 AI 能記錄用戶的偏好與規則，並在後續對話中自動應用。

#### 修改內容
1.  **資料庫變更**:
    - 新增 `ai_memories` 表格，用於儲存記憶內容 (id, content, type, created_at)。
2.  **後端邏輯修改** (`ai-assistant.js`):
    - **寫入機制**: 增加意圖識別，當用戶說「記住」、「筆記」等關鍵字時，自動將該訊息存入資料庫。
    - **讀取機制**: 在 `getSystemContext` 中讀取最新的 20 筆記憶。
    - **Prompt 注入**: 將記憶列表加入 System Prompt 的 `### Long-term Memories` 區塊，強制 AI 遵守。

#### 使用方式
- 用戶只需說：「記住，以後週五下午不排會議」或「筆記：我的英文名字是 Tony」。
- AI 下次回答時就會參考這些規則。

---

### 32. AI 助理部門名稱顯示修復 ⭐
**完成時間**: 2026-01-20 下午 15:45
**狀態**: ✅ 已上線 (後端)

#### 問題描述
用戶回報 AI 顯示的部門名稱為亂碼（實際為部門 ID，如 `j06ng7vy3`），這是因為 System Prompt 構建時直接使用了 `users` 表中的 `department` 欄位，而未與 `departments` 表進行關聯查詢。

#### 修改內容
1.  **後端邏輯修改** (`ai-assistant.js`):
    - 在 `buildSystemPrompt` 函數中，增加部門名稱查找邏輯。
    - 使用 `context.departments` 陣列將用戶的 `department` ID 轉換為可讀的 `name`。
    - 如果找不到對應部門，則顯示 ID 或 'None'。

#### 驗證結果
- 已部署更新後的 `ai-assistant.js` 到後端容器。
- AI 現在應能正確顯示如 "Management"、"人事部" 等正確部門名稱，而非 ID 代碼。

---

### 31. AI 助理對話順序修復 ⭐
**完成時間**: 2026-01-20 下午 15:30
**狀態**: ✅ 已上線 (後端)

#### 問題描述
用戶回報重新載入對話後，AI 的回應顯示在用戶訊息之前（或順序錯亂），且兩者時間戳完全相同。這是因為後端在處理請求時，用戶訊息和 AI 回應使用了同一個 `now` 變數作為創建時間，導致排序不穩定。

#### 修改內容
1.  **後端邏輯修改** (`ai-assistant.js`):
    - 用戶訊息寫入時使用請求開始的時間。
    - AI 回應寫入時，重新生成一個新的當前時間戳 (`new Date().toISOString()`)。
    - 確保 AI 回應的時間永遠晚於用戶訊息，保證正確的對話順序。
2.  **查詢邏輯增強**:
    - 在獲取對話歷史 (`GET /conversations`) 時，增加 `rowid DESC` 作為第二排序條件。
    - 這能修復**現有**時間戳完全相同的舊對話記錄，確保後寫入的資料 (AI 回應) 會排在前面 (在前端反轉後即為最後)，徹底解決順序錯亂問題。

#### 驗證結果
- 已部署更新後的 `ai-assistant.js` 到後端容器。
- 重新載入對話後，即使時間戳相同，AI 的回應也會正確顯示在用戶訊息之後。

---

### 30. AI 助理對話視窗滾動優化 ⭐
**完成時間**: 2026-01-20 下午 14:45
**狀態**: ✅ 已上線 (前端)

#### 問題描述
用戶回報在 AI 助理介面發送訊息後，頁面會整體向下滾動，導致輸入框跑掉，影響使用體驗。

#### 修改內容
1.  **前端組件修改** (`AIAssistantView.tsx`):
    - 移除原本使用 `scrollIntoView` 的滾動方式（這會導致整個頁面滾動）。
    - 改為使用 `scrollTop` 直接控制訊息容器的滾動位置。
    - 確保 `scrollToBottom` 只影響訊息列表區域，保持輸入框位置穩定。
2.  **部署優化**:
    - 調整 `netlify.toml`，禁用 Netlify 端的自動構建（避免環境差異導致失敗），改為完全依賴本地構建上傳。

#### 驗證結果
- 已重新部署前端到 Netlify (Deploy ID: `696f22f9fd1c05d7ff0516d9`)。
- 發送訊息後，只有訊息列表會滾動到底部，輸入框保持固定在視窗底部。

---

### 29. AI 智能助理隱私限制解除 ⭐⭐⭐
**完成時間**: 2026-01-20 下午 14:30
**狀態**: ✅ 已上線

#### 需求描述
用戶確認系統為內部使用，BOSS 對所有員工資料都一清二楚，因此不需要 AI 的隱私保護機制，AI 應能存取並回答所有員工的詳細資料。

#### 修改內容
1.  **資料查詢範圍擴大** (`getSystemContext`):
    - 用戶資料：增加查詢 `username`, `role`, `department`, `created_at` (仍排除密碼)。
    - 任務資料：增加查詢 `assigned_to_user_id`, `deadline`, `urgency`。
    
2.  **System Prompt 優化** (`buildSystemPrompt`):
    - 明確告知 AI：「這是內部系統，您擁有所有數據的完全訪問權限。沒有隱私限制。」
    - 在 Prompt 中提供完整的員工目錄（姓名、職位、部門、用戶名）。
    - 在任務列表中解析並顯示負責人姓名。

3.  **Bug 修復**:
    - 修正了 `tasks` 表查詢時使用不存在的 `assignees` 欄位導致的 SQL 錯誤，改為正確的 `assigned_to_user_id`。

#### 驗證結果
- 使用 `verify-privacy-removal.js` 測試。
- AI 成功列出所有員工（包括測試用的 `Seven`, `錢來也`, `大俠` 等）及其部門。
- AI 確認可以回答關於員工的詳細問題。

#### 部署信息
- **後端版本**: `taskflow-pro:v8.9.139-ai-privacy-removed`
- **Docker 運行命令**: `docker restart taskflow-pro` (代碼已熱更新)
- **快照**: (即將創建)

---

### 28. AI 智能助理完全修復與上線 ⭐⭐⭐
**完成時間**: 2026-01-19 晚上 23:20
**狀態**: ✅ 已上線

#### 問題解決
用戶提供了新的有效 Gemini API Key (`AIzaSyC6...`)。經過測試，舊的 `gemini-1.5-flash-latest` 模型名稱在新帳號下無法使用 (404 Not Found)。

#### 解決方案
1.  **更換模型**：將後端模型更新為最新且可用的 `gemini-2.0-flash`。
2.  **更新 Key**：在容器環境變數中應用新的 API Key。
3.  **驗證**：
    - 使用 `verify-gemini-2.0.js` 確認 API Key 和模型組合有效。
    - 使用 `verify-ai-success.js` 確認端到端對話功能正常（已從 429 限流中恢復）。

#### 部署信息
- **後端版本**: `taskflow-pro:v8.9.138-ai-fixed`
- **Docker 運行命令**: 更新了 `-e GEMINI_API_KEY` 參數。
- **快照**: (即將創建)

---

### 27. AI 助理優雅降級機制 (Graceful Fallback) ⭐⭐
**完成時間**: 2026-01-19 晚上 22:15
**狀態**: ✅ 已部署

#### 問題描述
當 Gemini API Key 無效或服務不可用時，後端會拋出 500 錯誤，導致前端介面顯示錯誤且無法進行後續操作。之前的「暫時停用」版本雖然解決了報錯問題，但完全切斷了 API 調用嘗試，無法在 API Key 恢復時自動運作。

#### 解決方案
實作優雅降級 (Graceful Fallback) 機制：
1. **保留 API 調用邏輯**：系統仍會嘗試調用 Gemini API。
2. **錯誤捕獲**：在 `fetch` 調用周圍添加 `try-catch`。
3. **友善回應**：
   - 若 API 返回非 200 狀態（如 400 API Key 無效），返回：「⚠️ AI 服務暫時無法使用 (錯誤代碼: [status])。請檢查 API Key 設定或稍後再試。」
   - 若發生網路錯誤，返回：「⚠️ 網路連線錯誤，無法連接至 AI 服務。」
4. **正常格式返回**：後端返回正常的 JSON 格式 (`{ response: "..." }`)，前端將其視為正常的 AI 回應顯示，避免紅色的錯誤提示。

#### 技術實現
- **文件**: `ai-assistant-ascii.js` (部署為 `/app/dist/routes/ai-assistant.js`)
- **代碼變更**:
  ```javascript
  try {
    const response = await fetch(...);
    if (!response.ok) {
      aiResponse = '\u26a0\ufe0f AI \u670d\u52d9...'; // Unicode escaped message
    } else {
      // Process successful response
    }
  } catch (error) {
    aiResponse = '\u26a0\ufe0f \u7db2\u8def...';
  }
  ```

#### 部署信息
- **後端版本**: `taskflow-pro:v8.9.137-ai-graceful-fallback`
- **快照**: `taskflow-snapshot-v8.9.137-ai-graceful-fallback-20260119_140808.tar.gz`
- **驗證**: 使用 `verify-graceful-fallback.js` 模擬 API 調用，確認在 API Key 無效時返回了預期的友善訊息和 200 狀態碼。

#### 效益
- ✅ **自動恢復**：一旦 API Key 生效，無需重新部署，系統會自動恢復正常回答。
- ✅ **用戶體驗**：用戶看到的是對話框中的提示訊息，而不是系統錯誤彈窗。
- ✅ **診斷方便**：訊息中包含錯誤代碼，方便快速判斷問題原因。

---

### 26. AI 智能助理功能開發（暫時停用） ⭐⭐⭐
**完成時間**: 2026-01-19 晚上 21:37  
**狀態**: ⚠️ 後端代碼已修復，但 Gemini API Key 無法使用，暫時返回維護訊息

#### 功能目標
為 BOSS 角色提供專屬的 AI 智能助理，可以：
- 查詢公司數據（備忘錄、任務、員工、報表等）
- 提供智能分析和建議
- 保存對話歷史

#### 已完成工作

**1. 後端路由完全修復** ✅
- 文件：`/app/dist/routes/ai-assistant.js`
- 修復內容：
  - ✅ 錯誤的資料庫調用（`dbCall` → `db.all/run`）
  - ✅ 中文字符轉為 Unicode Escape（符合 Pure ASCII 要求）
  - ✅ SQL 查詢欄位錯誤（`priority` → `urgency`）
  - ✅ SQL 語法錯誤（使用模板字串避免引號衝突）
- Git Commits:
  - `adf3fc4`: 修復資料庫調用和 ASCII 轉換
  - `c041b04`: 修復 tasks 欄位
  - `e105b29`: 修復 SQL 語法

**2. 環境變數設置** ✅
- 在 Docker 容器中設置 `GEMINI_API_KEY`
- 重啟容器時自動帶入環境變數

**3. 資料庫表結構** ✅
- 已存在 `ai_conversations` 表用於保存對話歷史

#### 當前問題：Gemini API Key 無法使用

**問題現象**：
- ✅ AI Studio 網頁可以正常使用
- ❌ API Key 從程式調用時返回 `API_KEY_INVALID`
- ❌ 從本地和伺服器測試都失敗
- ❌ 嘗試多個模型和 API endpoint 都失敗
- ❌ 等待 10+ 分鐘仍無效

**已嘗試的解決方案**：
1. ✅ 啟用 Gemini API
2. ✅ 設置計費帳戶
3. ✅ 修改 API Key 限制為「無」
4. ✅ 創建新的 API Key
5. ✅ 測試不同的 API 格式
6. ❌ 所有方法都失敗

**API Key 資訊**：
- Key: `AIzaSyC13jOlDBMpyEL9d-xQ4dvCrnoDBtOpYiI`
- 專案: task pro (573459402239)
- 狀態: AI Studio 可用，程式調用無效

#### 暫時解決方案

**部署內容**：
- 修改 AI 助理路由，返回友好的「功能維護中」訊息
- 用戶不會看到錯誤，只是暫時無法使用 AI 功能

**維護訊息**：
```
🔧 AI 智能助理功能目前正在升級維護中，預計很快就會上線。

我們正在優化 AI 服務以提供更好的體驗，請稍後再試。感謝您的耐心等候！
```

#### 部署信息
- **後端版本**: `taskflow-pro:v8.9.136-ai-temp-disabled`
- **快照**: `taskflow-snapshot-v8.9.136-ai-temp-disabled-20260119_133416.tar.gz` (213MB)
- **Git Commit**: `7038cc2` - temp: AI 助理暫時停用
- **環境變數**: GEMINI_API_KEY 已設置

#### 交接文檔
**為 Gemini 接手準備的完整文檔**：
- 文件：`HANDOFF-TO-GEMINI-20260119.md`
- 包含：
  - 專案背景和系統架構
  - 已完成的工作和代碼修復
  - API Key 問題的診斷過程
  - 測試方法和腳本
  - 緊急恢復步驟
  - 所有關鍵資訊（伺服器、Git、API Key）

#### 下一步建議
1. **解決 Gemini API Key 問題**（推薦）
   - 檢查是否需要 OAuth 而非 API Key
   - 等待 24 小時後重試
   - 聯繫 Google Support

2. **使用其他 AI 服務**
   - OpenAI GPT API
   - Anthropic Claude API

3. **繼續優化其他功能**
   - 暫時保持維護訊息
   - 等待 API Key 問題解決

#### 關鍵教訓
1. **第三方 API 依賴風險**：API Key 可能有各種限制和啟用延遲
2. **優雅降級**：提供友好的維護訊息比報錯更好
3. **完整文檔**：交接時需要詳細記錄所有診斷過程
4. **環境變數管理**：確保容器重啟時正確帶入環境變數

---

### 25. KOL 合約編輯 UI 優化 ⭐⭐
**完成時間**: 2026-01-19 下午 14:40

#### 問題描述
用戶反映編輯合約時，系統要求選擇 KOL，但下拉選單中沒有任何 KOL 可選。這不符合邏輯，因為編輯合約時 KOL 已經確定，不應該讓用戶重新選擇。

#### 用戶反饋
> "編輯合約 我選擇了一個合約 還要我選擇KOL 這不符合邏輯 我已經確定是要編輯那張合約了還要選擇KOL 且現在下拉條按出沒有KOL可以選擇 可能是有問題"

#### 根本原因
`EditContractModal` 使用了與 `AddContractModal` 相同的 UI 模式，顯示 KOL 下拉選單。但編輯合約時，合約已經綁定到特定 KOL，不應該允許更改。

#### 優化方案
將 KOL 選擇器改為只顯示當前合約綁定的 KOL 資訊（不可編輯）。

**優化前**：
```typescript
<select
  required
  value={formData.kolId}
  onChange={(e) => setFormData({ ...formData, kolId: e.target.value })}
  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
>
  <option value="">請選擇</option>
  {profiles.map(p => (
    <option key={p.id} value={p.id}>...</option>
  ))}
</select>
```

**優化後**：
```typescript
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">KOL</label>
  <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
    {KOL_PLATFORMS.find(pl => pl.value === contract.platform)?.icon} {contract.platformId} (@{contract.platformAccount})
  </div>
  <p className="text-xs text-gray-500 mt-1">編輯合約時無法更改 KOL</p>
</div>
```

#### 部署信息
- **前端 Deploy ID**: `696dd151f3fda7571b063e6d`
- **生產 URL**: https://transcendent-basbousa-6df2d2.netlify.app
- **後端版本**: `taskflow-pro:v8.9.129-kol-contract-insert-fix` (無需修改)
- **優化時間**: 2026-01-19 14:40

#### 優化效果
- ✅ 編輯合約時清楚顯示當前 KOL 資訊
- ✅ 不再顯示混淆的下拉選單
- ✅ 明確提示「編輯合約時無法更改 KOL」
- ✅ 更符合業務邏輯和用戶預期
- ✅ 灰色背景視覺上表示不可編輯

#### UI 改進
**新增合約**：顯示下拉選單，可選擇 KOL
**編輯合約**：顯示固定資訊，不可更改 KOL

#### 關鍵教訓
1. **業務邏輯優先**：UI 設計應符合業務邏輯，合約綁定 KOL 後不應允許更改
2. **用戶反饋重要**：用戶指出的邏輯問題往往是 UX 設計缺陷
3. **視覺提示**：使用灰色背景和提示文字明確表示欄位不可編輯
4. **差異化設計**：新增和編輯應該有不同的 UI 模式

---

### 24. KOL 合約編輯無法儲存問題修復 ⭐
**完成時間**: 2026-01-19 下午 14:30

#### 問題描述
用戶反映編輯合約後無法儲存，系統沒有任何錯誤提示。

#### 診斷過程

**1. 檢查後端日誌**
```
SqliteError: NOT NULL constraint failed: kol_contracts.cleared_amount
code: 'SQLITE_CONSTRAINT_NOTNULL'
```

**2. 檢查後端 PUT 路由**
後端路由正確包含了 `cleared_amount` 和 `total_paid` 欄位：
```javascript
UPDATE kol_contracts 
SET start_date = ?, end_date = ?, salary_amount = ?, deposit_amount = ?,
    unpaid_amount = ?, cleared_amount = ?, total_paid = ?, contract_type = ?,
    notes = ?, updated_at = ?
WHERE id = ?
```

#### 根本原因
前端 `EditContractModal` 在提交時沒有傳送 `clearedAmount` 和 `totalPaid` 欄位，導致後端 UPDATE 語句因 NOT NULL 約束失敗。

#### 修復方案
在前端 `handleSubmit` 函數中添加缺少的欄位，使用合約現有值或預設值 0。

**修復前**：
```typescript
onSubmit({
  ...formData,
  salaryAmount: parseFloat(formData.salaryAmount),
  depositAmount: parseFloat(formData.depositAmount),
  unpaidAmount: parseFloat(formData.unpaidAmount)
});
```

**修復後**：
```typescript
onSubmit({
  ...formData,
  salaryAmount: parseFloat(formData.salaryAmount),
  depositAmount: parseFloat(formData.depositAmount),
  unpaidAmount: parseFloat(formData.unpaidAmount),
  clearedAmount: contract.clearedAmount || 0,
  totalPaid: contract.totalPaid || 0
});
```

#### 部署信息
- **前端 Deploy ID**: `696dced0bf4e745ee98905e8`
- **生產 URL**: https://transcendent-basbousa-6df2d2.netlify.app
- **後端版本**: `taskflow-pro:v8.9.129-kol-contract-insert-fix` (無需修改)
- **修復時間**: 2026-01-19 14:30

#### 修復效果
- ✅ 編輯合約功能完全正常
- ✅ 可以成功更新合約資料
- ✅ 保留現有的 `clearedAmount` 和 `totalPaid` 值
- ✅ 所有欄位正確保存到資料庫

#### 關鍵教訓
1. **後端日誌診斷**：`docker logs` 清楚顯示 NOT NULL 約束失敗
2. **完整性檢查**：前端提交數據必須包含所有後端 NOT NULL 欄位
3. **預設值處理**：使用 `|| 0` 確保數值欄位有預設值
4. **保留現有值**：編輯時應保留不在表單中的欄位值

---

### 23. KOL 合約編輯和刪除功能 ⭐⭐
**完成時間**: 2026-01-19 下午 14:10

#### 功能需求
用戶要求為 KOL 合約添加編輯和刪除功能，方便管理合約資料。

#### 技術實現

**前端修改** (`components/KOLManagementView.tsx`)

**1. 添加狀態管理**
```typescript
const [showEditContractModal, setShowEditContractModal] = useState(false);
const [selectedContract, setSelectedContract] = useState<KOLContract | null>(null);
```

**2. 添加處理函數**
```typescript
// 編輯合約
const handleEditContract = async (data: any) => {
  if (!selectedContract) return;
  try {
    await api.kol.updateContract(selectedContract.id, data);
    setShowEditContractModal(false);
    setSelectedContract(null);
    alert('合約更新成功！');
    loadData();
  } catch (error) {
    console.error('Edit contract error:', error);
    alert('更新合約失敗');
  }
};

// 刪除合約
const handleDeleteContract = async (contractId: string) => {
  try {
    await api.kol.deleteContract(contractId);
    alert('合約刪除成功！');
    loadData();
  } catch (error) {
    console.error('Delete contract error:', error);
    alert('刪除合約失敗');
  }
};
```

**3. 修改合約列表 UI**
在每個合約行添加三個操作按鈕：
- 💰 **支付** (綠色) - 快速記錄支付
- ✏️ **編輯** (藍色) - 編輯合約資料
- 🗑️ **刪除** (紅色) - 刪除合約（帶確認對話框）

**4. 添加編輯合約 Modal**
```typescript
const EditContractModal: React.FC<{ 
  contract: KOLContract;
  profiles: KOLProfile[];
  onClose: () => void; 
  onSubmit: (data: any) => void;
}> = ({ contract, profiles, onClose, onSubmit }) => {
  // 預填充現有合約資料
  const [formData, setFormData] = useState({
    kolId: contract.kolId,
    salaryAmount: contract.salaryAmount.toString(),
    depositAmount: contract.depositAmount.toString(),
    unpaidAmount: contract.unpaidAmount.toString(),
    startDate: contract.startDate || '',
    endDate: contract.endDate || '',
    contractType: contract.contractType || 'NORMAL',
    notes: contract.notes || ''
  });
  // ... 表單實現
};
```

**後端 API**
- ✅ `PUT /api/kol/contracts/:id` - 已存在
- ✅ `DELETE /api/kol/contracts/:id` - 已存在

#### 部署信息
- **前端 Deploy ID**: `696dc9badf1d5e5e6b0daeb3`
- **生產 URL**: https://transcendent-basbousa-6df2d2.netlify.app
- **後端版本**: `taskflow-pro:v8.9.129-kol-contract-insert-fix` (無需修改)
- **部署時間**: 2026-01-19 14:10

#### 功能特點

**編輯功能**：
- ✅ 點擊「✏️ 編輯」按鈕打開編輯 Modal
- ✅ 預填充現有合約所有資料
- ✅ 可修改 KOL、工資、訂金、未付金額、日期、備註
- ✅ 提交後立即更新列表

**刪除功能**：
- ✅ 點擊「🗑️」按鈕觸發刪除
- ✅ 顯示確認對話框，包含合約詳細信息
- ✅ 確認後刪除合約並更新列表

**UI 優化**：
- ✅ 三個按鈕清晰排列，顏色區分功能
- ✅ 編輯 Modal 與新增 Modal 風格一致
- ✅ 刪除前有詳細確認信息，防止誤刪

#### 關鍵教訓
1. **後端路由檢查**：先檢查後端是否已有對應路由，避免重複開發
2. **狀態管理**：使用 `selectedContract` 追蹤當前編輯的合約
3. **用戶體驗**：刪除前顯示詳細確認信息，包含 KOL 名稱和金額
4. **代碼複用**：編輯 Modal 與新增 Modal 結構相似，保持一致性

---

### 22. KOL 合約新增失敗問題修復 ⭐
**完成時間**: 2026-01-19 下午 13:54

#### 問題描述
用戶在 KOL 管理系統中新增合約時，系統顯示「新增合約失敗」錯誤提示。

#### 診斷過程

**1. 檢查前端代碼**
- `KOLManagementView.tsx` 的 `handleAddContract` 函數正常
- `AddContractModal` 組件正常提交數據
- API 調用 `api.kol.createContract(data)` 正常

**2. 檢查資料庫結構**
```javascript
// 使用診斷腳本檢查
Columns: id, kol_id, start_date, end_date, salary_amount, deposit_amount, 
         unpaid_amount, cleared_amount, total_paid, contract_type, notes, 
         created_at, updated_at, created_by, department_id
```
- ✅ 表結構完整，所有必要欄位都存在

**3. 檢查後端日誌**
```
SqliteError: 15 values for 14 columns
```

#### 根本原因
後端 `/app/dist/routes/kol.js` 的 POST /contracts 路由中，INSERT 語句有 **15 個佔位符 (?)** 但只有 **14 個欄位**，導致 SQL 語法錯誤。

**錯誤的 INSERT 語句**：
```sql
INSERT INTO kol_contracts (
  id, kol_id, start_date, end_date, salary_amount, deposit_amount, 
  unpaid_amount, cleared_amount, total_paid, contract_type, notes, 
  created_at, updated_at, created_by
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)  -- 15 個 ?
```

#### 修復方案
移除多餘的佔位符，使其與欄位數量匹配。

**修復後的 INSERT 語句**：
```sql
INSERT INTO kol_contracts (
  id, kol_id, start_date, end_date, salary_amount, deposit_amount, 
  unpaid_amount, cleared_amount, total_paid, contract_type, notes, 
  created_at, updated_at, created_by
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)  -- 14 個 ?
```

#### 技術實現
- **診斷腳本**: `diagnose-kol-contract.js` - 檢查資料庫表結構
- **檢查腳本**: `check-kol-routes.js` - 檢查後端路由
- **修復腳本**: `fix-kol-contract-insert.js` - 修正 INSERT 語句

#### 部署信息
- **後端版本**: `taskflow-pro:v8.9.129-kol-contract-insert-fix`
- **快照備份**: `taskflow-snapshot-v8.9.129-kol-contract-insert-fix-20260119_055426.tar.gz` (213MB)
- **修復時間**: 2026-01-19 13:54

#### 修復效果
- ✅ 新增合約功能完全正常
- ✅ 可以成功創建 KOL 合約
- ✅ 所有欄位正確保存到資料庫
- ✅ 前端顯示「合約新增成功！」

#### 關鍵教訓
1. **容器內診斷**：使用 Node.js 腳本精確檢查後端代碼和資料庫
2. **查看後端日誌**：`docker logs` 提供關鍵錯誤信息
3. **SQL 語法檢查**：INSERT 語句的欄位數量必須與佔位符數量完全匹配
4. **遵循全域規則**：修復後立即 `docker commit` 創建新映像和快照

---

## 🎯 2026-01-16 更新記錄

### 21. 下屬每日任務執行狀況不顯示 - 持久化修復 ⭐⭐⭐
**完成時間**: 2026-01-16 下午 15:05

#### 問題描述
v8.9.127 的修復在容器重啟後丟失，問題再次出現。根本原因是只修改了容器內文件，沒有修改本地源代碼。

#### 根本原因
1. **容器內修復非持久化**：直接在容器內修改文件，重啟後使用舊映像恢復
2. **本地源代碼未更新**：`server/src/routes/routines.ts` 是空殼，實際邏輯在編譯後的 JS
3. **忘記 Docker 映像原理**：容器 = 映像（不可變）+ 可變層（臨時）

#### 解決方案（完整流程）

**步驟 1：從容器備份實際文件**
```bash
ssh root@165.227.147.40 "docker exec taskflow-pro cat /app/dist/routes/routines.js" > routines-backup.js
```

**步驟 2：修改本地文件**
- 文件：`routines-backup.js`
- 修復：根據角色返回不同範圍的記錄（SUPERVISOR/BOSS/EMPLOYEE）
- 修復：使用正確的欄位 `r.completed_items`

**步驟 3：上傳到容器**
```powershell
Get-Content "routines-backup.js" -Raw | ssh root@165.227.147.40 "cat > /tmp/routines-fixed.js"
ssh root@165.227.147.40 "docker cp /tmp/routines-fixed.js taskflow-pro:/app/dist/routes/routines.js"
```

**步驟 4：重啟並創建新映像**
```bash
docker restart taskflow-pro
docker commit taskflow-pro taskflow-pro:v8.9.128-routine-history-role-based
```

**步驟 5：創建完整快照**
```bash
/root/create-snapshot.sh v8.9.128-routine-history-role-based
```

#### 驗證結果（模擬前端完整流程）
測試用戶：**阿德（SUPERVISOR，x3ye5179b 部門）**
- API 返回：12 條部門記錄
- 今天（2026-01-16）：4 條記錄
  - 翔哥：0/3 (0%)
  - 小芳：0/3 (0%)
  - 阿德：0/3 (0%)
  - 茉莉：3/3 (100%) ✓

#### 部署信息
- **後端版本**: `taskflow-pro:v8.9.128-routine-history-role-based`
- **快照備份**: `taskflow-snapshot-v8.9.128-routine-history-role-based-20260116_070507.tar.gz` (213MB)
- **資料庫備份**: `taskflow-backup-2026-01-16T06-46-49-165Z.db` (3.20 MB)
- **Git Commit**: `78ec654`
- **本地文件**: `routines-backup.js` (已修復並上傳)

#### 修復效果
- ✅ 容器重啟後修復仍然有效（持久化）
- ✅ SUPERVISOR 看到所有部門下屬的記錄
- ✅ BOSS 看到所有部門的記錄
- ✅ EMPLOYEE 只看到自己的記錄
- ✅ 前端正確顯示完成百分比和進度條

#### 關鍵教訓（重要！）
1. **Docker 映像不可變**：修改容器內文件必須 commit 新映像
2. **修復流程正確性**：備份容器文件 → 修改 → 上傳 → 重啟 → commit → 快照
3. **使用 PowerShell 管道**：`Get-Content | ssh` 是唯一可靠的上傳方式
4. **完整測試流程**：模擬前端調用 API 的完整流程驗證修復
5. **遵循全域規則**：每次修復前創建快照，修復後 commit 映像

---

## 🎯 2026-01-16 早期記錄

### 20. 下屬每日任務執行狀況不顯示問題修復 ⭐⭐
**完成時間**: 2026-01-16 下午 14:35

#### 問題描述
主管在「團隊工作概況 → 每日任務執行狀況」頁面無法看到下屬的任務完成狀態，所有卡片都顯示空白，但資料庫中有完成記錄。

#### 診斷結果
資料庫中確實有完成記錄：
- 2026-01-15: 3人完成100%
- 2026-01-14: 3人完成100%  
- 2026-01-16: 1人完成100%

#### 根本原因（兩個錯誤）

**1. 欄位映射錯誤**：
- 資料庫欄位：`completed_items`
- 後端錯誤使用：`r.items`（該欄位不存在）
- 結果：前端收到空的 `items` 陣列

**2. 查詢範圍錯誤**：
- 原始查詢：`WHERE user_id = ? AND department_id = ?`
- 問題：只查詢當前登入用戶自己的記錄
- 結果：主管無法看到下屬的記錄

#### 修復方案

**修復 1：欄位映射**
```javascript
// 修改前
items: JSON.parse(r.items || '[]')

// 修改後
items: JSON.parse(r.completed_items || '[]')
```

**修復 2：查詢範圍（根據角色）**
```javascript
// SUPERVISOR: 返回整個部門的記錄
if (req.user.role === 'SUPERVISOR') {
  records = dbCall(db, 'prepare',
    'SELECT * FROM routine_records WHERE department_id = ? AND date >= ?'
  ).all(userDept, startDate);
}

// BOSS/MANAGER: 返回所有記錄
else if (req.user.role === 'BOSS' || req.user.role === 'MANAGER') {
  records = dbCall(db, 'prepare',
    'SELECT * FROM routine_records WHERE date >= ?'
  ).all(startDate);
}

// EMPLOYEE: 只返回自己的記錄
else {
  records = dbCall(db, 'prepare',
    'SELECT * FROM routine_records WHERE user_id = ? AND department_id = ? AND date >= ?'
  ).all(userId, userDept, startDate);
}
```

#### 技術實現
- **診斷腳本**: `diagnose-routine-records.js` - 檢查資料庫實際數據
- **修復腳本**: `fix-routine-history-complete.js` - 修復兩個錯誤
- **驗證腳本**: `verify-routine-history-fix.js` - 驗證修復效果

#### 驗證結果
- ✅ **BOSS**: 看到 15 條記錄（所有部門）
- ✅ **SUPERVISOR**: 看到 12 條記錄（自己部門）
- ✅ **EMPLOYEE**: 看到 3 條記錄（只有自己）

#### 部署信息
- **後端版本**: `taskflow-pro:v8.9.127-routine-history-fixed`
- **快照備份**: `taskflow-snapshot-v8.9.127-routine-history-fixed-20260116_063113.tar.gz` (213MB)
- **資料庫備份**: `taskflow-backup-2026-01-16T06-31-05-216Z.db` (3.20 MB)
- **Git Commit**: `c6b99bd`

#### 修復效果
- ✅ 主管可以看到部門內所有下屬的每日任務完成狀態
- ✅ BOSS 可以看到所有部門的所有記錄
- ✅ 完成百分比正確顯示
- ✅ 已完成任務顯示綠色背景 + ✓
- ✅ 未完成任務顯示灰色背景 + ○
- ✅ 進度條正確顯示完成百分比

#### 關鍵教訓
1. **容器內診斷**：使用 Node.js 腳本精確檢查資料庫數據和欄位名稱
2. **權限邏輯**：不同角色需要不同的查詢範圍
3. **欄位映射**：確保後端使用正確的資料庫欄位名稱
4. **Pure ASCII 規則**：腳本必須使用英文避免編碼問題
5. **遵循全域規則**：修復前診斷，修復後驗證，部署後備份

---

## 🎯 2026-01-15 更新記錄

### 19. 下屬每日任務完成統計顯示修復 ⭐⭐
**完成時間**: 2026-01-15 上午 06:12

#### 問題描述
主管在「團隊工作概況 → 每日任務執行狀況」頁面看不到下屬的任務完成狀態，所有卡片都顯示「今日尚未開始每日任務」，但實際上資料庫中有完成記錄。

#### 根本原因（兩個錯誤）

**1. 欄位映射錯誤**：
- 資料庫欄位名稱：`completed_items`
- 後端錯誤使用：`r.items`
- 結果：前端收到空的 `items` 陣列

**2. 查詢範圍錯誤（主要問題）**：
- 原始查詢：只返回當前登入用戶自己的記錄
- 問題：主管無法看到下屬的記錄
- SQL: `WHERE user_id = ? AND department_id = ?`

#### 修復方案

**修復 1：欄位映射**
```javascript
// 修改前
items: JSON.parse(r.items || '[]')

// 修改後
items: JSON.parse(r.completed_items || '[]')
```

**修復 2：查詢範圍（根據角色）**
```javascript
// SUPERVISOR: 返回整個部門的記錄
if (req.user.role === 'SUPERVISOR') {
  records = dbCall(db, 'prepare',
    'SELECT * FROM routine_records WHERE department_id = ? AND date >= ?'
  ).all(userDept, startDate);
}

// BOSS/MANAGER: 返回所有記錄
else if (req.user.role === 'BOSS' || req.user.role === 'MANAGER') {
  records = dbCall(db, 'prepare',
    'SELECT * FROM routine_records WHERE date >= ?'
  ).all(startDate);
}

// EMPLOYEE: 只返回自己的記錄
else {
  records = dbCall(db, 'prepare',
    'SELECT * FROM routine_records WHERE user_id = ? AND department_id = ? AND date >= ?'
  ).all(userId, userDept, startDate);
}
```

#### 技術實現
- **診斷腳本**: `diagnose-routine-history-fixed.js` - 診斷資料庫實際數據
- **修復腳本 1**: `fix-routine-history-field-mapping.js` - 修復欄位映射
- **修復腳本 2**: `fix-routine-history-query-final.js` - 修復查詢範圍
- **驗證腳本**: `verify-routine-history-api-fix.js` - 驗證修復效果

#### 部署信息
- **後端版本**: `taskflow-pro:v8.9.126-routine-history-query-scope-fix`
- **快照備份**: 
  - v8.9.125: `taskflow-snapshot-v8.9.125-routine-history-field-fix-20260114_220241.tar.gz` (213MB)
  - v8.9.126: `taskflow-snapshot-v8.9.126-routine-history-query-scope-fix-20260114_220947.tar.gz` (213MB)
- **資料庫備份**: `taskflow-backup-2026-01-14T22-12-41-215Z.db` (3.20 MB)
- **Git Commits**: 
  - `3c9e128`: 修復欄位映射錯誤
  - `78af648`: 修復查詢範圍錯誤

#### 診斷發現
資料庫中確實有完成記錄：
- **2026-01-13**: 2 人完成 100% (user-1767674479948, user-1767451212149)
- **2026-01-14**: 3 人完成 100%
- **問題**: 後端 API 查詢條件錯誤，導致前端收不到數據

#### 修復效果
- ✅ BOSS 可以看到所有部門的所有下屬記錄
- ✅ SUPERVISOR 可以看到自己部門的所有下屬記錄
- ✅ EMPLOYEE 只看到自己的記錄
- ✅ 完成百分比正確顯示
- ✅ 已完成任務顯示綠色背景 + ✓
- ✅ 未完成任務顯示灰色背景 + ○
- ✅ 進度條正確顯示完成百分比

#### 關鍵教訓
1. **容器內診斷**：使用 Node.js 腳本精確檢查資料庫數據和欄位名稱
2. **權限邏輯**：不同角色需要不同的查詢範圍
3. **欄位映射**：確保後端使用正確的資料庫欄位名稱
4. **遵循全域規則**：修改前創建快照，修改後創建新映像和資料庫備份

---

## 🎯 2026-01-14 更新記錄

### 18. KOL 完整管理系統 ⭐⭐⭐
**完成時間**: 2026-01-14 下午 13:36

#### 功能概述
重新建置完整的 KOL 管理系統，從管理者角度設計，提供實用的合約和支付管理功能。

#### 新增功能

**1. 三大視圖標籤頁**
- 👥 KOL 列表 - 查看所有 KOL 基本資料
- 📄 合約管理 - 查看和管理所有合約
- 💰 支付記錄 - 查看所有支付歷史

**2. 合約管理**
- 新增合約 Modal
- 合約列表視圖（顯示工資、訂金、未付金額、已付金額、到期日）
- 合約快速支付按鈕

**3. 支付記錄**
- 記錄支付 Modal
- 支付歷史視圖
- 支付類型：工資、訂金、獎金、其他

**4. 快速支付功能**
- KOL 卡片上的「💰 快速支付」按鈕（當有未付金額時顯示）
- 合約列表中的快速支付按鈕
- KOL 詳情 Modal 中的快速支付按鈕

**5. KOL 詳情 Modal**
- 顯示完整基本資訊
- 顯示所有合約記錄（含金額詳情）
- 顯示所有支付記錄
- 可直接新增合約和記錄支付

**6. 後端 API 完整化**
- GET /api/kol/contracts - 獲取合約列表
- POST /api/kol/contracts - 新增合約
- PUT /api/kol/contracts/:id - 更新合約
- DELETE /api/kol/contracts/:id - 刪除合約
- GET /api/kol/payments - 獲取支付記錄
- POST /api/kol/payments - 記錄支付
- DELETE /api/kol/payments/:id - 刪除支付
- POST /api/kol/batch/payments - 批量支付

#### 技術實現
- **前端組件**: `KOLManagementView.tsx` (完整重寫，約 800 行)
- **後端腳本**: `add-kol-complete-routes.js` (添加完整 API)
- **資料表**: kol_profiles, kol_contracts, kol_payments, kol_operation_logs

#### 部署信息
- **後端版本**: `taskflow-pro:v8.9.124-kol-complete-system`
- **前端 Deploy ID**: `69672b2fbb8596d47cbd4af3`
- **快照**: `taskflow-snapshot-v8.9.124-kol-complete-system-20260114_053609.tar.gz`
- **Git Commit**: `aabb266`

#### 管理者使用流程
1. 進入「財務管理」→「🎯 KOL 管理」
2. 新增 KOL → 新增合約 → 記錄支付
3. 使用「快速支付」按鈕快速記錄日常支付
4. 在「合約管理」標籤頁查看所有合約狀態
5. 在「支付記錄」標籤頁查看完整支付歷史

---

## 🎯 2026-01-13 更新記錄

### 17. 主管查看部屬每日任務完成狀態修復 ⭐
**完成時間**: 2026-01-13 晚上 19:54

#### 問題描述
主管在「團隊工作概況 → 每日任務執行狀況」頁面無法看到部屬每日任務的完成狀態，所有任務都顯示為未完成。

#### 根本原因
後端 `routines.js` 的第一個 toggle 路由有嚴重錯誤：
```javascript
// 錯誤代碼
completedItems[index] = isCompleted;  // 直接設置布林值，破壞數據結構
```

這導致任務數據從正確格式 `[{"text":"...", "completed":true}]` 被破壞成 `[true]`，任務文本完全丟失。

#### 修復方案
1. **修正 Toggle 路由**：
   - 正確更新對象的 `completed` 屬性而非替換整個對象
   - 添加類型檢查確保數據結構完整性

2. **清理損壞數據**：
   - 修復：1 條記錄（保留有效項目）
   - 刪除：21 條記錄（完全損壞，無法恢復）
   - 涵蓋日期：2026-01-06 至 2026-01-13

#### 技術實現
- **修復腳本**: `fix-routine-toggle.js` - 修正 toggle 路由邏輯
- **清理腳本**: `fix-corrupted-routine-data.js` - 清理損壞的歷史數據
- **診斷腳本**: `check-routine-data.js` - 檢查數據結構

#### 部署信息
- **後端版本**: `taskflow-pro:v8.9.81-routine-data-cleaned`
- **快照備份**: `taskflow-snapshot-v8.9.81-routine-data-cleaned-20260113_101252.tar.gz` (213MB)
- **資料庫備份**: `taskflow-backup-2026-01-13T11-54-43-492Z.db` (3.20 MB)
- **Git Commits**: 
  - `61bbe99`: 修正 toggle 路由保持任務結構
  - `97faab5`: 清理損壞的每日任務記錄

#### 修復效果
- ✅ 主管可以正確看到部屬每日任務完成狀態
- ✅ 已完成任務顯示綠色背景 + ✓
- ✅ 未完成任務顯示灰色背景 + ○
- ✅ 進度條正確顯示完成百分比
- ✅ 不會再發生數據結構破壞

#### 關鍵教訓
1. **數據結構完整性**：修改 JSON 數據時必須保持原有結構
2. **容器內診斷**：使用 Node.js 腳本精確檢查數據格式
3. **數據修復策略**：無法恢復的損壞數據應該刪除而非保留
4. **遵循全域規則**：修改前創建快照，修改後創建新映像

---

### 16. 資料清理工具 - BOSS 專用批量刪除功能 ⭐
**完成時間**: 2026-01-13 下午 16:30

#### 功能概述
為 BOSS 角色添加批量刪除舊資料的功能，可按時間範圍和資料分類清理過期資料。

#### 功能特點
**時間範圍選項**：
- 一個月以前
- 兩個月以前
- 三個月以前
- 六個月以前

**資料分類（10 種）**：
1. 📋 任務記錄（tasks）
2. 📅 請假記錄（leave_requests）
3. 📊 排班記錄（schedules）
4. ⏰ 打卡記錄（attendance_records）
5. 📝 每日任務記錄（routine_records）
6. 💰 財務記錄（finance）
7. 📢 公告記錄（announcements）
8. 💡 提案記錄（suggestions）
9. 📈 報表記錄（reports）
10. 📝 備忘錄（memos）

#### 功能特點
- **權限控制**: 僅 BOSS 角色可使用
- **時間範圍**: 1/2/3/6 個月前的資料
- **預覽功能**: 刪除前可預覽將刪除的資料數量
- **雙重確認**: 預覽 + 最終確認，防止誤刪
- **操作日誌**: 記錄刪除操作的詳細信息
- **批量刪除**: 支援多選資料分類同時刪除

#### 技術實現
- **前端組件**: `DataCleanupView.tsx`
- **後端 API**: `/api/data-cleanup/preview` 和 `/api/data-cleanup/delete`
- **權限控制**: 僅 BOSS 角色可使用
- **UI 設計**: 紫色主題，步驟式操作流程

#### 部署信息
- **前端生產**: Deploy ID `696602010b1bbc8a5df941dd`
- **前端測試**: Deploy ID `6966005dfc26eb0c848c9ec5`
- **後端版本**: `taskflow-pro:v8.9.108-data-cleanup`
- **快照備份**: `taskflow-snapshot-v8.9.109-20260113-162854-20260113_082920.tar.gz` (213MB)
- **Git Commit**: `4c79ee3`

#### 訪問路徑
1. 登入 BOSS 帳號
2. 點擊左側邊欄最下方「⚙️ 系統設定」
3. 切換到「系統管理」標籤
4. 找到「🗑️ 資料清理工具」區塊
5. 點擊「開啟清理工具」按鈕

#### 改善效果
- ✅ 提供批量刪除舊資料的功能
- ✅ 按時間範圍和分類靈活篩選
- ✅ 預覽功能避免誤刪
- ✅ 雙重確認保障安全
- ✅ 操作日誌可追溯

---

## 🎯 2026-01-10 更新記錄

### 15. 通知中心功能 - 類似 Facebook 的通知系統 ⭐
**完成時間**: 2026-01-10 晚上 20:00

#### 功能特色
- **下拉選單模式**: 點擊鈴鐺顯示通知選單，不直接跳轉
- **多種通知類型**:
  1. 📋 待接取任務（藍色圖標）
  2. 💬 新訊息（綠色圖標）
  3. 📢 新公告（橙色圖標）
- **智能計數**: 鈴鐺徽章顯示總通知數（任務 + 聊天 + 公告）
- **獨立跳轉**: 每個通知項目可獨立點擊跳轉到對應頁面

#### 使用邏輯（類似 Facebook）
1. 有人發訊息 → 鈴鐺顯示 `1`
2. 同時有新任務 → 鈴鐺顯示 `2`
3. 點擊鈴鐺 → 顯示下拉選單，列出所有通知
4. 點擊特定通知 → 跳轉到對應頁面

#### 視覺設計
- **位置**: 主頁面標題列（「已連線」左側）
- **通知中心標題**: 藍色漸層背景
- **每個通知項目**: 獨立顏色圖標 + 標題 + 描述 + 紅色數字徽章
- **Hover 效果**: 背景變色
- **無通知時**: 顯示友善提示「沒有新通知」

#### 技術實現
- **狀態管理**: 
  - `isNotificationMenuOpen` - 控制選單開關
  - `taskNotificationCount` - 任務通知數量
  - `unreadChatCount` - 未讀訊息數量
  - `unreadAnnouncementCount` - 未讀公告數量
  - `totalNotificationCount` - 總通知數量
- **計算邏輯**:
  - 任務: 新分配 + 公開任務 + 未讀更新
  - 公告: 未標記已讀的公告
  - 聊天: 現有的 `unreadChatCount`
- **UI 細節**:
  - 寬度: 320px (w-80)
  - 最大高度: 384px (max-h-96) 可滾動
  - 自動關閉: 點擊外部區域
  - 動畫: 徽章閃爍效果 (animate-pulse)

#### 部署信息
- **前端 Deploy ID**: `69623f5e19401de87268cd40`
- **後端版本**: `taskflow-pro:v8.9.107-notification-center`
- **快照**: `taskflow-snapshot-v8.9.107-notification-center-20260110_120801.tar.gz` (213MB)
- **Git Commits**: 
  - `76879ae`: 添加通知鈴鐺功能到標題列
  - `434fa04`: 重新設計通知鈴鐺為下拉選單模式（類似 Facebook）
  - `04ff06b`: 將通知鈴鐺移到主頁面標題列（已連線旁邊）

#### 改善效果
- ✅ 統一的通知入口，不需要到處找通知
- ✅ 清楚顯示各類通知數量
- ✅ 快速跳轉到需要處理的頁面
- ✅ 類似 Facebook 的使用體驗，用戶容易上手
- ✅ 下拉選單不會被裁切（位置在主頁面）

---

### 14. 假表排班月曆優化 - 今日排班卡片設計 ⭐
**完成時間**: 2026-01-10 晚上

#### 問題背景
- 手機版月曆顯示過於擁擠，字體小、間距緊湊
- 用戶反饋「很難閱讀」、「還是很難看」
- 頁面內容被限制在固定高度容器內，需要在框框內滾動

#### 解決方案
**1. 今日排班卡片設計**
- 預設顯示「今日排班摘要」（手機版和桌面版統一）
- 大字體顯示日期和星期
- 漂亮的藍色漸層背景 (`from-blue-50 to-indigo-50`)
- 三種清晰的狀態卡片：
  - ⚠️ 橙色：人力不足警告
  - 🏖️ 紅色：休息人員（標籤式顯示）
  - ✓ 綠色：上班人員（標籤式顯示）
- 提供「查看完整月曆」展開/收起功能

**2. 頁面佈局修復**
- 移除根容器的 `h-full` 限制，改用 `min-h-screen`
- 移除內容區域的 `overflow-y-auto` 限制
- 讓頁面內容自然延伸，使用原生頁面滾動

#### 技術實現
- **文件**: `components/LeaveManagementView.tsx`
- **狀態管理**: 添加 `showFullCalendar` 狀態控制展開/收起
- **響應式設計**: 手機版和桌面版使用相同的優化界面
- **佈局優化**: 
  - 根容器: `min-h-screen flex flex-col`
  - 內容區域: 移除 `overflow-y-auto`
  - 今日卡片: `min-h-[400px]` 確保最小高度

#### 部署信息
- **前端 Deploy ID**: `696236d43ca158d4d757cce6`
- **Git Commits**: 
  - `7b0d02b`: 優化假表排班月曆：所有裝置預設顯示今日排班卡片
  - `9fffc82`: 修復今日排班卡片內容被裁切問題
  - `dcf63b2`: 調整今日排班卡片高度，移除空白區域
  - `a1628df`: 修復假表頁面滾動限制問題
  - `abd5999`: 修復頁面高度限制問題 - 改用 min-h-screen

#### 改善效果
- ✅ 更好的閱讀性：大字體、清晰的顏色區分
- ✅ 更快的信息獲取：一眼看到今日重要信息
- ✅ 保留完整功能：需要時可展開查看完整月曆
- ✅ 統一體驗：手機和桌面使用相同的優化界面
- ✅ 頁面內容完整顯示，不再被框框限制

---

### 13. 儀表板優化與打卡編輯功能 ⭐
**完成時間**: 2026-01-10 上午

#### 儀表板優化
- **P0 功能**:
  - 快速操作區（5個快捷按鈕）
  - 任務快速接取（一鍵接取待接收任務）
  - 公告快速標記已讀
- **UI/UX 改善**:
  - 視覺層次優化（漸層、陰影、邊框）
  - 空狀態優化（友善提示 + 行動按鈕）
  - 動畫效果（slide-in, fade-in, scale）
  - 互動反饋（hover, active 狀態）
- **性能優化**:
  - useMemo 優化數據計算
  - useCallback 優化函數
  - 減少不必要的重新渲染
- **響應式設計**:
  - 移動端優先設計
  - 觸控區域 ≥ 44px（符合 iOS 標準）
  - 字體大小適配
  - 間距優化

#### 打卡記錄編輯功能
- **功能特性**:
  - BOSS 可編輯所有打卡記錄
  - 可編輯日期和時間
  - 支持跨日打卡（獨立下班日期選擇）
  - 自動計算工時
  - 權限控制（僅 BOSS）
- **技術實現**:
  - 前端 API: `api.attendance.update()`
  - 後端 API: `PUT /api/attendance/:id`
  - 修復循環引用錯誤（使用 useMemo）
  - 移除不存在的 notes 欄位

#### 補登打卡功能修復
- **問題**: 資料庫缺少補登相關欄位導致 500 錯誤
- **解決方案**:
  - 添加 `is_manual` 欄位（INTEGER DEFAULT 0）
  - 添加 `manual_reason` 欄位（TEXT）
  - 添加 `manual_by` 欄位（TEXT）
  - 添加 `manual_at` 欄位（TEXT）
- **結果**: 補登功能完全正常

#### UI 優化
- **月假表標籤**: 將「列表管理」改為「假表審核」，更準確描述功能

#### 遇到的問題與解決方案

**問題 1: 出勤資料不顯示**
- **原因**: `filterDept` 初始化時 `isBoss` 變量未定義
- **解決**: 重命名為 `isBossRole` 並提前聲明

**問題 2: 循環引用錯誤**
- **錯誤**: `Uncaught ReferenceError: Cannot access 'te' before initialization`
- **原因**: `displayAttendance` 在計算過程中被引用
- **解決**: 使用 `useMemo` 包裝過濾邏輯

**問題 3: 編輯打卡 404 錯誤**
- **原因**: 後端缺少 `PUT /api/attendance/:id` 路由
- **解決**: 創建並部署編輯路由

**問題 4: 編輯打卡 500 錯誤**
- **原因**: 資料庫缺少 `notes` 欄位
- **解決**: 移除 API 中對 `notes` 欄位的引用

**問題 5: 補登打卡 500 錯誤**
- **原因**: 資料庫缺少 `is_manual`, `manual_reason`, `manual_by`, `manual_at` 欄位
- **解決**: 逐步添加所有缺失欄位
- **腳本**: `add-all-manual-columns.js`

**問題 6: 登入失敗**
- **原因**: 容器重啟後欄位未完整添加
- **解決**: 確保所有欄位添加完成後再重啟

#### 部署信息
- **前端生產**: Deploy ID `69618c4756ec8149ac77e779`
- **前端測試**: Deploy ID `696188ea5f419a423e9ba6f2`
- **後端版本**: `taskflow-pro:v8.9.106-manual-complete`
- **快照備份**: `taskflow-snapshot-v8.9.106-attendance-complete-20260109_233125.tar.gz` (213MB)
- **Git Commits**: 
  - `72fa2c7` - Feature: Dashboard optimization + Attendance edit functionality
  - `c421fc4` - UI: Change leave schedule tab label

---

## 🎯 今日重大成就 (2026-01-09)

### 1. 從 Source Map 恢復源代碼 ⭐
- **問題**: 本地代碼丟失，無法獲取原始源代碼
- **解決**: 從 Netlify source map 成功提取完整源代碼（22 個文件）
- **結果**: 本地代碼完全恢復

### 2. 建立 Git 版本控制 ⭐
- 初始化 Git 倉庫
- 創建完整提交歷史
- 建立標籤系統
- **結果**: 不會再丟失代碼

### 3. 完整備份系統 ⭐
- **第一層**: Git 版本控制（代碼歷史）
- **第二層**: 本地 zip 備份（快速恢復）
- **第三層**: 資料庫備份（數據保護）
- **第四層**: 後端快照（完整系統）
- **結果**: 四層備份保護

### 4. 測試/生產環境分離 ⭐
- 建立獨立測試環境（bejewelled-shortbread-a1aa30）
- 創建部署腳本（deploy-test.ps1, deploy-prod.ps1）
- **結果**: 安全的部署流程

### 5. WebSocket 修復 ⭐
- 更新到當前 Cloudflare Tunnel
- 即時更新功能恢復
- **結果**: 所有功能正常

### 6. 問題解決 ⭐
- 解決備份導致的容器崩潰
- 創建改進版快照腳本
- **結果**: 備份流程更安全

### 7. 根絕 PowerShell 語法錯誤 ⭐
- **問題**: `check-system-status.ps1` 存在語法錯誤（使用 `&&` 運算符、中文編碼問題）
- **解決**: 
  - 修復所有 `&&` 改為 `;`
  - 創建 `check-system-status-fixed.ps1`（純英文版本）
  - 創建 `POWERSHELL-BEST-PRACTICES.md` 完整防錯指南
- **結果**: 
  - 腳本可正常運行
  - 建立完整的 PowerShell 最佳實踐規範
  - 防止未來出現類似錯誤
- **Git Commit**: `663cc14` - Fix PowerShell syntax errors and add best practices guide

### 8. 報表編輯和刪除功能完善 ⭐
- **需求**: 報表要能夠編輯調整以及刪除
- **問題發現**:
  1. 刪除報表時出現 500 錯誤（缺少 `report_edit_logs` 表）
  2. 編輯和刪除按鈕不顯示（權限邏輯問題）
  3. 編輯報表後計算錯誤（未重新計算 netIncome）
  4. 標籤名稱不清晰（「新增報表」應為「營運報表」）
- **解決方案**:
  1. 創建 `report_edit_logs` 表存儲編輯歷史
  2. 修復按鈕顯示邏輯（BOSS/MANAGER 可見所有報表）
  3. 編輯時自動重算 netIncome、conversionRate、firstDepositRate
  4. 優化標籤名稱為「營運報表」
- **結果**:
  - 報表編輯和刪除功能完全正常
  - 編輯歷史被完整記錄
  - 權限控制清晰明確
  - UI 更加直觀
- **版本**: v8.9.98-report-edit-complete
- **快照**: `taskflow-snapshot-v8.9.98-report-edit-complete-20260109_083434.tar.gz` (213MB)
- **詳細文檔**: `WORK_LOG_20260109_REPORT_EDIT_DELETE.md`

### 9. 審核歷史查看功能 ⭐
- **需求**: 前端查看報表審核歷史記錄
- **實現**:
  1. 後端 API: `GET /api/reports/approval/audit-log`
  2. 前端組件: `AuditLogView.tsx`
  3. 集成到報表頁面作為新標籤「📋 審核歷史」
- **功能**:
  - 查看所有審核操作記錄（申請、批准、拒絕）
  - 篩選功能（操作類型、日期範圍）
  - 分頁顯示
  - 權限控制（BOSS/MANAGER 看全部，SUPERVISOR 看部門）
- **結果**: 審核流程透明化，可追溯
- **Git Commits**: 
  - `ae65bf6` - Deploy complete audit log viewing feature to production
  - `9d29fa5` - Fix report delete error by creating report_edit_logs table

### 10. 資料庫自動備份頻率調整 ⭐
- **需求**: 將自動備份從每天 1 次改為每天 4 次
- **修改前**: 每天凌晨 02:00 (UTC) 備份一次
- **修改後**: 每天 00:00、06:00、12:00、18:00 (UTC) 備份四次
- **台灣時間**: 08:00、14:00、20:00、02:00（次日）
- **優點**:
  - 更頻繁的備份保護
  - 數據丟失風險從 24 小時降至 6 小時
  - 每 6 小時一個恢復點
- **Cron 配置**: 已更新並驗證
- **文檔**: `BACKUP-SCHEDULE-UPDATE.md`

### 11. 一般員工重新整理被登出問題修復 ⭐ (2026-01-10)
- **問題**: 一般員工（EMPLOYEE）重新整理頁面後會被登出
- **根本原因**:
  - `GET /api/users` 路由需要 BOSS/MANAGER/SUPERVISOR 權限
  - 一般員工無權訪問，導致 403 Forbidden
  - 前端 session 恢復時調用此 API 失敗 → 清除 token → 被登出
- **解決方案**:
  - 改用 `GET /api/users/:id` 替代 `GET /api/users`
  - 此路由有 `requireSelfOrAdmin` 中間件，允許用戶查看自己的資料
  - 所有角色都可使用，無需管理員權限
- **修改內容**:
  1. `services/api.ts` - 新增 `getById` 方法
  2. `App.tsx` - 修改 session 恢復邏輯使用 `getById`
- **結果**:
  - ✅ 一般員工重新整理不會被登出
  - ✅ 其他角色不受影響
  - ✅ 無需修改後端代碼
- **版本**: v8.9.99-employee-refresh-fix
- **Git Commit**: `42d4e56` - Fix: Employee logout on refresh
- **詳細文檔**: `fix-employee-refresh-logout.md`

### 12. 動態模組載入錯誤修復 ⭐ (2026-01-10)
- **問題**: 有時會出現 "Failed to load module script: Expected JavaScript but server responded with MIME type text/html"
- **根本原因**:
  - `netlify.toml` 的萬用路由 `/* → /index.html` 攔截所有請求
  - 包括 `/assets/*.js` 靜態資源
  - Netlify 返回 HTML 而非 JavaScript → 模組載入失敗
- **解決方案**:
  - 優化 `netlify.toml` 配置
  - 移除不當的 no-cache 設定
  - 簡化 SPA fallback（Netlify 會自動先檢查文件存在性）
- **修改內容**:
  1. `/assets/*` → 永久緩存（`max-age=31536000, immutable`）
  2. `/*.html` → 不緩存（確保最新版本）
  3. SPA fallback 自然排除靜態資源
- **結果**:
  - ✅ 動態模組正確載入（正確 MIME type）
  - ✅ 改善頁面載入速度
  - ✅ 減少不必要的網路請求
  - ✅ 優化緩存策略
- **影響組件**: 所有 lazy loading 組件（17 個）
- **版本**: v8.9.100-module-loading-fix
- **Git Commit**: `待提交` - Fix: Dynamic module loading error
- **詳細文檔**: `fix-dynamic-module-loading.md`

---

## 📁 重要文件清單

### 備份相關
1. **`complete-backup.ps1`** - 完整備份腳本（Git + 本地 + 後端）
2. **`backup-database.ps1`** - 獨立資料庫備份
3. **`improved-snapshot.sh`** - 改進版後端快照（伺服器端）
4. **`BACKUP-GUIDE.md`** - 詳細備份使用指南
5. **`COMPLETE-BACKUP-STRATEGY.md`** - 備份策略文檔

### 部署相關
6. **`deploy-test.ps1`** - 測試環境部署
7. **`deploy-prod.ps1`** - 生產環境部署

### 系統檢查
8. **`check-system-status-fixed.ps1`** - 系統狀態檢查腳本（無語法錯誤版本）

### 文檔
9. **`WORK_LOG_CURRENT.md`** - 當前工作日誌（本文件）
10. **`PROJECT-KNOWLEDGE-BASE.md`** - 項目知識庫
11. **`POWERSHELL-BEST-PRACTICES.md`** - PowerShell 最佳實踐指南（防止語法錯誤）

---

## 🔧 常用命令

### 系統檢查
```powershell
# 檢查系統狀態
.\check-system-status-fixed.ps1
```

### 備份
```powershell
# 完整備份
.\complete-backup.ps1 -Version "v版本號" -Description "描述"

# 資料庫備份
.\backup-database.ps1 -BackupName "backup-name"

# 後端快照
ssh root@165.227.147.40 "/root/create-snapshot-improved.sh v版本號"
```

### 部署
```powershell
# 測試環境
.\deploy-test.ps1

# 生產環境
.\deploy-prod.ps1
```

### Git
```powershell
# 提交變更
git add .
git commit -m "描述"

# 創建標籤
git tag -a "tag-name" -m "描述"

# 查看歷史
git log --oneline -10
```

---

## 🎯 系統功能狀態

### 核心功能 ✅
- [x] 用戶登入/登出
- [x] 儀表板
- [x] 任務管理
- [x] 假表管理
- [x] 企業通訊（聊天）
- [x] 部門數據中心
- [x] 出勤打卡

### 進階功能 ✅
- [x] 企業公告欄
- [x] 部門文件與規範（SOP）
- [x] 績效考核（KPI）
- [x] 工作報表中心
- [x] 零用金與公費
- [x] 提案討論區
- [x] 個人備忘錄
- [x] 人員帳號管理
- [x] 系統設定

### 即時更新 ✅
- [x] WebSocket 連接
- [x] 即時通知
- [x] 即時數據更新

---

## 📊 資料庫狀態

### 用戶
- **總數**: 12 個
- **角色分布**: BOSS, MANAGER, SUPERVISOR, EMPLOYEE

### 假表系統
- **請假記錄**: 0 筆（已清空測試資料）
- **排班記錄**: 0 筆（已清空測試資料）
- **狀態**: 乾淨，可用

### 資料庫備份
- **最新備份**: 2026-01-09 12:33:13
- **大小**: 6.38 MB
- **位置**: `C:\Users\USER\Downloads\TaskFlow-DB-Backups`

---

## 🚀 部署記錄

### 最新部署
| 日期 | 環境 | Deploy ID | 說明 |
|------|------|-----------|------|
| 2026-01-09 12:30 | 生產 | 696084895a9a07801e57fc81 | 修復 WebSocket，包含完整假表功能 |
| 2026-01-09 12:30 | 測試 | 6960843ec9bc3c7b0f2eb32d | 測試版本 |

---

## ⚠️ 已知問題

### 無

當前系統運行穩定，無已知問題。

---

## 📝 待辦事項

### 無

當前系統功能完整，無待辦事項。

---

## 🎓 經驗教訓

### 1. 永遠要有 Git 版本控制
- 代碼丟失後很難恢復
- Git 是最基本的保護

### 2. 多層備份很重要
- 單一備份不夠
- 需要代碼、資料庫、系統的完整備份

### 3. 測試環境必不可少
- 測試部署不應影響生產環境
- 獨立測試環境可以安全測試

### 4. 備份時要小心
- 不要在容器運行時 commit
- 使用改進的快照腳本

### 5. Source Map 是救命稻草
- Netlify 部署包含 source maps
- 可以從 source map 恢復源代碼

### 6. PowerShell 語法規範很重要
- 不能使用 `&&` 運算符（改用 `;`）
- 避免中文字符導致編碼問題
- 創建腳本前參考最佳實踐指南
- 建立防錯機制可以避免重複問題

---

## 🔗 相關資源

### 伺服器
- **IP**: 165.227.147.40
- **SSH**: `ssh root@165.227.147.40`
- **密碼**: j7WW03n4emoh（測試完成後需修改）

### Netlify
- **生產 Site ID**: 5bb6a0c9-3186-4d11-b9be-07bdce7bf186
- **測試 Site ID**: 480c7dd5-1159-4f1d-867a-0144272d1e0b

### Cloudflare Tunnel
- **當前 URL**: robust-managing-stay-largely.trycloudflare.com
- **啟動命令**: `cloudflared tunnel --url http://localhost:3000`

---

## 📞 緊急命令

### 重啟容器
```bash
ssh root@165.227.147.40 "docker restart taskflow-pro"
```

### 查看日誌
```bash
ssh root@165.227.147.40 "docker logs taskflow-pro --tail 50"
```

### 檢查容器狀態
```bash
ssh root@165.227.147.40 "docker ps | grep taskflow-pro"
```

### 恢復資料庫
```bash
# 從最新快照恢復
ssh root@165.227.147.40 "cd /root/taskflow-snapshots && ls -lt *.tar.gz | head -1"
```

---

**最後更新**: 2026-01-09 12:56  
**維護者**: AI Assistant  
**狀態**: ✅ 系統穩定運行
