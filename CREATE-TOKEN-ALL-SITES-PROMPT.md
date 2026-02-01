# 創建包含所有站點權限的 Netlify Token 提示詞

## 問題根源
當前部署失敗的真正原因是：Personal Access Token 創建時只選擇了特定站點，沒有包含 transcendent-basbousa-6df2d2 站點，導致 API 返回 404 Not Found。

## 解決方案
創建新的 Personal Access Token，並確保選擇 **All sites** 或明確包含目標站點。

## 詳細步驟

### 步驟 1：登入 Netlify
1. 前往 https://app.netlify.com
2. 使用 **SS Seven (canris03150315@gmail.com)** 帳號登入
3. 確認已登入正確帳號

### 步驟 2：前往 Applications 設置
1. 點擊右上角頭像 → User settings
2. 左側選單選擇 "Applications"
3. 找到 "Personal access tokens" 區塊

### 步驟 3：創建新的 Access Token
1. 點擊 "New access token" 按鈕

2. 填寫 Token 資訊：
   - **Token description**: `GitHub Actions Deploy - All Sites`
   - **Expiration**: 選擇 **Never expire**（永不過期）

3. ⚠️ **關鍵步驟** - 配置站點權限：
   - 找到 **Sites** 或 **Scopes** 選項
   - 選擇 **All sites**（所有站點）
   
   或者如果只能選擇特定站點：
   - 確保勾選 **transcendent-basbousa-6df2d2** 站點
   - 確保勾選所有需要訪問的站點

4. 點擊 "Generate token" 按鈕

### 步驟 4：複製新 Token
1. Token 會立即顯示（只顯示一次）
2. 立即複製整個 Token
3. 保存到安全的地方

### 步驟 5：（可選）刪除舊 Token
1. 找到即將過期的舊 Token "GitHub Actions Deploy"（2月8日過期）
2. 點擊刪除按鈕移除舊 Token
3. 避免混淆和安全風險

## 重要檢查清單
- ✅ 使用 SS Seven 帳號創建
- ✅ Token 過期時間選擇 **Never expire**
- ✅ **站點權限選擇 All sites**（最重要！）
- ✅ 立即複製 Token（只顯示一次）

## 完成後請告訴我
創建成功後，請回覆：

```
✅ 已創建新的 Personal Access Token
✅ 站點權限已設置為 All sites
新 Token: [您的新 Token]
```

我會立即更新 GitHub Secret 並重新觸發部署。

## 預期結果
使用正確配置的 Token 後，GitHub Actions 部署應該會成功：
- ✅ 編譯成功
- ✅ 部署到 Netlify 成功
- ✅ 平台營收功能上線
