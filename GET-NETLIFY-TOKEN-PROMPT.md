# 獲取 Netlify Personal Access Token 的提示詞

請幫我執行以下步驟來獲取 Netlify Personal Access Token：

## 任務目標
我需要獲取 Netlify Personal Access Token，用於 GitHub Actions 自動部署。

## 詳細步驟

### 步驟 1：登入 Netlify
1. 前往 https://app.netlify.com
2. 使用我的帳號登入

### 步驟 2：進入 User Settings
1. 點擊右上角的頭像或用戶名
2. 在下拉選單中選擇 "User settings"

### 步驟 3：找到 Applications 頁面
1. 在左側選單中找到並點擊 "Applications"
2. 滾動到 "Personal access tokens" 區塊

### 步驟 4：創建新的 Access Token
1. 點擊 "New access token" 按鈕
2. 在 "Token description" 欄位輸入：`GitHub Actions Deploy`
3. 點擊 "Generate token" 按鈕

### 步驟 5：複製 Token
1. Token 會顯示在螢幕上（只會顯示一次）
2. 點擊複製按鈕或手動選擇並複製整個 Token
3. 將 Token 保存到安全的地方

## 重要提醒
- ⚠️ Token 只會顯示一次，請務必立即複製
- ⚠️ 不要關閉頁面直到確認已複製 Token
- ⚠️ Token 是敏感資訊，請妥善保管

## 完成後
請將獲取到的 Token 告訴我，格式如下：
```
NETLIFY_AUTH_TOKEN: [您的 Token]
```

我會使用這個 Token 來設置 GitHub Actions 自動部署。
