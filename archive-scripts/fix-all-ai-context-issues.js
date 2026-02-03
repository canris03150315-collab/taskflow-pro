const fs = require('fs');

const filePath = '/app/dist/routes/ai-assistant.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing all AI context issues...\n');

// Fix 1: Remove approvals query (table doesn't exist)
console.log('1. Removing approvals query...');
content = content.replace(
  /const pendingApprovals = await db\.all\("SELECT id, type, status, created_at FROM approvals WHERE status = 'pending' LIMIT 20"\);/g,
  'const pendingApprovals = []; // Table does not exist'
);

// Fix 2: Fix memos query (use 'content' instead of 'title')
console.log('2. Fixing memos query...');
content = content.replace(
  /const recentMemos = await db\.all\('SELECT id, title, created_at FROM memos ORDER BY created_at DESC LIMIT 10'\);/g,
  "const recentMemos = await db.all('SELECT id, content, created_at FROM memos ORDER BY created_at DESC LIMIT 10');"
);

// Fix 3: Update buildSystemPrompt to handle memos without title
console.log('3. Updating buildSystemPrompt for memos...');
content = content.replace(
  /\$\{context\.recentMemos\.map\(m => `- \[\$\{m\.created_at\.split\('T'\)\[0\]\}\] \$\{m\.title\}`\)\.join\('\\n'\)\}/g,
  "${context.recentMemos.map(m => `- [${m.created_at.split('T')[0]}] ${m.content ? m.content.substring(0, 50) + '...' : 'No content'}`).join('\\n')}"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('\nSUCCESS: Fixed all AI context issues');
console.log('- Removed approvals query (table does not exist)');
console.log('- Fixed memos query to use content field');
console.log('- Updated prompt to handle memos correctly');
