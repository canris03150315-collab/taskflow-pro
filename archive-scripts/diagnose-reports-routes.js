const fs = require('fs');

console.log('=== Diagnosing Reports Routes ===\n');

// 檢查 reports.js 文件是否存在
const reportsPath = '/app/dist/routes/reports.js';
if (!fs.existsSync(reportsPath)) {
  console.log('ERROR: reports.js does not exist!');
  process.exit(1);
}

// 讀取文件內容
const content = fs.readFileSync(reportsPath, 'utf8');

console.log('File exists: YES');
console.log('File size:', content.length, 'bytes\n');

// 檢查關鍵路由
const routesToCheck = [
  { name: 'GET /', pattern: /router\.get\(['"]\/['"]/g },
  { name: 'POST /', pattern: /router\.post\(['"]\/['"]/g },
  { name: 'PUT /:id', pattern: /router\.put\(['"]\/(:id|:reportId)['"]/g },
  { name: 'DELETE /:id', pattern: /router\.delete\(['"]\/(:id|:reportId)['"]/g },
  { name: 'GET /approval/pending', pattern: /router\.get\(['"]\/approval\/pending['"]/g },
  { name: 'POST /approval/request', pattern: /router\.post\(['"]\/approval\/request['"]/g },
  { name: 'GET /approval/check', pattern: /router\.get\(['"]\/approval\/check['"]/g },
  { name: 'POST /approval/approve', pattern: /router\.post\(['"]\/approval\/approve['"]/g }
];

console.log('Checking for routes:\n');
routesToCheck.forEach(route => {
  const matches = content.match(route.pattern);
  const exists = matches && matches.length > 0;
  console.log(`  ${exists ? '✓' : '✗'} ${route.name}`);
});

// 檢查是否有 exports
console.log('\nExports:');
if (content.includes('module.exports')) {
  console.log('  ✓ module.exports found');
} else {
  console.log('  ✗ module.exports NOT found');
}

// 顯示前 50 行
console.log('\n=== First 50 lines of reports.js ===\n');
const lines = content.split('\n');
lines.slice(0, 50).forEach((line, i) => {
  console.log(`${(i + 1).toString().padStart(3, ' ')}: ${line}`);
});

console.log('\n=== Diagnosis Complete ===');
