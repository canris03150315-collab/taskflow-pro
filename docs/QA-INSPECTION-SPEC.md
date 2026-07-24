# TaskFlow Pro 全系統檢測 Spec

版本：v1（2026-07-25）
起因：canris 回報「員工無法刪除、感覺許多功能壞了」。現行 QA skill 只涵蓋 11 個模組，
但 backend 實際有 **30 個路由模組**——大半功能從來沒被系統性測過。這份 spec 補齊涵蓋面，
並且把「怎麼判定壞掉」的方法固定下來。

---

## 0. 核心判定原則：「壞了」有三種，測試要能分辨

| 分類 | 特徵 | 例子 | 修法方向 |
|------|------|------|---------|
| A. 後端真的壞 | API 回 5xx，或回 200 但資料錯 | schema 缺欄位 INSERT 失敗 | 修後端 |
| B. 設計如此，但 UI 沒溝通 | API 回 4xx **帶明確理由**，前端沒顯示 | 員工刪除（見附錄） | 修前端錯誤顯示 / UX |
| C. 前端壞 | 後端正常，前端呼叫錯／吞錯誤／顯示錯 | ghost API method、snake_case 讀 undefined | 修前端 |

> **學習點**：HTTP 400/403 不等於「壞掉」——那是後端「故意拒絕並附理由」。
> 真正的 bug 常常是：理由沒有被送到使用者眼前。
> 每一條測試的回報都必須標 A / B / C，不能只寫「失敗」。

---

## 1. Layer 0 — 靜態掃描（不用啟動系統，約 5 分鐘，最便宜先跑）

歷史上（2026-06-04）一次 `tsc` 掃描就抓出 4 顆「按鈕按了直接壞」的 ghost method。
「感覺許多功能壞了」時，**永遠先跑這層**。

### 0-1 Ghost API method / 大小寫不一致（盲區類型 L、M）
```bash
cd "C:/Users/canri/Projects/Migrated_From_USB/公司內部"
npx tsc --noEmit 2>&1 | grep "does not exist"
```
- 每一筆 `Property 'X' does not exist` 都要逐一處理，不准當 backlog。
- `Did you mean ...?` 提示 = 八成是 snake_case/camelCase 拼錯。

### 0-2 錯誤被吞掉的 handler（本次員工刪除的病根）
```bash
grep -n "await api\." App.tsx components/*.tsx | grep -iv "try\|catch"
```
- 逐一檢查呼叫點：是否被 try/catch 或 `.catch()` 包住、catch 裡是否有 showError/toast。
- 沒有 → 後端 4xx 的理由永遠到不了使用者眼前 → 症狀是「按了沒反應」。

### 0-3 Bearer-auth 壞圖（盲區類型 N）
```bash
grep -rn "img src={" components/ | grep -i "geturl\|/api/"
```
- `<img src>` 指向需要 Authorization 的 endpoint = 必壞（瀏覽器不帶 header）。

### 0-4 表單內按鈕缺 type（盲區類型 K）
```bash
grep -rn "<button " components/ | grep -v "type="
```
- 清單中的元件若被放進 `<form>` 內就會誤觸 submit，逐一補 `type="button"`。

---

## 2. Layer 1 — API 契約測試（curl，不用瀏覽器）

### 2-1 前置：健康與身分
```bash
BASE=http://localhost:3001        # 換環境只改這行；正式站為 https://alpha.wuk-on.com 等
curl -s $BASE/api/health
TOKEN=$(curl -s -X POST $BASE/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"canris","password":"<本機慣用密碼，不寫進文件>"}' | # 從回應取 token
  python -c "import sys,json;print(json.load(sys.stdin)['token'])")
```

### 2-2 Instance identity check（盲區類型 F、G）
| 請求 | subsidiary 預期 | central 預期 |
|------|----------------|--------------|
| GET /api/central/dashboard | 404 | 401（未帶 token 時） |
| GET /api/service-api/... | 401 | 404 |
| GET /api/不存在的路徑 | **404 JSON**（若回 200 HTML = SPA fallback 吃掉 API，類型 G） | 同左 |

### 2-3 全模組 GET smoke（30 個路由）

