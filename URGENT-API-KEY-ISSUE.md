# API Key 診斷報告

## 問題現象
- ✅ AI Studio 網頁可以正常使用
- ❌ API Key 從任何地方調用都失敗（本地 Windows、DigitalOcean 伺服器）
- ❌ 錯誤：`API_KEY_INVALID`

## 可能原因

### 最可能的原因：API Key 未正確創建或啟用

1. **API Key 可能是為錯誤的專案創建的**
2. **API Key 創建後需要額外步驟才能啟用**
3. **Gemini API 需要使用 OAuth 而不是 API Key**

## 驗證步驟

請在 AI Studio 中執行以下操作：

### 步驟 1：獲取實際可用的 API 調用範例
1. 訪問：https://aistudio.google.com/app/prompts/new_chat
2. 輸入任何文字（如「Hello」）
3. 等待回應
4. 點擊右上角的「< > 取得程式碼」或「Get code」按鈕
5. 查看生成的程式碼中的 API Key 部分
6. **截圖或複製完整的 curl 命令**

### 步驟 2：檢查 API Key 設置
1. 訪問：https://console.cloud.google.com/apis/credentials?project=573459402239
2. 點擊新創建的 API Key（`AIzaSyC13j...`）
3. 檢查：
   - 「應用程式限制」是否為「無」
   - 「API 限制」中是否包含「Generative Language API」
   - 是否有任何警告或錯誤訊息
4. 點擊「Show key」完整顯示 Key，確認和我們使用的一致

### 步驟 3：使用 Google 提供的測試命令
1. 在 API Key 詳情頁面
2. 點擊「Copy cURL quickstart」按鈕
3. 將命令提供給我測試

## 替代方案

如果 API Key 始終無效，我們可以：
1. **暫時關閉 AI 助理功能** - 最簡單
2. **使用 OAuth 認證** - 更複雜但可能是 Gemini 的要求
3. **使用其他 AI 服務**（OpenAI、Claude）
