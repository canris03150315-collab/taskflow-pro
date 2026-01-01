# 企業管理系統 技術文件

**版本**: 1.0.0  
**最後更新**: 2025-12-27  
**文件狀態**: 正式版

---

## 目錄

1. [系統概述](#1-系統概述)
2. [系統架構](#2-系統架構)
3. [技術規格](#3-技術規格)
4. [功能模組](#4-功能模組)
5. [API 文件](#5-api-文件)
6. [資料庫設計](#6-資料庫設計)
7. [安全機制](#7-安全機制)
8. [部署指南](#8-部署指南)
9. [維護指南](#9-維護指南)
10. [故障排除](#10-故障排除)

---

## 1. 系統概述

### 1.1 系統簡介

企業管理系統是一套專為中小企業設計的內部管理平台，整合任務管理、出勤打卡、即時通訊、報表管理等多項功能，協助企業提升營運效率。

### 1.2 主要特色

| 特色 | 說明 |
|------|------|
| 🔐 安全可靠 | 資安檢查 100 分，含暴力破解防護 |
| 📱 跨平台支援 | PWA 技術，支援手機、平板、電腦 |
| ⚡ 即時同步 | 資料即時更新，多人協作 |
| 🎨 現代化介面 | 簡潔直覺的操作體驗 |
| 🔧 易於維護 | 模組化設計，方便擴充 |

### 1.3 適用對象

- 中小企業（5-100人）
- 需要整合多項管理功能的團隊
- 重視資料安全的組織

---

## 2. 系統架構

### 2.1 整體架構圖

```
┌─────────────────────────────────────────────────────────────┐
│                        使用者端                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │ 桌面瀏覽器│  │ 手機瀏覽器│  │ PWA App │  │ 平板裝置 │        │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘        │
└───────┼────────────┼────────────┼────────────┼──────────────┘
        │            │            │            │
        └────────────┴─────┬──────┴────────────┘
                           │ HTTPS
┌──────────────────────────┼──────────────────────────────────┐
│                     Netlify CDN                              │
│                    (前端靜態檔案)                             │
│                          │                                   │
│   ┌──────────────────────┼──────────────────────────────┐   │
│   │              API Proxy (/api/*)                      │   │
│   └──────────────────────┼──────────────────────────────┘   │
└──────────────────────────┼──────────────────────────────────┘
                           │ HTTP
┌──────────────────────────┼──────────────────────────────────┐
│                  DigitalOcean Droplet                        │
│  ┌───────────────────────┼───────────────────────────────┐  │
│  │              Docker Container                          │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │              Node.js + Express                   │  │  │
│  │  │                                                  │  │  │
│  │  │  ┌─────────┐  ┌─────────┐  ┌─────────┐         │  │  │
│  │  │  │ Auth    │  │ Tasks   │  │ Chat    │  ...    │  │  │
│  │  │  │ Routes  │  │ Routes  │  │ Routes  │         │  │  │
│  │  │  └────┬────┘  └────┬────┘  └────┬────┘         │  │  │
│  │  │       └────────────┼────────────┘               │  │  │
│  │  │                    │                            │  │  │
│  │  │  ┌─────────────────┼─────────────────────────┐ │  │  │
│  │  │  │           SQLite Database                  │ │  │  │
│  │  │  │         (better-sqlite3 + AES)            │ │  │  │
│  │  │  └───────────────────────────────────────────┘ │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 技術棧

| 層級 | 技術 | 版本 |
|------|------|------|
| **前端框架** | React | 19.x |
| **前端建置** | Vite | 6.x |
| **CSS 框架** | Tailwind CSS | CDN |
| **後端框架** | Express.js | 4.x |
| **執行環境** | Node.js | 18+ |
| **資料庫** | SQLite (better-sqlite3) | 8.x |
| **容器化** | Docker | Latest |
| **前端託管** | Netlify | - |
| **後端託管** | DigitalOcean | Droplet |

---

## 3. 技術規格

### 3.1 系統需求

#### 伺服器端
| 項目 | 最低需求 | 建議配置 |
|------|----------|----------|
| CPU | 1 核心 | 2 核心 |
| 記憶體 | 1 GB | 2 GB |
| 儲存空間 | 10 GB | 25 GB |
| 作業系統 | Linux (Ubuntu 20.04+) | Ubuntu 22.04 LTS |
| Node.js | 18.x | 20.x LTS |

#### 用戶端
| 項目 | 需求 |
|------|------|
| 瀏覽器 | Chrome 87+, Firefox 78+, Safari 14+, Edge 88+ |
| 網路 | 穩定的網際網路連線 |
| 螢幕 | 最小 320px 寬度（RWD 支援） |

### 3.2 效能指標

| 指標 | 目標值 |
|------|--------|
| 首頁載入時間 | < 3 秒 |
| API 回應時間 | < 500ms |
| 同時在線用戶 | 100+ |
| 資料庫查詢 | < 100ms |

---

## 4. 功能模組

### 4.1 模組總覽

```
企業管理系統
├── 👤 使用者管理
│   ├── 登入/登出
│   ├── 角色權限 (BOSS/MANAGER/SUPERVISOR/EMPLOYEE)
│   ├── 個人資料編輯
│   └── 頭像上傳
│
├── 🏢 部門管理
│   ├── 部門建立/編輯/刪除
│   ├── 部門主題色
│   └── 部門成員管理
│
├── 📋 任務管理
│   ├── 任務建立/編輯/刪除
│   ├── 任務指派
│   ├── 狀態追蹤 (待處理/進行中/已完成)
│   ├── 優先度設定
│   └── 時間軸檢視
│
├── ✅ 每日任務
│   ├── 每日任務模板
│   ├── 任務項目勾選
│   └── 完成追蹤
│
├── 📢 公告系統
│   ├── 公告發布
│   ├── 公告編輯/刪除
│   └── 已讀追蹤
│
├── 📊 報表系統
│   ├── 報表建立
│   ├── 報表審核
│   └── 報表匯出
│
├── 💰 財務管理
│   ├── 收入記錄
│   ├── 支出記錄
│   └── 財務報表
│
├── ⏰ 出勤管理
│   ├── 上班打卡
│   ├── 下班打卡
│   ├── GPS 定位
│   └── 出勤記錄查詢
│
├── 💬 即時通訊
│   ├── 群組聊天
│   ├── 私人訊息
│   ├── 已讀回執
│   └── 訊息通知
│
├── 📄 SOP 文件管理
│   ├── 文件建立/編輯
│   ├── 閱讀確認
│   └── 版本管理
│
└── ⚙️ 系統設定
    ├── 系統重置
    ├── 資料備份/還原
    └── 系統日誌
```

### 4.2 各模組詳細說明

#### 4.2.1 使用者管理

**功能描述**: 管理系統使用者，包含帳號建立、權限設定、個人資料維護。

**角色權限**:
| 角色 | 代碼 | 權限範圍 |
|------|------|----------|
| 老闆 | BOSS | 全系統存取權 |
| 經理 | MANAGER | 部門管理、任務指派、報表審核 |
| 主管 | SUPERVISOR | 組員管理、任務追蹤 |
| 員工 | EMPLOYEE | 個人任務、打卡、聊天 |

**資料欄位**:
```typescript
interface User {
  id: string;           // 唯一識別碼
  name: string;         // 顯示名稱
  username: string;     // 登入帳號
  password: string;     // 密碼 (bcrypt 加密)
  role: Role;           // 角色
  department: string;   // 部門 ID
  avatar: string;       // 頭像 (Base64)
  permissions?: object; // 特殊權限
  created_at: string;   // 建立時間
  updated_at: string;   // 更新時間
}
```

#### 4.2.2 任務管理

**功能描述**: 建立、指派、追蹤任務，支援多種狀態和優先度。

**任務狀態流程**:
```
待處理 (PENDING) → 進行中 (IN_PROGRESS) → 已完成 (COMPLETED)
                         ↓
                    已封存 (ARCHIVED)
```

**資料欄位**:
```typescript
interface Task {
  id: string;
  title: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignee_id: string;
  creator_id: string;
  department_id: string;
  due_date: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
}
```

#### 4.2.3 即時通訊

**功能描述**: 支援群組聊天和私人訊息，具備已讀回執功能。

**訊息類型**:
- 文字訊息
- 系統通知

**資料欄位**:
```typescript
interface ChatMessage {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  type: 'text' | 'system';
  read_by: string[];    // 已讀用戶 ID 列表
  created_at: string;
}
```

---

## 5. API 文件

### 5.1 API 概述

- **基礎 URL**: `https://your-domain.com/api`
- **認證方式**: Bearer Token (JWT)
- **回應格式**: JSON

### 5.2 認證 API

#### POST /api/auth/login
登入系統取得 Token。

**請求**:
```json
{
  "username": "string",
  "password": "string"
}
```

**成功回應** (200):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "admin-123",
    "name": "管理員",
    "role": "BOSS",
    "department": "Management",
    "avatar": "base64...",
    "username": "admin"
  }
}
```

**錯誤回應** (401):
```json
{
  "error": "帳號或密碼錯誤"
}
```

**速率限制** (429):
```json
{
  "error": "登入嘗試次數過多，請等待 30 分鐘後再試"
}
```

#### GET /api/auth/setup/check
檢查系統是否需要初始設定。

**回應**:
```json
{
  "needsSetup": true
}
```

#### POST /api/auth/setup
初始設定（建立第一個管理員）。

**請求**:
```json
{
  "name": "管理員名稱",
  "username": "admin",
  "password": "password123",
  "avatar": "base64..."
}
```

### 5.3 使用者 API

#### GET /api/users
取得所有使用者列表。

**Headers**: `Authorization: Bearer <token>`

**回應**:
```json
[
  {
    "id": "user-123",
    "name": "王小明",
    "role": "EMPLOYEE",
    "department": "dept-456",
    "avatar": "base64...",
    "username": "xiaoming"
  }
]
```

#### POST /api/users
建立新使用者。

**Headers**: `Authorization: Bearer <token>`

**請求**:
```json
{
  "name": "新員工",
  "username": "newuser",
  "password": "password123",
  "role": "EMPLOYEE",
  "department": "dept-123",
  "avatar": "base64..."
}
```

#### PUT /api/users/:id
更新使用者資料。

#### DELETE /api/users/:id
刪除使用者。

### 5.4 部門 API

#### GET /api/departments
取得所有部門。

#### POST /api/departments
建立新部門。

#### PUT /api/departments/:id
更新部門。

#### DELETE /api/departments/:id
刪除部門。

### 5.5 任務 API

#### GET /api/tasks
取得任務列表。

**Query Parameters**:
- `is_archived`: boolean - 是否封存

#### POST /api/tasks
建立新任務。

#### PUT /api/tasks/:id
更新任務。

#### DELETE /api/tasks/:id
刪除任務。

### 5.6 公告 API

#### GET /api/announcements
取得公告列表。

#### POST /api/announcements
發布新公告。

#### PUT /api/announcements/:id
更新公告。

#### DELETE /api/announcements/:id
刪除公告。

### 5.7 聊天 API

#### GET /api/chat/channels
取得聊天頻道列表。

#### POST /api/chat/channels
建立新頻道。

#### GET /api/chat/channels/:id/messages
取得頻道訊息。

#### POST /api/chat/channels/:id/messages
發送訊息。

### 5.8 出勤 API

#### GET /api/attendance
取得出勤記錄。

#### POST /api/attendance/clock-in
上班打卡。

#### POST /api/attendance/clock-out
下班打卡。

### 5.9 每日任務 API

#### GET /api/routines/templates
取得每日任務模板。

#### POST /api/routines/templates
建立/更新模板。

#### GET /api/routines/today
取得今日任務。

#### POST /api/routines/records/:id/toggle
切換任務完成狀態。

### 5.10 系統 API

#### GET /api/health
健康檢查。

**回應**:
```json
{
  "status": "ok",
  "timestamp": "2025-12-27T12:00:00.000Z"
}
```

#### GET /api/version
取得系統版本。

**回應**:
```json
{
  "version": "1.0.0",
  "build": "2025-12-27"
}
```

---

## 6. 資料庫設計

### 6.1 資料庫概述

- **資料庫類型**: SQLite
- **ORM**: better-sqlite3 (同步)
- **加密**: AES-256-GCM (敏感欄位)

### 6.2 ER 圖

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    users     │     │  departments │     │    tasks     │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id (PK)      │────<│ id (PK)      │>────│ id (PK)      │
│ name         │     │ name         │     │ title        │
│ username     │     │ theme        │     │ description  │
│ password     │     │ icon         │     │ status       │
│ role         │     └──────────────┘     │ priority     │
│ department   │>─────────────────────────│ assignee_id  │
│ avatar       │                          │ creator_id   │
│ created_at   │                          │ department_id│
└──────────────┘                          │ due_date     │
       │                                  └──────────────┘
       │
       │     ┌──────────────┐     ┌──────────────┐
       │     │chat_channels │     │chat_messages │
       │     ├──────────────┤     ├──────────────┤
       └────<│ id (PK)      │>────│ id (PK)      │
             │ name         │     │ channel_id   │
             │ type         │     │ sender_id    │
             │ members      │     │ content      │
             │ created_at   │     │ read_by      │
             └──────────────┘     │ created_at   │
                                  └──────────────┘
```

### 6.3 資料表定義

#### users
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('BOSS', 'MANAGER', 'SUPERVISOR', 'EMPLOYEE')),
  department TEXT NOT NULL,
  avatar TEXT,
  permissions TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### departments
```sql
CREATE TABLE departments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  theme TEXT NOT NULL,
  icon TEXT NOT NULL
);
```

#### tasks
```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'PENDING',
  priority TEXT DEFAULT 'MEDIUM',
  assignee_id TEXT,
  creator_id TEXT,
  department_id TEXT,
  due_date TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_archived INTEGER DEFAULT 0
);
```

#### routine_templates
```sql
CREATE TABLE routine_templates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  frequency TEXT DEFAULT 'daily',
  department_id TEXT,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  items TEXT DEFAULT '[]',
  read_by TEXT DEFAULT '[]',
  last_updated TEXT,
  is_daily INTEGER DEFAULT 0
);
```

#### chat_channels
```sql
CREATE TABLE chat_channels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'group',
  members TEXT DEFAULT '[]',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### chat_messages
```sql
CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text',
  read_by TEXT DEFAULT '[]',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### attendance_records
```sql
CREATE TABLE attendance_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  clock_in TEXT,
  clock_out TEXT,
  clock_in_location TEXT,
  clock_out_location TEXT,
  status TEXT DEFAULT 'present'
);
```

#### system_logs
```sql
CREATE TABLE system_logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  user_id TEXT,
  user_name TEXT,
  action TEXT NOT NULL,
  details TEXT,
  level TEXT DEFAULT 'INFO'
);
```

---

## 7. 安全機制

### 7.1 安全檢查結果

| 項目 | 狀態 | 說明 |
|------|------|------|
| 認證安全 | ✅ 通過 | JWT Token 認證 |
| SQL 注入防護 | ✅ 通過 | 參數化查詢 |
| XSS 防護 | ✅ 通過 | 輸出編碼 |
| 暴力破解防護 | ✅ 通過 | 登入速率限制 |
| 安全標頭 | ✅ 通過 | Helmet.js |
| 密碼加密 | ✅ 通過 | bcrypt |
| **安全分數** | **100/100** | |

### 7.2 認證機制

#### JWT Token
- 演算法: HS256
- 有效期: 24 小時
- 包含資訊: 用戶 ID、帳號、角色、部門

```javascript
{
  "id": "user-123",
  "username": "admin",
  "role": "BOSS",
  "department": "Management",
  "iat": 1703664000,
  "exp": 1703750400
}
```

### 7.3 密碼安全

- 雜湊演算法: bcrypt
- Salt Rounds: 10
- 不可逆加密

### 7.4 登入速率限制

| 設定 | 值 |
|------|-----|
| 最大嘗試次數 | 5 次 |
| 時間視窗 | 15 分鐘 |
| 封鎖時間 | 30 分鐘 |

### 7.5 安全標頭

```javascript
// Helmet.js 設定
helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
})
```

啟用的標頭:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `X-XSS-Protection: 1; mode=block`

---

## 8. 部署指南

### 8.1 部署架構

```
┌─────────────────┐     ┌─────────────────┐
│     Netlify     │     │  DigitalOcean   │
│   (前端 CDN)    │────>│   (後端 API)    │
│                 │     │                 │
│  - React App    │     │  - Docker       │
│  - 靜態檔案     │     │  - Node.js      │
│  - API Proxy    │     │  - SQLite       │
└─────────────────┘     └─────────────────┘
```

### 8.2 前端部署 (Netlify)

#### 步驟 1: 建置
```bash
npm run build
```

#### 步驟 2: 部署
```bash
netlify deploy --prod --dir=dist --no-build
```

#### netlify.toml 設定
```toml
[build]
  publish = "dist"

[[redirects]]
  from = "/api/*"
  to = "http://YOUR_SERVER_IP:3000/api/:splat"
  status = 200
  force = true

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 8.3 後端部署 (Docker)

#### Dockerfile
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
COPY data ./data
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

#### 啟動容器
```bash
docker run -d \
  --name taskflow-pro \
  -p 3000:3000 \
  -v /opt/taskflow-pro/data:/app/data \
  taskflow-pro:latest
```

### 8.4 環境變數

| 變數 | 說明 | 預設值 |
|------|------|--------|
| `PORT` | 伺服器埠號 | 3000 |
| `JWT_SECRET` | JWT 密鑰 | (需設定) |
| `NODE_ENV` | 執行環境 | production |

---

## 9. 維護指南

### 9.1 日常維護

#### 查看日誌
```bash
docker logs taskflow-pro --tail 100
```

#### 重啟服務
```bash
docker restart taskflow-pro
```

#### 檢查健康狀態
```bash
curl http://localhost:3000/api/health
```

### 9.2 備份與還原

#### 備份資料庫
```bash
docker cp taskflow-pro:/app/data/taskflow.db ./backup/taskflow-$(date +%Y%m%d).db
```

#### 還原資料庫
```bash
docker cp ./backup/taskflow.db taskflow-pro:/app/data/taskflow.db
docker restart taskflow-pro
```

### 9.3 效能監控

#### 檢查資源使用
```bash
docker stats taskflow-pro
```

#### 檢查磁碟空間
```bash
df -h /opt/taskflow-pro/data
```

### 9.4 更新部署

#### 更新前端
```bash
npm run build
netlify deploy --prod --dir=dist --no-build
```

#### 更新後端 (修改編譯後 JS)
```bash
# 建立修復腳本
vi fix.sh

# 上傳並執行
scp fix.sh root@SERVER:/tmp/
ssh root@SERVER "bash /tmp/fix.sh"
```

---

## 10. 故障排除

### 10.1 常見問題

#### Q1: 登入失敗，顯示「帳號或密碼錯誤」
**可能原因**:
- 帳號或密碼輸入錯誤
- 帳號被速率限制封鎖

**解決方法**:
1. 確認帳號密碼正確
2. 如被封鎖，等待 30 分鐘後再試

#### Q2: API 回傳 401 Unauthorized
**可能原因**:
- Token 過期
- Token 無效

**解決方法**:
1. 重新登入取得新 Token
2. 檢查 Authorization header 格式

#### Q3: 頁面載入緩慢
**可能原因**:
- 網路連線問題
- 伺服器負載過高

**解決方法**:
1. 檢查網路連線
2. 檢查伺服器資源使用率
3. 考慮增加伺服器配置

#### Q4: 聊天訊息未即時更新
**可能原因**:
- Polling 間隔設定

**解決方法**:
- 重新整理頁面
- 檢查網路連線

### 10.2 錯誤代碼

| 代碼 | 說明 | 處理方式 |
|------|------|----------|
| 400 | 請求格式錯誤 | 檢查請求參數 |
| 401 | 未授權 | 重新登入 |
| 403 | 權限不足 | 聯繫管理員 |
| 404 | 資源不存在 | 檢查 URL |
| 429 | 請求過於頻繁 | 等待後重試 |
| 500 | 伺服器錯誤 | 查看伺服器日誌 |

### 10.3 日誌分析

#### 查看錯誤日誌
```bash
docker logs taskflow-pro 2>&1 | grep -i error
```

#### 查看登入相關日誌
```bash
docker logs taskflow-pro 2>&1 | grep -i "登入\|login"
```

---

## 附錄

### A. 快速指令參考

```bash
# 查看容器狀態
docker ps

# 查看日誌
docker logs taskflow-pro --tail 50

# 重啟容器
docker restart taskflow-pro

# 進入容器
docker exec -it taskflow-pro sh

# 備份資料庫
docker cp taskflow-pro:/app/data/taskflow.db ./backup.db

# 部署前端
netlify deploy --prod --dir=dist --no-build

# 執行 API 測試
node tests/run-api-tests.js

# 執行資安檢查
node tests/security-audit.cjs
```

### B. 聯絡資訊

如有技術問題，請聯繫系統管理員。

---

**文件結束**

*此文件由企業管理系統開發團隊維護*
*最後更新: 2025-12-27*
