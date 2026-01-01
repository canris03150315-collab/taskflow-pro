# GitHub Codespace 修復指南

## 🔧 依賴問題修復

### 問題確認
- better-sqlite3 在 Node.js v24 需要編譯工具
- 缺少 Python3, make, g++ 編譯環境
- 廢棄依賴警告不影響功能

### 修復命令序列

#### 1. 安裝編譯工具
```bash
sudo apt-get update
sudo apt-get install -y python3 make g++ build-essential
```

#### 2. 清理並重新安裝
```bash
cd server
rm -rf node_modules package-lock.json
npm install --verbose
```

#### 3. 如果仍然失敗，降級 better-sqlite3
```bash
npm install better-sqlite3@^9.2.2 --save
```

#### 4. 建置和測試
```bash
npm run build
npm start
```

### 預期結果
- ✅ npm install 成功完成
- ✅ npm run build 成功建置
- ✅ npm start 啟動服務器
- ✅ 系統在 http://localhost:3000 運行

### 故障排除
如果仍然失敗：
1. 檢查 Node.js 版本：`node --version`
2. 檢查 npm 版本：`npm --version`
3. 查看詳細錯誤：`npm install --verbose`
