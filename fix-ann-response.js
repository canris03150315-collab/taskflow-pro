const fs = require('fs');
const path = '/app/dist/routes/announcements.js';

console.log('Fixing announcements GET response...');

let content = fs.readFileSync(path, 'utf8');

// 直接替換 GET 路由中的 res.json(announcements)
const before = content;

// 找到 GET 路由的位置
const getStart = content.indexOf("router.get('/', auth_1.authenticateToken");
const getEnd = content.indexOf("});", getStart);

if (getStart === -1 || getEnd === -1) {
    console.log('ERROR: Could not find GET route');
    process.exit(1);
}

// 提取 GET 路由
const getRoute = content.substring(getStart, getEnd + 3);
console.log('Found GET route');

// 替換 res.json(announcements) 為 res.json({ announcements })
const fixedRoute = getRoute.replace('res.json(announcements);', 'res.json({ announcements });');

if (getRoute === fixedRoute) {
    console.log('ERROR: No change made - pattern not found');
    console.log('Looking for: res.json(announcements);');
    process.exit(1);
}

// 替換整個路由
content = content.substring(0, getStart) + fixedRoute + content.substring(getEnd + 3);

fs.writeFileSync(path, content, 'utf8');
console.log('SUCCESS: Changed res.json(announcements) to res.json({ announcements })');
console.log('Done!');
