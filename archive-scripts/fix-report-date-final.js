const fs = require('fs');

console.log('=== Final Fix for Report Date Issue ===\n');

const reportsPath = '/app/dist/routes/reports.js';
let content = fs.readFileSync(reportsPath, 'utf8');

console.log('1. Checking current POST route parameter extraction...');

// The issue: frontend sends { type, content, createdAt, userId, id }
// But backend only extracts { type, content, reportDate }
// We need to also accept createdAt as an alternative to reportDate

const oldPattern = /const \{ type, content, reportDate \} = req\.body;/;
const newPattern = `const { type, content, reportDate, createdAt } = req.body;`;

if (oldPattern.test(content)) {
  content = content.replace(oldPattern, newPattern);
  console.log('   [OK] Updated parameter extraction to include createdAt');
} else {
  console.log('   [SKIP] Pattern not found or already updated');
}

// Also update the date handling logic to check both reportDate and createdAt
const dateLogicOld = /let createdAt;\s+if \(reportDate\) \{/;
const dateLogicNew = `let finalCreatedAt;
    // Accept either reportDate (YYYY-MM-DD) or createdAt (ISO string)
    if (reportDate) {`;

if (dateLogicOld.test(content)) {
  content = content.replace(dateLogicOld, dateLogicNew);
  console.log('   [OK] Updated date handling logic');
} else {
  console.log('   [SKIP] Date logic pattern not found');
}

// Update variable name in the rest of the logic
content = content.replace(
  /createdAt = date\.toISOString\(\);/g,
  'finalCreatedAt = date.toISOString();'
);

content = content.replace(
  /} else \{\s+createdAt = new Date\(\)\.toISOString\(\);/g,
  `} else if (createdAt) {
      // Use createdAt if provided (already in correct format or needs conversion)
      if (createdAt.includes('T')) {
        finalCreatedAt = createdAt; // Already ISO string
      } else {
        // YYYY-MM-DD format, convert to ISO
        const date = new Date(createdAt + 'T12:00:00+08:00');
        finalCreatedAt = date.toISOString();
      }
    } else {
      finalCreatedAt = new Date().toISOString();`
);

// Update INSERT statement to use finalCreatedAt
content = content.replace(
  /\[id, type \|\| 'DAILY', currentUser\.id, createdAt,/g,
  `[id, type || 'DAILY', currentUser.id, finalCreatedAt,`
);

fs.writeFileSync(reportsPath, content, 'utf8');

console.log('\n2. Adding detailed logging to POST route...');

// Add logging after parameter extraction
const logPattern = /const \{ type, content, reportDate, createdAt \} = req\.body;/;
const logCode = `const { type, content, reportDate, createdAt } = req.body;
    
    console.log('[REPORTS] POST request received:', {
      type,
      reportDate,
      createdAt,
      hasContent: !!content
    });`;

content = fs.readFileSync(reportsPath, 'utf8');
if (logPattern.test(content)) {
  content = content.replace(logPattern, logCode);
  fs.writeFileSync(reportsPath, content, 'utf8');
  console.log('   [OK] Added logging');
} else {
  console.log('   [SKIP] Logging already added or pattern changed');
}

console.log('\n=== Fix Complete ===');
console.log('\nSummary:');
console.log('- Backend now accepts both reportDate and createdAt');
console.log('- Handles both YYYY-MM-DD and ISO string formats');
console.log('- Added detailed logging for debugging');
console.log('\nNext: Restart container and test');
