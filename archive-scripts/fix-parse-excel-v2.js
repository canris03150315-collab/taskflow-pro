const fs = require('fs');

console.log('=== Fixing parseExcelFile - Correct Excel Format ===\n');

const routePath = '/app/dist/routes/platform-revenue.js';
let content = fs.readFileSync(routePath, 'utf8');

console.log('Step 1: Replacing parseExcelFile function...\n');

// Find and replace the entire parseExcelFile function
const funcStart = content.indexOf('function parseExcelFile(buffer) {');
const funcEnd = content.indexOf('\n}', content.indexOf('return records;', funcStart)) + 2;

if (funcStart === -1 || funcEnd === -1) {
  console.log('ERROR: Cannot find parseExcelFile function boundaries');
  process.exit(1);
}

console.log('Found function from position', funcStart, 'to', funcEnd);

// Correct implementation based on actual Excel structure
const correctFunction = `function parseExcelFile(buffer) {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const range = xlsx.utils.decode_range(worksheet['!ref']);
  
  const platformNames = [];
  
  for (let col = 1; col <= range.e.c; col += 18) {
    const headerCell = worksheet[xlsx.utils.encode_cell({ r: 0, c: col })];
    if (headerCell && headerCell.v) {
      const platformName = String(headerCell.v).replace(/\\t+/g, '').trim();
      if (platformName) {
        platformNames.push({ name: platformName, startCol: col });
      }
    }
  }

  const records = [];

  for (let row = 2; row <= range.e.r; row++) {
    const dateCell = worksheet[xlsx.utils.encode_cell({ r: row, c: 1 })];
    if (!dateCell || !dateCell.v) continue;

    const date = parseExcelDate(dateCell.v);

    platformNames.forEach((platform) => {
      const baseCol = platform.startCol;

      const getCell = (offset) => {
        const cell = worksheet[xlsx.utils.encode_cell({ r: row, c: baseCol + offset })];
        return cell && cell.v !== undefined ? Number(cell.v) || 0 : 0;
      };

      records.push({
        platform_name: platform.name,
        date: date,
        lottery_amount: getCell(1),
        external_game_amount: getCell(3),
        lottery_dividend: getCell(7),
        external_dividend: getCell(9),
        private_return: getCell(11),
        deposit_amount: getCell(12),
        withdrawal_amount: getCell(13),
        loan_amount: getCell(14),
        profit: getCell(15),
        balance: getCell(16)
      });
    });
  }

  return records;
}`;

const newContent = content.substring(0, funcStart) + correctFunction + content.substring(funcEnd);

fs.writeFileSync(routePath, newContent, 'utf8');

console.log('Step 2: Verifying syntax...\n');

try {
  require(routePath);
  console.log('✅ Syntax check passed');
} catch (error) {
  console.log('❌ Syntax error:', error.message);
  process.exit(1);
}

console.log('\n=== Fix Complete ===');
