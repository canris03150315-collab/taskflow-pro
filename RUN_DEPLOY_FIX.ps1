# 🚨 執行後端更新與部署指令

# 1. 創建快照備份 (安全第一)
ssh root@165.227.147.40 "/root/create-snapshot.sh v8.9.210-before-import-fix" ;

# 2. 上傳修復後的解析器到伺服器
Get-Content "platform-revenue-detailed.js" -Raw | ssh root@165.227.147.40 "cat > /tmp/platform-revenue.js" ;

# 3. 將修復後的檔案覆蓋到容器內
ssh root@165.227.147.40 "docker cp /tmp/platform-revenue.js 36800e386cf4:/app/dist/routes/platform-revenue.js" ;

# 4. 重啟後端容器以載入新代碼
ssh root@165.227.147.40 "docker restart taskflow-pro" ;

# 5. 確認容器運行狀態與日誌
ssh root@165.227.147.40 "docker ps" ;
ssh root@165.227.147.40 "docker logs taskflow-pro --tail 20" ;

# 6. 將修改後的代碼提交到容器映像 (持久化)
ssh root@165.227.147.40 "docker commit 36800e386cf4 taskflow-pro:v8.9.210" ;

# 7. 更新本地工作日誌並提交 Git
git add . ;
git commit -m "fix: 修正平台營收上傳 SQL 語法錯誤 (少一個佔位符)" ;
