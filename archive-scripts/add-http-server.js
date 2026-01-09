const fs = require('fs');

const filePath = '/app/dist/server.js';
let content = fs.readFileSync(filePath, 'utf8');

// 找到 server.listen 之後，添加一個 HTTP 伺服器監聽 3001 端口
const listenPattern = /this\.server\.listen\(this\.config\.port, '0\.0\.0\.0', \(\) => \{/;

if (content.match(listenPattern)) {
  // 在 HTTPS 伺服器啟動後，添加 HTTP 伺服器
  const httpServerCode = `
            // 同時啟動 HTTP 伺服器用於 Netlify 反向代理
            const http = require('http');
            const httpServer = http.createServer(this.app);
            httpServer.listen(3001, '0.0.0.0', () => {
                console.log('\\u2705 HTTP \\u4f3a\\u670d\\u5668\\u5df2\\u555f\\u52d5\\u65bc\\u7aef\\u53e3 3001');
            });
            this.server.listen(this.config.port, '0.0.0.0', () => {`;
  
  content = content.replace(listenPattern, httpServerCode);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('SUCCESS: HTTP server added on port 3001');
} else {
  console.log('ERROR: Could not find server.listen pattern');
  process.exit(1);
}
