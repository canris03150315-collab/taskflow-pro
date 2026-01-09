const fs = require('fs');
const path = '/app/dist/routes/announcements.js';

console.log('Fixing announcements GET response format...');

let content = fs.readFileSync(path, 'utf8');

// 修復 GET 路由：返回 { announcements: [...] } 而不是直接返回陣列
const oldJson = 'res.json(announcements);';
const newJson = 'res.json({ announcements });';

// 只替換 GET 路由中的
const getRouteStart = "router.get('/', auth_1.authenticateToken";
const getRouteEnd = "});";

const getRouteStartIndex = content.indexOf(getRouteStart);
if (getRouteStartIndex !== -1) {
    const getRouteEndIndex = content.indexOf(getRouteEnd, getRouteStartIndex);
    if (getRouteEndIndex !== -1) {
        const getRouteContent = content.substring(getRouteStartIndex, getRouteEndIndex + 3);
        const fixedGetRoute = getRouteContent.replace(oldJson, newJson);
        content = content.substring(0, getRouteStartIndex) + fixedGetRoute + content.substring(getRouteEndIndex + 3);
        fs.writeFileSync(path, content, 'utf8');
        console.log('SUCCESS: Fixed GET response format to { announcements: [...] }');
    } else {
        console.log('ERROR: Could not find GET route end');
        process.exit(1);
    }
} else {
    console.log('ERROR: Could not find GET route');
    process.exit(1);
}

console.log('Done!');
