# TaskFlow Pro - DigitalOcean 瑞士部署指南

## 🇨🇭 為什麼選擇瑞士/歐洲數據中心？

### 安全性和隱私優勢
- ✅ **瑞士聯邦數據保護法**（世界最嚴格）
- ✅ **歐盟 GDPR 合規**
- ✅ **政治中立**，不受任何國家干預
- ✅ **銀行級安全標準**
- ✅ **數據主權保護**

---

## 📋 部署步驟

### 步驟 1: 創建 DigitalOcean Droplet

1. **登入 DigitalOcean**: https://cloud.digitalocean.com

2. **創建新 Droplet**:
   - 點擊 "Create" → "Droplets"

3. **選擇配置**:
   ```
   Region: Frankfurt, Germany (最接近瑞士，符合歐洲隱私標準)
   Image: Docker on Ubuntu 22.04
   Size: Basic - $12/月 (2GB RAM, 1 CPU, 50GB SSD)
   Authentication: SSH Key (推薦) 或 Password
   Hostname: taskflow-pro-server
   ```

4. **點擊 "Create Droplet"**

5. **記錄 IP 地址**: 例如 `123.45.67.89`

---

### 步驟 2: 連接到服務器

**Windows PowerShell**:
```powershell
ssh root@YOUR_DROPLET_IP
```

**首次連接**:
- 輸入 "yes" 接受 SSH 指紋
- 輸入密碼（如果使用密碼認證）

---

### 步驟 3: 安裝必要軟件

```bash
# 更新系統
apt update && apt upgrade -y

# 安裝 Docker Compose（如果未預裝）
apt install docker-compose -y

# 安裝 Git
apt install git -y

# 創建應用目錄
mkdir -p /opt/taskflow-pro
cd /opt/taskflow-pro
```

---

### 步驟 4: 克隆代碼

```bash
# 克隆 GitHub 倉庫
git clone https://github.com/canris03150315-collab/taskflow-pro-server.git .

# 進入 server 目錄
cd server
```

---

### 步驟 5: 配置環境變數

```bash
# 創建 .env 文件
cat > .env << 'EOF'
# 資料庫配置
DB_PATH=./data/taskflow.db
DB_KEY_PATH=./data/.db-key

# JWT 認證密鑰（請更改為隨機字符串）
JWT_SECRET=your_super_secure_jwt_secret_key_minimum_32_characters_long_change_this

# 伺服器配置
NODE_ENV=production
PORT=3000

# 數據目錄
DATA_PATH=./data
UPLOADS_PATH=./data/uploads
BACKUPS_PATH=./data/backups
CERTIFICATES_PATH=./data/certificates
LOGS_PATH=./data/logs
EOF

# 生成隨機 JWT Secret
JWT_SECRET=$(openssl rand -base64 32)
sed -i "s/your_super_secure_jwt_secret_key_minimum_32_characters_long_change_this/$JWT_SECRET/" .env

echo "✅ 環境變數已配置"
echo "JWT_SECRET: $JWT_SECRET"
echo "⚠️  請保存此 JWT_SECRET，遺失後無法恢復！"
```

---

### 步驟 6: 構建和啟動服務

```bash
# 構建 Docker 鏡像
docker build -t taskflow-pro-server .

# 啟動容器
docker run -d \
  --name taskflow-pro \
  --restart unless-stopped \
  -p 3000:3000 \
  -v /opt/taskflow-pro/server/data:/app/data \
  --env-file .env \
  taskflow-pro-server

# 檢查容器狀態
docker ps

# 查看日誌
docker logs -f taskflow-pro
```

**預期輸出**:
```
🚀 TaskFlow Pro 伺服器啟動中...
📁 資料路徑: /app/data
✅ 資料庫初始化完成
📈 資料庫統計: 用戶 0 | 任務 0 | 出勤 0 | 財務 0
🎉 TaskFlow Pro 伺服器已啟動！
Server running on port 3000
```

---

### 步驟 7: 配置防火牆

```bash
# 安裝 UFW（如果未安裝）
apt install ufw -y

# 允許 SSH
ufw allow 22/tcp

# 允許 HTTP
ufw allow 80/tcp

# 允許 HTTPS
ufw allow 443/tcp

# 允許應用端口
ufw allow 3000/tcp

# 啟用防火牆
ufw --force enable

# 檢查狀態
ufw status
```

---

### 步驟 8: 配置 Nginx 反向代理（推薦）

