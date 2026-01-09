const express = require('express');
const auth = require('./dist/routes/auth');
const SecureDatabase = require('./dist/database-v2').SecureDatabase;

const app = express();
app.use(express.json());

// 初始化資料庫
const db = new SecureDatabase('/app/data/taskflow.db');
db.initialize();

// 注入 req.db
app.use((req, res, next) => {
    req.db = db;
    next();
});

// 註冊 auth 路由
app.use('/api/auth', auth.authRoutes);

// 測試登入
const testLogin = async () => {
    const http = require('http');
    const server = http.createServer(app);
    
    server.listen(4000, () => {
        console.log('Test server started on port 4000');
        
        // 發送測試請求
        const postData = JSON.stringify({
            username: 'canris',
            password: 'kico123123'
        });
        
        const options = {
            hostname: 'localhost',
            port: 4000,
            path: '/api/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                console.log('Response status:', res.statusCode);
                console.log('Response body:', data);
                server.close();
                process.exit(0);
            });
        });
        
        req.on('error', (e) => {
            console.error('Request error:', e);
            server.close();
            process.exit(1);
        });
        
        req.write(postData);
        req.end();
    });
};

testLogin().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
