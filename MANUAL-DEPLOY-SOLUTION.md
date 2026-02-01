# 臨時解決方案：手動部署編譯後的文件

## 方案說明
如果無法解決 Token 權限問題，可以暫時使用本地編譯 + 手動部署的方式。

## 步驟

### 1. 從 GitHub Actions 下載編譯後的文件

GitHub Actions 已經成功編譯了項目（Build project ✅），我們可以利用這個結果：

1. 前往 GitHub Actions 頁面：
   https://github.com/canris03150315-collab/taskflow-pro/actions

2. 點擊最近失敗的工作流執行

3. 在工作流詳情頁面，查看是否有 Artifacts（編譯產物）可以下載

### 2. 或者在本地重新編譯（使用 GitHub Actions 的配置）

在本地執行以下命令：

```powershell
cd "C:\Users\USER\Downloads\公司內部"

# 清除舊的 dist
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue

# 設置記憶體限制（與 GitHub Actions 相同）
$env:NODE_OPTIONS = "--max_old_space_size=4096"

# 編譯
npm run build
```

### 3. 使用 Netlify CLI 手動部署

```powershell
# 安裝 Netlify CLI（如果還沒安裝）
npm install -g netlify-cli

# 登入 Netlify（使用有權限的帳號）
netlify login

# 部署到生產環境
netlify deploy --prod --dir=dist --site=5bb6a0c9-3186-4d11-b9be-07bdce7bf186
```

### 4. 或使用 Netlify 網頁手動上傳

1. 登入 Netlify
2. 前往站點：https://app.netlify.com/sites/transcendent-basbousa-6df2d2
3. 點擊 "Deploys" 標籤
4. 將 `dist` 文件夾拖放到頁面上的上傳區域

## 優點
- ✅ 繞過 Token 權限問題
- ✅ 可以立即部署
- ✅ 驗證編譯是否成功

## 缺點
- ❌ 需要手動操作
- ❌ 無法自動化
- ❌ 未來每次更新都需要手動部署

## 建議
這只是臨時方案，建議還是解決 Token 權限問題以實現自動化部署。
