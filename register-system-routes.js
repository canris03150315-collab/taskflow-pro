const fs = require('fs');

const filePath = '/app/dist/server.js';
let content = fs.readFileSync(filePath, 'utf8');

// 1. 添加 import
const importPattern = /const version_1 = require\("\.\/routes\/version"\);/;
const newImport = `const version_1 = require("./routes/version");
const system_1 = require("./routes/system");`;

if (content.match(importPattern)) {
    content = content.replace(importPattern, newImport);
    console.log('Step 1: Import added');
} else {
    console.log('ERROR: Could not find version import pattern');
    process.exit(1);
}

// 2. 註冊路由
const routePattern = /this\.app\.use\('\/api\/version', version_1\.versionRoutes\);/;
const newRoute = `this.app.use('/api/version', version_1.versionRoutes);
        this.app.use('/api/system', system_1.systemRoutes);`;

if (content.match(routePattern)) {
    content = content.replace(routePattern, newRoute);
    console.log('Step 2: Route registered');
} else {
    console.log('ERROR: Could not find version route pattern');
    process.exit(1);
}

// 寫入文件
fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: System routes registered in server.js');
