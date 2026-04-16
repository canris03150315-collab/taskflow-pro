# TaskFlow Pro - Backend Transfer Package

此資料夾包含完整的 TaskFlow Pro 後端程式碼和資料。

## 📁 資料夾結構

`
TaskFlow-Backend-Transfer/
├── dist/                 # 編譯後的 JavaScript 程式碼
│   ├── server.js        # 主入口
│   ├── routes/          # API 路由
│   ├── middleware/      # 中間件（包含 auth.js）
│   ├── database-v2.js   # 資料庫連接
│   └── types/           # 型別定義
├── data/
│   └── taskflow.db      # SQLite 資料庫（3.2MB）
├── src/                 # TypeScript 原始碼（如果有）
├── scripts/             # 工具腳本
├── .env                 # 環境變數設定
├── package.json         # 專案依賴
├── package-lock.json    # 鎖定版本
└── tsconfig.json        # TypeScript 設定

`

## 🔑 重要環境變數

已包含在 .env 檔案中：
- GEMINI_API_KEY: AIzaSyC6pLVQnosilci4Oe-Yl0yLhLxrRFOPRLLk
- PORT: 3000
- NODE_ENV: production

## 🚀 如何使用

### 1. 安裝依賴
`ash
npm install
`

### 2. 啟動伺服器
`ash
npm start
# 或
node dist/server.js
`

### 3. 開發模式（如果有 TypeScript 原始碼）
`ash
npm run dev
`

## 📊 資料庫資訊

- **檔案**: data/taskflow.db
- **大小**: 3.2MB
- **類型**: SQLite 3
- **包含**: 35 個資料表，包括用戶、部門、任務、財務等完整資料

## 🔧 主要檔案說明

- **dist/server.js**: 主伺服器入口
- **dist/routes/ai-assistant.js**: AI 助手路由
- **dist/middleware/auth.js**: JWT 認證中間件
- **dist/database-v2.js**: 資料庫連接和操作

## ⚠️ 注意事項

1. .env 檔案包含敏感資訊，請勿公開
2. 資料庫檔案包含真實數據，請妥善保管
3. 如需部署到新環境，請更新 .env 中的設定

## 📝 匯出資訊

- **匯出時間**: 2026-03-12
- **來源容器**: taskflow-pro
- **Docker 映像**: taskflow-pro:v8.9.211
- **後端版本**: v8.9.218

