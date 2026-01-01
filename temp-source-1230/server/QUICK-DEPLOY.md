# TaskFlow Pro 快速部署指南

## 🚀 10 分鐘雲端部署（跳過本地測試）

### 步驟 1：上傳代碼到 GitHub
```bash
# 在本地執行
cd "C:\Users\USER\Downloads\公司內部"
git init
git add .
git commit -m "TaskFlow Pro 系統完成"
git remote add origin https://github.com/yourusername/taskflow-pro.git
git push origin main
```

### 步驟 2：部署到 DigitalOcean
```bash
# 1. 註冊 DigitalOcean 帳號
# 2. 創建 Droplet (Ubuntu 22.04, $5/月)
# 3. SSH 連接到 Droplet

# 4. 在 Droplet 中執行
apt update
apt install nodejs npm git -y
git clone https://github.com/yourusername/taskflow-pro.git
cd taskflow-pro/server
npm install
npm run build
npm start

# 5. 系統將在 http://your-droplet-ip:3000 運行
```

### 步驟 3：配置 PM2（可選但推薦）
```bash
# 安裝 PM2
npm install -g pm2

# 啟動系統
pm2 start dist/server.js --name taskflow-pro

# 設置開機自啟
pm2 startup
pm2 save
```

---

## 🎯 推薦方案

### **立即測試**：選擇 GitHub Codespaces
- ✅ 5 分鐘內看到系統運行
- ✅ 完整 Linux 環境
- ✅ 無需本地配置
- ✅ 支援直接編輯和測試

### **生產部署**：選擇 DigitalOcean
- ✅ 10 分鐘完成部署
- ✅ 月費 $5 USD
- ✅ 完全控制
- ✅ 可立即對外服務

---

## 📞 技術支援

如果遇到問題：
1. **GitHub Codespaces**：確保代碼成功上傳到 GitHub
2. **DigitalOcean**：檢查防火牆設置（開放 3000 端口）
3. **一般問題**：提供錯誤日誌，我會立即協助解決
