const fs = require('fs');

const filePath = '/app/dist/routes/ai-assistant.js';

console.log('=== AI Assistant Route Diagnosis ===\n');

try {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // 檢查 dbCall 函數定義
  const dbCallMatch = content.match(/function dbCall[\s\S]{0,500}/);
  if (dbCallMatch) {
    console.log('dbCall function found:');
    console.log(dbCallMatch[0]);
    console.log('\n---\n');
  }
  
  // 檢查資料庫使用
  const dbUsageMatches = content.match(/dbCall\([^)]+\)/g);
  if (dbUsageMatches) {
    console.log('dbCall usage count:', dbUsageMatches.length);
    console.log('Examples:');
    dbUsageMatches.slice(0, 3).forEach((match, i) => {
      console.log(`${i + 1}. ${match}`);
    });
  }
  
  console.log('\n=== File exists and readable ===');
} catch (error) {
  console.error('Error reading file:', error.message);
}
