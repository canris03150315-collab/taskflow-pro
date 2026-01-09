const fs = require('fs');
const path = '/app/dist/routes/announcements.js';

console.log('Fixing announcements GET response format...');

let content = fs.readFileSync(path, 'utf8');

// 修復 GET 路由：返回 { announcements: [...] } 而不是直接返回陣列
const oldGet = `router.get('/', auth_1.authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const announcements = dbCall(db, 'prepare', 'SELECT * FROM announcements ORDER BY created_at DESC').all();
    res.json(announcements);`;

const newGet = `router.get('/', auth_1.authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const announcements = dbCall(db, 'prepare', 'SELECT * FROM announcements ORDER BY created_at DESC').all();
    res.json({ announcements });`;

if (content.includes(oldGet)) {
    content = content.replace(oldGet, newGet);
    fs.writeFileSync(path, content, 'utf8');
    console.log('SUCCESS: Fixed GET response format to { announcements: [...] }');
} else {
    console.log('ERROR: Could not find exact match');
    
    // 備用方案：直接替換 res.json(announcements)
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
            console.log('SUCCESS: Applied alternative fix');
        } else {
            console.log('ERROR: Could not find GET route end');
            process.exit(1);
        }
    } else {
        console.log('ERROR: Could not find GET route');
        process.exit(1);
    }
}

console.log('Done!');
