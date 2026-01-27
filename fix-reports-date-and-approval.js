const fs = require('fs');
const Database = require('better-sqlite3');

console.log('=== Fix Reports Date and Approval Issues ===\n');

// 1. Create approval_authorizations table
console.log('1. Creating approval_authorizations table...');
const db = new Database('/app/data/taskflow.db');

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS approval_authorizations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      approver_id TEXT NOT NULL,
      status TEXT DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL,
      expires_at TEXT,
      reason TEXT
    )
  `);
  console.log('   [OK] Table created\n');
} catch (error) {
  console.log('   [ERROR]', error.message, '\n');
}

db.close();

// 2. Fix reports.js to use reportDate from frontend
console.log('2. Fixing reports.js to use reportDate...');
const reportsPath = '/app/dist/routes/reports.js';
let content = fs.readFileSync(reportsPath, 'utf8');

// Find and replace the POST route to use reportDate
const oldPattern = /router\.post\('\/'\s*,\s*authenticateToken\s*,\s*async\s*\(req\s*,\s*res\)\s*=>\s*\{[\s\S]*?const\s+now\s*=\s*new\s+Date\(\)\.toISOString\(\);/;

const replacement = `router.post('/', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { type, content, reportDate } = req.body;

    const id = \`report-\${Date.now()}\`;
    
    // Use reportDate from frontend if provided, otherwise use current time
    let createdAt;
    if (reportDate) {
      // Convert YYYY-MM-DD to ISO string with time set to noon UTC+8
      const date = new Date(reportDate + 'T12:00:00+08:00');
      createdAt = date.toISOString();
    } else {
      createdAt = new Date().toISOString();
    }`;

if (oldPattern.test(content)) {
  content = content.replace(oldPattern, replacement);
  
  // Also need to update the INSERT statement to use createdAt instead of now
  content = content.replace(
    /INSERT INTO reports \(id, type, user_id, created_at, content\) VALUES \(\?, \?, \?, \?, \?\)',\s*\[id, type \|\| 'DAILY', currentUser\.id, now,/,
    `INSERT INTO reports (id, type, user_id, created_at, content) VALUES (?, ?, ?, ?, ?)',
      [id, type || 'DAILY', currentUser.id, createdAt,`
  );
  
  fs.writeFileSync(reportsPath, content, 'utf8');
  console.log('   [OK] reports.js updated\n');
} else {
  console.log('   [SKIP] Pattern not found, may already be fixed\n');
}

console.log('=== Fix Complete ===');
