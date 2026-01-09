const fs = require('fs');

const filePath = '/app/dist/server.js';
let content = fs.readFileSync(filePath, 'utf8');

// 在 app 初始化後添加 trust proxy 設置
const appPattern = /this\.app = \(0, express_1\.default\)\(\);/;
const trustProxyCode = `this.app = (0, express_1.default)();
        // Trust proxy for Netlify reverse proxy
        this.app.set('trust proxy', true);`;

if (content.match(appPattern)) {
    content = content.replace(appPattern, trustProxyCode);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Trust proxy enabled');
} else {
    console.log('ERROR: Could not find app initialization pattern');
    process.exit(1);
}
