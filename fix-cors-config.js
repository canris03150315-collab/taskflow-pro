const fs = require('fs');

const filePath = '/app/dist/server.js';
let content = fs.readFileSync(filePath, 'utf8');

// 找到現有的 CORS 配置並替換
const oldCors = "origin: ['http://localhost:3000', 'https://localhost:3000', 'http://127.0.0.1:3000']";
const newCors = "origin: ['http://localhost:3000', 'https://localhost:3000', 'http://127.0.0.1:3000', 'https://transcendent-basbousa-6df2d2.netlify.app', 'http://165.227.147.40:3000', 'https://165.227.147.40:3000']";

if (content.includes(oldCors)) {
  content = content.replace(oldCors, newCors);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('SUCCESS: CORS config updated');
} else {
  // 嘗試更通用的替換
  const corsPattern = /origin:\s*\[([^\]]+)\]/;
  const match = content.match(corsPattern);
  if (match) {
    console.log('Found CORS config:', match[0]);
    const newOrigins = "origin: ['http://localhost:3000', 'https://localhost:3000', 'http://127.0.0.1:3000', 'https://transcendent-basbousa-6df2d2.netlify.app', 'http://165.227.147.40:3000', 'https://165.227.147.40:3000']";
    content = content.replace(corsPattern, newOrigins);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: CORS config updated (pattern match)');
  } else {
    console.log('ERROR: Could not find CORS config');
    process.exit(1);
  }
}
