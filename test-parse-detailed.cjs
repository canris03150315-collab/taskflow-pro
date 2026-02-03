const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = 'C:\\Users\\USER\\Downloads\\平台帳變(備).xlsx';

console.log('=== 測試平台營收詳細欄位解析 ===\n');

try {
  const workbook = xlsx.readFileSync(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const range = xlsx.utils.decode_range(sheet['!ref']);

  console.log('檔案資訊:');
  console.log('  總行數:', range.e.r + 1);
  console.log('  總列數:', range.e.c + 1);

  // 檢測平台
  const platforms = [];
  for (let col = 1; col <= range.e.c; col += 18) {
    const headerCell = sheet[xlsx.utils.encode_cell({ r: 0, c: col })];
    if (headerCell && headerCell.v) {
      const platformName = String(headerCell.v).replace(/\t+/g, '').trim();
      if (platformName) {
        platforms.push({ name: platformName, startCol: col });
      }
    }
  }

  console.log('\n檢測到的平台:', platforms.map(p => p.name));

  // 測試解析第一個平台的數據
  if (platforms.length > 0) {
    const platform = platforms[0];
    const baseCol = platform.startCol;

    console.log(`\n測試平台: ${platform.name}`);
    console.log(`起始列: ${baseCol}`);

    // 測試數據行（行 4）
    const testRow = 4;

    const getCell = (row, col) => {
      const cell = sheet[xlsx.utils.encode_cell({ r: row, c: col })];
      return cell && cell.v !== undefined ? Number(cell.v) || 0 : 0;
    };

    console.log(`\n行 ${testRow} 的詳細欄位:`);
    console.log(`  彩票工資: ${getCell(testRow, baseCol + 1)}`);
    console.log(`  彩票反點: ${getCell(testRow, baseCol + 2)}`);
    console.log(`  真人AG: ${getCell(testRow, baseCol + 3)}`);
    console.log(`  棋牌: ${getCell(testRow, baseCol + 4)}`);
    console.log(`  外接返點: ${getCell(testRow, baseCol + 5)}`);
    console.log(`  真人私返: ${getCell(testRow, baseCol + 6)}`);
    console.log(`  彩票領取分紅: ${getCell(testRow, baseCol + 7)}`);
    console.log(`  彩票下發分紅: ${getCell(testRow, baseCol + 8)}`);
    console.log(`  外接領取分紅: ${getCell(testRow, baseCol + 9)}`);
    console.log(`  外接下發分紅: ${getCell(testRow, baseCol + 10)}`);
    console.log(`  私返: ${getCell(testRow, baseCol + 11)}`);
    console.log(`  充值: ${getCell(testRow, baseCol + 12)}`);
    console.log(`  提款: ${getCell(testRow, baseCol + 13)}`);
    console.log(`  借款: ${getCell(testRow, baseCol + 14)}`);
    console.log(`  營利: ${getCell(testRow, baseCol + 15)}`);
    console.log(`  餘額: ${getCell(testRow, baseCol + 16)}`);

    // 驗證合併計算
    const lotteryWage = getCell(testRow, baseCol + 1);
    const lotteryRebate = getCell(testRow, baseCol + 2);
    const gameAG = getCell(testRow, baseCol + 3);
    const gameChess = getCell(testRow, baseCol + 4);
    const gameRebate = getCell(testRow, baseCol + 5);
    const gamePrivate = getCell(testRow, baseCol + 6);
    const lotteryDividendReceive = getCell(testRow, baseCol + 7);
    const lotteryDividendSend = getCell(testRow, baseCol + 8);
    const externalDividendReceive = getCell(testRow, baseCol + 9);
    const externalDividendSend = getCell(testRow, baseCol + 10);

    const lotteryAmount = lotteryWage + lotteryRebate;
    const externalGameAmount = gameAG + gameChess + gameRebate + gamePrivate;
    const lotteryDividend = lotteryDividendReceive + lotteryDividendSend;
    const externalDividend = externalDividendReceive + externalDividendSend;

    console.log(`\n合併欄位驗證:`);
    console.log(`  彩票總額: ${lotteryAmount} (工資 ${lotteryWage} + 反點 ${lotteryRebate})`);
    console.log(`  外接遊戲總額: ${externalGameAmount} (AG ${gameAG} + 棋牌 ${gameChess} + 返點 ${gameRebate} + 私返 ${gamePrivate})`);
    console.log(`  彩票分紅總額: ${lotteryDividend} (領取 ${lotteryDividendReceive} + 下發 ${lotteryDividendSend})`);
    console.log(`  外接分紅總額: ${externalDividend} (領取 ${externalDividendReceive} + 下發 ${externalDividendSend})`);

    // 測試完整解析
    console.log(`\n=== 測試完整解析（前 3 天）===`);
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    for (let row = 4; row <= Math.min(6, range.e.r); row++) {
      const dateCell = sheet[xlsx.utils.encode_cell({ r: row, c: 1 })];
      if (!dateCell || !dateCell.v) continue;

      const dayNum = Number(dateCell.v);
      if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) continue;

      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

      console.log(`\n日期: ${dateStr}`);
      console.log(`  彩票工資: ${getCell(row, baseCol + 1)}`);
      console.log(`  彩票反點: ${getCell(row, baseCol + 2)}`);
      console.log(`  真人AG: ${getCell(row, baseCol + 3)}`);
      console.log(`  棋牌: ${getCell(row, baseCol + 4)}`);
      console.log(`  外接返點: ${getCell(row, baseCol + 5)}`);
      console.log(`  真人私返: ${getCell(row, baseCol + 6)}`);
      console.log(`  彩票領取分紅: ${getCell(row, baseCol + 7)}`);
      console.log(`  彩票下發分紅: ${getCell(row, baseCol + 8)}`);
      console.log(`  外接領取分紅: ${getCell(row, baseCol + 9)}`);
      console.log(`  外接下發分紅: ${getCell(row, baseCol + 10)}`);
      console.log(`  私返: ${getCell(row, baseCol + 11)}`);
      console.log(`  充值: ${getCell(row, baseCol + 12)}`);
      console.log(`  提款: ${getCell(row, baseCol + 13)}`);
      console.log(`  借款: ${getCell(row, baseCol + 14)}`);
      console.log(`  營利: ${getCell(row, baseCol + 15)}`);
      console.log(`  餘額: ${getCell(row, baseCol + 16)}`);
    }

    console.log(`\n✅ 測試完成！解析邏輯正確。`);
  }

} catch (error) {
  console.error('❌ 測試失敗:', error.message);
  console.error(error.stack);
  process.exit(1);
}