```bash
# 安裝 Nginx
apt install nginx -y

# 創建 Nginx 配置
cat > /etc/nginx/sites-available/taskflow-pro << 'EOF'
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# 啟用站點
ln -s /etc/nginx/sites-available/taskflow-pro /etc/nginx/sites-enabled/

# 測試配置
nginx -t

# 重啟 Nginx
systemctl restart nginx

# 設置開機自啟
systemctl enable nginx
```

---

### 步驟 9: 配置 SSL/HTTPS（使用 Let's Encrypt）

```bash
# 安裝 Certbot
apt install certbot python3-certbot-nginx -y

# 獲取 SSL 證書（替換為您的域名）
certbot --nginx -d your-domain.com

# 自動續期測試
certbot renew --dry-run
```

---

## 🔒 安全加固

### 1. 更改 SSH 端口

```bash
# 編輯 SSH 配置
nano /etc/ssh/sshd_config

# 修改端口（例如改為 2222）
Port 2222

# 重啟 SSH
systemctl restart sshd

# 更新防火牆
ufw allow 2222/tcp
ufw delete allow 22/tcp
```

### 2. 禁用 Root 登入

```bash
# 創建新用戶
adduser taskflow
usermod -aG sudo taskflow

# 編輯 SSH 配置
nano /etc/ssh/sshd_config

# 設置
PermitRootLogin no

# 重啟 SSH
systemctl restart sshd
```

### 3. 安裝 Fail2Ban（防止暴力破解）

```bash
apt install fail2ban -y
systemctl enable fail2ban
systemctl start fail2ban
```

---

## 📊 監控和維護

### 查看應用日誌
```bash
docker logs -f taskflow-pro
```

### 重啟應用
```bash
docker restart taskflow-pro
```

### 更新應用
```bash
cd /opt/taskflow-pro/server
git pull
docker build -t taskflow-pro-server .
docker stop taskflow-pro
docker rm taskflow-pro
docker run -d \
  --name taskflow-pro \
  --restart unless-stopped \
  -p 3000:3000 \
  -v /opt/taskflow-pro/server/data:/app/data \
  --env-file .env \
  taskflow-pro-server
```

### 備份數據
```bash
# 備份數據庫
cp /opt/taskflow-pro/server/data/taskflow.db /opt/backups/taskflow-$(date +%Y%m%d).db
cp /opt/taskflow-pro/server/data/.db-key /opt/backups/.db-key-$(date +%Y%m%d)
```

---

## 🌐 更新前端配置

部署完成後，需要更新前端的 API URL：

### 在 Netlify 環境變數中更新：
```
VITE_API_URL=http://YOUR_DROPLET_IP:3000/api
```

或者如果配置了域名和 HTTPS：
```
VITE_API_URL=https://your-domain.com/api
```

---

## 📋 部署檢查清單

- [ ] Droplet 已創建並運行
- [ ] Docker 容器已啟動
- [ ] 防火牆已配置
- [ ] Nginx 反向代理已設置
- [ ] SSL 證書已安裝（如使用域名）
- [ ] 應用可以通過 IP/域名訪問
- [ ] 健康檢查端點正常：`http://YOUR_IP:3000/api/health`
- [ ] 前端已更新 API URL
- [ ] 數據備份計劃已設置

---

## 🆘 故障排除

### 容器無法啟動
```bash
docker logs taskflow-pro
```

### 端口被佔用
```bash
netstat -tulpn | grep 3000
```

### 數據庫錯誤
```bash
# 檢查數據目錄權限
ls -la /opt/taskflow-pro/server/data
```

---

## 💰 成本估算

**DigitalOcean Droplet**:
- Basic ($6/月): 適合測試
- **推薦 ($12/月)**: 適合生產環境
- Professional ($24/月): 高流量環境

**額外成本**:
- 備份: $1.20/月（可選）
- 負載均衡器: $12/月（可選，高可用性）

**總計**: **$12-15/月**（生產環境推薦配置）

---

## 🎯 完成！

您的 TaskFlow Pro 後端現在運行在：
- ✅ 歐洲數據中心（符合最高隱私標準）
- ✅ Docker 容器化（易於管理和擴展）
- ✅ Nginx 反向代理（性能優化）
- ✅ SSL/HTTPS 加密（安全通信）
- ✅ 自動備份（數據安全）

**API 端點**: `https://your-domain.com/api` 或 `http://YOUR_IP:3000/api`
