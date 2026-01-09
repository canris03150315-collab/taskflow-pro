const fs = require('fs');
const path = '/app/dist/routes/announcements.js';

console.log('Fixing announcements route...');

let content = fs.readFileSync(path, 'utf8');

// 修復 POST 路由：添加 created_by 欄位
const oldPost = `router.post('/', auth_1.authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { title, content, priority } = req.body;
    const id = \`announcement-\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`;
    const now = new Date().toISOString();

    dbCall(db, 'prepare', 'INSERT INTO announcements (id, title, content, priority, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(
        id, title, content, priority || 'NORMAL', now, now
    );`;

const newPost = `router.post('/', auth_1.authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { title, content, priority, createdBy } = req.body;
    const id = \`announcement-\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`;
    const now = new Date().toISOString();
    const created_by = createdBy || req.user?.id || 'system';

    dbCall(db, 'prepare', 'INSERT INTO announcements (id, title, content, priority, created_by, created_at, updated_at, read_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        id, title, content, priority || 'NORMAL', created_by, now, now, '[]'
    );`;

if (content.includes(oldPost)) {
    content = content.replace(oldPost, newPost);
    fs.writeFileSync(path, content, 'utf8');
    console.log('SUCCESS: Fixed POST route to include created_by');
} else {
    console.log('ERROR: Could not find exact match. Trying alternative fix...');
    
    // 備用方案：直接替換 INSERT 語句
    const oldInsert = `'INSERT INTO announcements (id, title, content, priority, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'`;
    const newInsert = `'INSERT INTO announcements (id, title, content, priority, created_by, created_at, updated_at, read_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'`;
    
    if (content.includes(oldInsert)) {
        content = content.replace(oldInsert, newInsert);
        
        // 添加 created_by 變數
        const destructure = `const { title, content, priority } = req.body;`;
        const newDestructure = `const { title, content, priority, createdBy } = req.body;`;
        content = content.replace(destructure, newDestructure);
        
        // 添加 created_by 賦值
        const nowLine = `const now = new Date().toISOString();`;
        const newLines = `const now = new Date().toISOString();
    const created_by = createdBy || req.user?.id || 'system';`;
        content = content.replace(nowLine, newLines);
        
        // 修改 run 參數
        const oldRun = `id, title, content, priority || 'NORMAL', now, now`;
        const newRun = `id, title, content, priority || 'NORMAL', created_by, now, now, '[]'`;
        content = content.replace(oldRun, newRun);
        
        fs.writeFileSync(path, content, 'utf8');
        console.log('SUCCESS: Applied alternative fix');
    } else {
        console.log('ERROR: Could not apply fix');
        process.exit(1);
    }
}

console.log('Done!');