對照表：`backend/dist/routes/` 共 30 檔。每個模組先打最基本的 GET，預期 200 + JSON。

| # | 模組 | 端點（GET） | 現行 QA skill 有測? |
|---|------|------------|:---:|
| 1 | 認證 | /api/auth（login 流程） | ✅ |
| 2 | **員工管理** | /api/users | ❌ ← 本次破口 |
| 3 | **部門管理** | /api/departments | ❌ |
| 4 | 任務 | /api/tasks | ✅ |
| 5 | **考勤** | /api/attendance | ❌ |
| 6 | **績效** | /api/performance | ❌ |
| 7 | 財務 | /api/finance | ✅ |
| 8 | **報表** | /api/reports | ❌ |
| 9 | 論壇 | /api/forum | ✅ |
| 10 | 聊天 | /api/chat/channels | ✅ |
| 11 | 備忘錄 | /api/memos | ✅ |
| 12 | **日常工作** | /api/routines | ❌ |
| 13 | **排程** | /api/schedules | ❌ |
| 14 | 請假 | /api/leaves | ✅ |
| 15 | 工作日誌 | /api/work-logs | ✅ |
| 16 | **檔案** | /api/files | ❌ |
| 17 | **同步** | /api/sync | ❌ |
| 18 | **系統設定** | /api/system | ❌ |
| 19 | **備份** | /api/backup | ❌ |
| 20 | 公告 | /api/announcements | ✅ |
| 21 | AI 助手 | /api/ai-assistant | ✅ |
| 22 | **KOL** | /api/kol | ❌ |
| 23 | **平台營收** | /api/platform-revenue | ❌ |
| 24 | **平台帳戶** | /api/platform-accounts | ❌ |
| 25 | 版本 | /api/version | ❌ |
| 26-30 | central/*（4 檔）+ service-api | 依 instance mode 測 | ❌ |

> 26-30 只在 central 站有意義；subsidiary 站預期 404（見 2-2）。
> 任何模組回 5xx → 分類 A，記完整 response body。

### 2-4 員工刪除測試矩陣（本次重點，必全跑）

先建測試資料（命名一律 `qa_del_` 前綴，方便清理）：

| Case | 操作 | 預期 status | 預期訊息 |
|------|------|:---:|----------|
| D1 | BOSS 刪「全新、無任何關聯資料」的員工 | 200 | 用戶刪除成功 |
| D2 | BOSS 刪「有任務或打卡記錄」的員工 | 400 | 「…無法刪除。建議停用帳號而非刪除。」 |
| D3 | BOSS 刪自己 | 400 | 不能刪除自己的帳號 |
| D4 | MANAGER 刪 BOSS 或另一個 MANAGER | 403 | 無權刪除該用戶 |
| D5 | EMPLOYEE token 呼叫 DELETE /api/users/:id | 403 | 無權刪除用戶 |
| D6 | 刪不存在的 id | 404 | 用戶不存在 |

```bash
# D1 範例
curl -s -X DELETE $BASE/api/users/<id> -H "Authorization: Bearer $TOKEN" -w "\nHTTP %{http_code}\n"
```

**判定**：若 D1–D6 全部符合預期 → 後端沒壞，「員工無法刪除」= 分類 B（前端沒顯示理由），
去修前端；若 D1 也失敗 → 分類 A，記 response 進報告。

---

## 3. Layer 2 — 瀏覽器 E2E（拆段短提示詞，每段 ≤5 步）

規則（來自過往教訓）：提示詞精簡、**超過 5 步拆段**、瀏覽器圖片上限 100 張。
每段共通檢查：F12 Console 無紅字；列表上的 inline 縮圖 `naturalWidth > 0`（不是只點開預覽 modal）；
CRUD 之後**不按重新整理**畫面就要正確（類型 D）。

### Segment B（本次重點）— 人事管理
```
登入 canris → 人事管理：
1. 新增員工 qa_del_clean（不指派任何任務）
2. 刪除 qa_del_clean → 應成功、列表即時消失
3. 新增員工 qa_del_busy，指派一個任務給他
4. 刪除 qa_del_busy → 畫面「必須」出現可讀的錯誤訊息（建議停用帳號…）
   → 若按了沒反應 = 前端吞錯誤，記為分類 B 失敗
5. F12 Console 檢查有無紅字 / Unhandled rejection
```

### 其餘 Segment（每段獨立提示詞）
| 段 | 範圍 | 特別檢查 |
|----|------|---------|
| A | 登入/登出、儀表板 | 錯誤密碼要有明確提示 |
| C | 任務（建立→指派→完成）、公告 | 完成後不重整、統計即時更新（類型 D） |
| D | 請假、考勤（打卡+BOSS 編輯/刪除記錄）、績效 | 考勤編輯/刪除曾是 ghost method 重災區（類型 L） |
| E | 財務、報表、工作日誌 | 日誌卡片縮圖 naturalWidth > 0（類型 N） |
| F | 備忘錄、論壇/提案、聊天（含刪除聊天室） | 刪除聊天室曾是 ghost method |
| G | AI 助手（一問一答 + 一次 action） | action 不得重複執行歷史操作 |
| H | 檔案上傳/下載、系統設定、備份、KOL、平台營收/帳戶 | 冷門模組，從沒被測過（類型 E） |

### Playwright 自動化（現有套件補洞）
現有：`C:\tmp\e2e-taskflow\tests\` 01-auth / 02-dashboard / 03-tasks / 04-leaves-attendance /
05-announcements-ai / 06-security-flow / 07-ai-driven-page-analysis / 09-instance-config。
**缺人事管理** → 新增 `08-personnel-crud.spec.ts`，內容即 2-4 的 D1–D6 + Segment B。

---

## 4. Layer 3 — 人工點擊清單（自動化抓不到的類型 E/K）

部署後由 canris 實機點過（呼應 feedback_ui_smoke_check）：
- [ ] 頭像上傳（歷史上壞 4 個月沒人發現）
- [ ] 每一個 modal 的「取消」與「確認」（表單內按鈕誤觸 submit，類型 K）
- [ ] 匯出/下載類按鈕（報表、備份下載）
- [ ] 檔案上傳後，列表縮圖直接顯示（不是點開才看）
- [ ] 手機寬度跑一輪主要頁面

---

## 5. 回報格式

```
## 檢測結果 — [日期] [環境 local/alpha/...]

Layer 0：tsc 掃描 X 筆 / 吞錯 handler X 個 / 壞圖 X 處 / 缺 type 按鈕 X 個
Layer 1：30 模組 smoke 通過 X/30；員工刪除矩陣 D1–D6 通過 X/6

| # | 模組 | 結果 | 失敗分類(A/B/C) | 證據（status + 訊息） |
|---|------|------|:---:|------|

Layer 2：Segment A–H 通過 X/8（逐段列）
Layer 3：交 canris 清單，勾選回報
```

## 6. 測試資料清理

- 測試資料一律 `qa_del_` / `qa_test_` 前綴。
- 測完呼叫：`POST /api/ai-assistant/cleanup-test-data`（需 BOSS token）。
- 正式站測試需 canris 同意才建立寫入型測試資料；優先只跑讀取類 smoke。

---

## 附錄：第一號病人診斷紀錄 — 「員工無法刪除」

**症狀**：按刪除、確認後，畫面沒有任何反應，員工還在列表。

**病因鏈（已由程式碼確認，待 runtime 驗證）**：
1. 後端 `backend/dist/routes/users.js:288-292`：員工有任務或打卡記錄 → 回 400
   「…無法刪除。建議停用帳號而非刪除。」——**設計如此**（保護關聯資料）。
2. 前端 `services/api.ts:106-111`：非 2xx 會 throw（帶後端訊息）——正常。
3. 前端 `App.tsx:860-865` `handleDeleteUser`：**沒有 try/catch、沒有 showError**
   → 例外沒人接 → 訊息消失 → 使用者看到「按了沒反應」。
   對照同檔 `handleAddDepartment`（867-875 行）有正確的 catch + showError 寫法。

**分類**：B（後端設計如此）＋ C（前端吞錯誤）複合。
**修法方向**（待 canris 核可後動工）：handleDeleteUser 補 try/catch + showError；
UX 上可加「停用帳號」按鈕作為刪除被拒時的引導。
