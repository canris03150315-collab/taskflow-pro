const fs = require('fs');

console.log('=== Fixing parseExcelFile Function ===\n');

const routePath = '/app/dist/routes/platform-revenue.js';
let content = fs.readFileSync(routePath, 'utf8');

console.log('Step 1: Finding parseExcelFile function...\n');

const funcStart = content.indexOf('function parseExcelFile(buffer) {');
const funcEnd = content.indexOf('return records;', funcStart) + 'return records;'.length;

if (funcStart === -1 || funcEnd === -1) {
  console.log('ERROR: parseExcelFile function not found');
  process.exit(1);
}

console.log('Found parseExcelFile function');

// New correct implementation
const newFunction = `function parseExcelFile(buffer) {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const range = xlsx.utils.decode_range(worksheet['!ref']);

  const platformNames = [];
  
  // Platform names are in row 0, every 18 columns starting from col 1
  for (let col = 1; col <= range.e.c; col += 18) {
    const headerCell = worksheet[xlsx.utils.encode_cell({ r: 0, c: col })];
    if (headerCell && headerCell.v) {
      // Clean platform name (remove tabs and extra spaces)
      const platformName = String(headerCell.v).replace(/\\t+/g, '').trim();
      if (platformName) {
        platformNames.push({ name: platformName, startCol: col });
      }
    }
  }

  const records = [];

  // Data starts from row 2 (row 0 = platform names, row 1 = field headers)
  for (let row = 2; row <= range.e.r; row++) {
    // Date is in column 1 of each platform section
    const dateCell = worksheet[xlsx.utils.encode_cell({ r: row, c: 1 })];
    if (!dateCell || !dateCell.v) continue;

    const date = parseExcelDate(dateCell.v);

    platformNames.forEach((platform) => {
      const baseCol = platform.startCol;

      const getCell = (offset) => {
        const cell = worksheet[xlsx.utils.encode_cell({ r: row, c: baseCol + offset })];
        return cell && cell.v !== undefined ? Number(cell.v) || 0 : 0;
      };

      // Column offsets based on actual Excel structure
      // Col 0 (baseCol): Date
      // Col 1: 彩票 (lottery_amount)
      // Col 3: 外接游戏 (external_game_amount)
      // Col 7: 彩票分红 (lottery_dividend)
      // Col 9: 外接分红 (external_dividend)
      // Col 11: 私返 (private_return)
      // Col 12: 充值 (deposit_amount)
      // Col 13: 提款 (withdrawal_amount)
      // Col 14: 借款 (loan_amount)
      // Col 15: 盈亏 (profit)
      // Col 16: 余额 (balance)

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

// Replace the function
const before = content.slice(0, funcStart);
const after = content.slice(funcEnd + 1);
const newContent = before + newFunction + after;

fs.writeFileSync(routePath, newContent, 'utf8');

console.log('\nStep 2: Verifying...\n');

const verify = fs.readFileSync(routePath, 'utf8');
if (verify.includes('every 18 columns')) {
  console.log('✅ Function updated successfully');
} else {
  console.log('❌ Update failed');
  process.exit(1);
}

console.log('\n=== Complete ===');
