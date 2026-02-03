const xlsx = require('xlsx');

const filePath = 'C:\\Users\\USER\\Downloads\\平台帳變(備).xlsx';

console.log('=== 分析 Excel 檔案結構 ===\n');

try {
  const workbook = xlsx.readFileSync(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const range = xlsx.utils.decode_range(sheet['!ref']);

  console.log('總行數:', range.e.r + 1);
  console.log('總列數:', range.e.c + 1);
  console.log('\n前 6 行完整內容:');

  for (let r = 0; r < Math.min(6, range.e.r + 1); r++) {
    let row = [];
    for (let c = 0; c <= Math.min(30, range.e.c); c++) {
      const cell = sheet[xlsx.utils.encode_cell({ r, c })];
      const value = cell ? (cell.v !== undefined ? cell.v : '') : '';
      row.push(value);
    }
    console.log(`行 ${r}:`, row.join(' | '));
  }

  console.log('\n=== 檢測平台名稱位置 ===');
  for (let col = 0; col <= Math.min(30, range.e.c); col++) {
    const cell = sheet[xlsx.utils.encode_cell({ r: 0, c })];
    if (cell && cell.v) {
      const value = String(cell.v).trim();
      if (value && (value.includes('主管') || value.includes('平台'))) {
        console.log(`列 ${col}: "${value}"`);
      }
    }
  }

  console.log('\n=== 數據行範例（行 4-6）===');
  for (let r = 4; r < Math.min(7, range.e.r + 1); r++) {
    let row = [];
    for (let c = 0; c <= Math.min(15, range.e.c); c++) {
      const cell = sheet[xlsx.utils.encode_cell({ r, c })];
      const value = cell ? (cell.v !== undefined ? cell.v : '') : '';
      row.push(value);
    }
    console.log(`行 ${r}:`, row.join(' | '));
  }

} catch (error) {
  console.error('錯誤:', error.message);
}
