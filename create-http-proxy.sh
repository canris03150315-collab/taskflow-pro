#!/bin/bash
echo "=== 創建 HTTP 代理伺服器 ==="

# 創建一個簡單的 HTTP 代理
cat > /tmp/proxy-server.js << 'EOF'
const http = require('http');
const https = require('https');
const url = require('url');

const server = http.createServer((req, res) => {
  // 設置 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // 轉發到 HTTPS 後端
  const targetUrl = `https://localhost:3000${req.url}`;
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: req.url,
    method: req.method,
    headers: req.headers,
    rejectUnauthorized: false
  };
  
  const proxyReq = https.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  
  proxyReq.on('error', (err) => {
    console.error('代理錯誤:', err);
    res.writeHead(500);
    res.end(JSON.stringify({ error: '代理服務器錯誤' }));
  });
  
  req.pipe(proxyReq);
});

server.listen(8080, () => {
  console.log('HTTP 代理服務器運行在端口 8080');
  console.log('轉發所有請求到 https://localhost:3000');
});
EOF

echo "上傳代理伺服器..."
scp /tmp/proxy-server.js root@165.227.147.40:/tmp/

echo "啟動代理伺服器..."
ssh root@165.227.147.40 "docker exec -d taskflow-pro node /tmp/proxy-server.js"

echo ""
echo "代理服務器已啟動在端口 8080"
echo "請更新 Netlify 配置使用 http://165.227.147.40:8080"
