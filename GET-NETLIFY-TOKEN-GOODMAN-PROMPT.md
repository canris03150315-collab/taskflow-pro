# 使用 GoodMan 帳號獲取 Netlify Token 的提示詞

## 問題說明
當前部署失敗，因為使用的 Token 來自 "SS Seven" 帳號，但 Netlify 站點的 Owner 是 "GoodMan"。需要使用 GoodMan 帳號創建新的 Token。

## 任務目標
使用 **GoodMan** 帳號登入 Netlify 並創建 Personal Access Token。

## 詳細步驟

### 步驟 1：登出當前帳號（如果已登入）
1. 前往 https://app.netlify.com
2. 如果已登入 SS Seven 帳號，請先登出
3. 點擊右上角頭像 → Log out

### 步驟 2：使用 GoodMan 帳號登入
1. 在 Netlify 登入頁面
2. 使用 **GoodMan** 帳號的憑證登入
3. 確認登入後右上角顯示的是 GoodMan 帳號

### 步驟 3：確認站點所有權
1. 前往 Sites 頁面
2. 確認可以看到 "transcendent-basbousa-6df2d2" 站點
3. 確認站點的 Owner 顯示為當前登入的帳號

### 步驟 4：創建 Personal Access Token
1. 點擊右上角頭像 → User settings
2. 左側選單選擇 "Applications"
3. 找到 "Personal access tokens" 區塊
4. 點擊 "New access token"
5. 填寫資訊：
   - Description: `GitHub Actions Deploy - GoodMan`
   - Expiration: 選擇 **Never expire**（永不過期）
6. 點擊 "Generate token"

### 步驟 5：複製並保存 Token
1. Token 會顯示在螢幕上（只會顯示一次）
2. 立即複製整個 Token
3. 保存到安全的地方

## 重要提醒
- ⚠️ 必須使用 **GoodMan** 帳號，不是 SS Seven 帳號
- ⚠️ Token 過期時間選擇 **Never expire**，避免未來再次失效
- ⚠️ Token 只會顯示一次，請務必立即複製

## 完成後
請將新的 Token 告訴我，格式如下：
```
NETLIFY_AUTH_TOKEN (GoodMan): [新的 Token]
```

我會幫您更新 GitHub Secret 並重新觸發部署。
