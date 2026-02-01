# 設置 GitHub Secrets 並觸發部署的提示詞

請幫我完成以下步驟來設置 GitHub Secrets 並觸發自動部署：

## 任務目標
在 GitHub 倉庫中設置兩個 Secrets，然後觸發 GitHub Actions 自動編譯和部署。

## 倉庫資訊
- GitHub 倉庫：https://github.com/canris03150315-collab/taskflow-pro
- Secrets 設置頁面：https://github.com/canris03150315-collab/taskflow-pro/settings/secrets/actions

## 步驟 1：設置第一個 Secret (NETLIFY_AUTH_TOKEN)

1. 前往 Secrets 設置頁面：
   https://github.com/canris03150315-collab/taskflow-pro/settings/secrets/actions

2. 點擊綠色按鈕 "New repository secret"

3. 填寫以下資訊：
   - Name: `NETLIFY_AUTH_TOKEN`
   - Secret: `nfp_7B6P1ZgjGPU4E9kEQY2umffBxBQqaXxRed53`

4. 點擊 "Add secret" 按鈕

## 步驟 2：設置第二個 Secret (NETLIFY_SITE_ID)

1. 再次點擊 "New repository secret"

2. 填寫以下資訊：
   - Name: `NETLIFY_SITE_ID`
   - Secret: `5bb6a0c9-3186-4d11-b9be-07bdce7bf186`

3. 點擊 "Add secret" 按鈕

## 步驟 3：確認 Secrets 已設置

在 Secrets 頁面應該看到兩個 Secret：
- ✅ NETLIFY_AUTH_TOKEN
- ✅ NETLIFY_SITE_ID

## 步驟 4：觸發自動部署

1. 前往 Actions 頁面：
   https://github.com/canris03150315-collab/taskflow-pro/actions

2. 在左側選單點擊 "Build and Deploy to Netlify"

3. 點擊右側的 "Run workflow" 按鈕（綠色按鈕）

4. 在彈出的下拉選單中，再次點擊綠色的 "Run workflow" 按鈕

## 步驟 5：監控部署進度

1. 部署開始後，會在 Actions 頁面看到一個新的工作流執行

2. 點擊進入可以查看詳細的編譯和部署日誌

3. 等待約 5-10 分鐘完成編譯和部署

4. 成功標誌：
   - ✅ 綠色勾勾 = 部署成功
   - 🔴 紅色叉叉 = 部署失敗（請告訴我錯誤訊息）

## 完成後請告訴我

部署完成後，請告訴我：
1. 部署是否成功（綠色勾勾或紅色叉叉）
2. 如果失敗，請提供錯誤日誌的截圖或文字

## 預期結果

部署成功後：
- ✅ 平台營收功能將在前端正常顯示
- ✅ 可以在 https://transcendent-basbousa-6df2d2.netlify.app 訪問
- ✅ 未來每次推送代碼都會自動編譯和部署
