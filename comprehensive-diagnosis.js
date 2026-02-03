const fs = require('fs');

console.log('=== 平台營收功能完整診斷 ===\n');

const routePath = '/app/dist/routes/platform-revenue.js';
const content = fs.readFileSync(routePath, 'utf8');
const lines = content.split('\n');

console.log('問題 1: 檢查 authenticateToken 實現\n');

let hasCustomAuth = false;
let hasCorrectImport = false;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('function authenticateToken')) {
    hasCustomAuth = true;
    console.log(`  ❌ 第 ${i + 1} 行：發現自定義 authenticateToken 函數`);
    console.log(`     這會導致 403 錯誤，因為 JWT_SECRET 可能不一致`);
  }
  if (lines[i].includes("const { authenticateToken } = require('../middleware/auth')")) {
    hasCorrectImport = true;
    console.log(`  ✅ 第 ${i + 1} 行：正確導入統一認證中間件`);
  }
}

if (hasCustomAuth && !hasCorrectImport) {
  console.log('\n  🚨 問題確認：使用自定義認證，缺少統一中間件導入');
} else if (hasCustomAuth && hasCorrectImport) {
  console.log('\n  ⚠️  同時存在兩種認證方式，可能衝突');
} else if (!hasCustomAuth && hasCorrectImport) {
  console.log('\n  ✅ 認證配置正確');
}

console.log('\n問題 2: 檢查 parseExcelFile 函數邏輯\n');

let parseExcelStart = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('function parseExcelFile')) {
    parseExcelStart = i;
    break;
  }
}

if (parseExcelStart !== -1) {
  let colPattern = '';
  let rowStart = '';
  let dateCol = '';
  
  for (let i = parseExcelStart; i < Math.min(parseExcelStart + 30, lines.length); i++) {
    if (lines[i].includes('col += ')) {
      const match = lines[i].match(/col \+= (\d+)/);
      if (match) {
        colPattern = match[1];
        console.log(`  第 ${i + 1} 行：平台間隔 = 每 ${colPattern} 列`);
      }
    }
    if (lines[i].includes('for (let row = ')) {
      const match = lines[i].match(/row = (\d+)/);
      if (match) {
        rowStart = match[1];
        console.log(`  第 ${i + 1} 行：數據起始行 = 第 ${rowStart} 行`);
      }
    }
    if (lines[i].includes('dateCell') && lines[i].includes('c: ')) {
      const match = lines[i].match(/c: (\d+)/);
      if (match) {
        dateCol = match[1];
        console.log(`  第 ${i + 1} 行：日期列 = 第 ${dateCol} 列`);
      }
    }
  }
  
  console.log('\n  實際 Excel 格式（根據分析）：');
  console.log('    - 平台間隔：每 18 列');
  console.log('    - 數據起始行：第 2 行（row 0 = 平台名，row 1 = 欄位標題）');
  console.log('    - 日期列：第 1 列（每個平台區塊的第 1 列）');
  
  if (colPattern !== '18') {
    console.log(`\n  ❌ 問題：代碼使用 ${colPattern} 列間隔，應該是 18`);
  }
  if (rowStart !== '2') {
    console.log(`  ❌ 問題：代碼從第 ${rowStart} 行開始，應該從第 2 行`);
  }
  if (dateCol !== '1') {
    console.log(`  ❌ 問題：代碼使用第 ${dateCol} 列作為日期，應該是第 1 列`);
  }
}

console.log('\n問題 3: 檢查所有端點配置\n');

const endpoints = [
  { name: 'POST /parse', pattern: "router.post('/parse'" },
  { name: 'POST /import', pattern: "router.post('/import'" },
  { name: 'GET /', pattern: "router.get('/'," },
  { name: 'GET /platforms', pattern: "router.get('/platforms'" },
  { name: 'GET /stats/platform', pattern: "router.get('/stats/platform'" },
  { name: 'GET /history', pattern: "router.get('/history'" }
];

endpoints.forEach(ep => {
  const found = content.includes(ep.pattern);
  console.log(`  ${found ? '✅' : '❌'} ${ep.name}`);
});

console.log('\n問題 4: 檢查 dbCall 函數\n');

if (content.includes('function dbCall')) {
  console.log('  ✅ dbCall 函數存在');
  
  const dbCallStart = content.indexOf('function dbCall');
  const dbCallCode = content.substring(dbCallStart, dbCallStart + 300);
  
  if (dbCallCode.includes('db[method]') && dbCallCode.includes('db.db[method]')) {
    console.log('  ✅ 正確的適配器模式（支援兩種 db 對象）');
  } else {
    console.log('  ⚠️  dbCall 實現可能不完整');
  }
} else {
  console.log('  ❌ dbCall 函數缺失');
}

console.log('\n問題 5: 檢查 multer 配置\n');

if (content.includes('multer.memoryStorage')) {
  console.log('  ✅ 使用 memoryStorage（正確）');
} else if (content.includes('multer.diskStorage')) {
  console.log('  ⚠️  使用 diskStorage（可能需要清理臨時文件）');
} else {
  console.log('  ❌ multer 配置缺失');
}

console.log('\n=== 診斷總結 ===\n');

const issues = [];

if (hasCustomAuth) {
  issues.push({
    id: 1,
    severity: 'HIGH',
    title: '使用自定義 authenticateToken',
    impact: '導致 403 Forbidden 錯誤',
    solution: '刪除自定義函數，使用統一中間件'
  });
}

if (colPattern && colPattern !== '18') {
  issues.push({
    id: 2,
    severity: 'HIGH',
    title: 'Excel 解析邏輯錯誤',
    impact: '返回 0 條記錄，無法解析實際 Excel 格式',
    solution: '修正平台間隔為 18 列，數據起始行為第 2 行，日期列為第 1 列'
  });
}

console.log(`發現 ${issues.length} 個問題：\n`);

issues.forEach(issue => {
  console.log(`問題 ${issue.id} [${issue.severity}]`);
  console.log(`  標題：${issue.title}`);
  console.log(`  影響：${issue.impact}`);
  console.log(`  解決：${issue.solution}`);
  console.log('');
});

console.log('=== 診斷完成 ===');
