# 更新 GitHub Secret 並重新部署的提示詞

## 任務目標
更新 GitHub Repository 中的 NETLIFY_AUTH_TOKEN Secret 為新的 Token，然後重新觸發部署。

## 新 Token 資訊
- Token Name: GitHub Actions Deploy - All Sites
- Token Value: `nfp_aNaFU9SgN37WHMnRLffCyD3ZE8CBMYg7H3e`
- Expiration: Never
- Access: All sites (包含 transcendent-basbousa-6df2d2)

## 詳細步驟

### 步驟 1：前往 GitHub Secrets 設置頁面
1. 直接打開以下連結：
   https://github.com/canris03150315-collab/taskflow-pro/settings/secrets/actions

### 步驟 2：更新 NETLIFY_AUTH_TOKEN
1. 在 Repository secrets 列表中找到 `NETLIFY_AUTH_TOKEN`
2. 點擊右側的 **Update** 按鈕（鉛筆圖標）
3. 在 **Value** 欄位中：
   - 清除舊的 Token 值
   - 貼上新的 Token：`nfp_aNaFU9SgN37WHMnRLffCyD3ZE8CBMYg7H3e`
4. 點擊 **Update secret** 按鈕保存

### 步驟 3：確認更新成功
1. 返回 Secrets 列表頁面
2. 確認 `NETLIFY_AUTH_TOKEN` 顯示 "Updated X seconds ago"
3. 確認 `NETLIFY_SITE_ID` 仍然存在（值為 `5bb6a0c9-3186-4d11-b9be-07bdce7bf186`）

### 步驟 4：重新觸發 GitHub Actions 部署
1. 前往 Actions 頁面：
   https://github.com/canris03150315-collab/taskflow-pro/actions

2. 在左側選單點擊 **"Build and Deploy to Netlify"** 工作流

3. 點擊右側的 **"Run workflow"** 按鈕（綠色下拉按鈕）

4. 在彈出的下拉選單中，確認分支為 **master**

5. 再次點擊綠色的 **"Run workflow"** 按鈕

### 步驟 5：監控部署進度
1. 部署開始後，會在 Actions 頁面看到新的工作流執行
2. 點擊進入查看詳細日誌
3. 觀察各個步驟的執行狀態：
   - ✅ Set up job
   - ✅ Checkout code
   - ✅ Setup Node.js
   - ✅ Install dependencies
   - ✅ Build project
   - ✅ **Deploy to Netlify**（這次應該會成功！）

4. 等待約 5-10 分鐘完成

### 步驟 6：確認部署成功
部署成功的標誌：
- ✅ 所有步驟都顯示綠色勾勾
- ✅ "Deploy to Netlify" 步驟成功完成
- ✅ 工作流狀態顯示綠色勾勾

## 預期結果

### 成功情況
如果看到：
```
✅ Deploy to Netlify - Success
✅ Deploy URL: https://transcendent-basbousa-6df2d2.netlify.app
```

這表示部署成功！平台營收功能已上線。

### 失敗情況
如果仍然失敗，請複製錯誤訊息告訴我，我會協助診斷。

## 完成後請告訴我
部署完成後，請回覆：

**成功情況**：
```
✅ GitHub Secret 已更新
✅ 部署成功完成
✅ 所有步驟都是綠色勾勾
```

**失敗情況**：
```
❌ 部署失敗
錯誤訊息：[貼上錯誤日誌]
```

## 驗證功能
部署成功後，可以訪問：
- 前端網址：https://transcendent-basbousa-6df2d2.netlify.app
- 登入後應該可以看到「平台營收」功能
