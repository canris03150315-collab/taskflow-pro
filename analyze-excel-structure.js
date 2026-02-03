const xlsx = require('xlsx');
const path = require('path');

const filePath = 'C:\\Users\\USER\\Downloads\\平台帳變(備).xlsx';

console.log('=== 分析 Excel 檔案結構 ===\n');

try {
  const workbook = xlsx.readFileSync(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const range = xlsx.utils.decode_range(sheet['!ref']);

  console.log('總行數:', range.e.r + 1);
  console.log('總列數:', range.e.c + 1);
  console.log('工作表名稱:', workbook.SheetNames[0]);
  console.log('\n前 5 行內容:');

  for (let r = 0; r < Math.min(5, range.e.r + 1); r++) {
    let row = [];
    for (let c = 0; c <= Math.min(50, range.e.c); c++) {
      const cell = sheet[xlsx.utils.encode_cell({ r, c })];
      const value = cell ? (cell.v !== undefined ? cell.v : '') : '';
      row.push(value);
    }
    console.log(`行 ${r}:`, row.join(' | '));
  }

  console.log('\n=== 檢測平台名稱 ===');
  const platformNames = [];
  for (let col = 0; col <= range.e.c; col++) {
    const cell = sheet[xlsx.utils.encode_cell({ r: 0, c })];
    if (cell && cell.v) {
      const value = String(cell.v).trim();
      if (value && (value.includes('平台') || value.includes('賬變') || value.includes('帳變'))) {
        console.log(`列 ${col}: "${value}"`);
        platformNames.push({ col, name: value });
      }
    }
  }

  console.log('\n=== 檢測日期欄位 ===');
  for (let r = 1; r < Math.min(10, range.e.r + 1); r++) {
    const dateCell = sheet[xlsx.utils.encode_cell({ r, c: 0 })];
    if (dateCell && dateCell.v) {
      console.log(`行 ${r} 列 0:`, dateCell.v, typeof dateCell.v);
    }
  }

  console.log('\n=== 檢測數據行範圍 ===');
  let dataStartRow = -1;
  for (let r = 0; r < Math.min(20, range.e.r + 1); r++) {
    const cell = sheet[xlsx.utils.encode_cell({ r, c: 0 })];
    if (cell && cell.v) {
      const value = Number(cell.v);
      if (!isNaN(value) && value >= 1 && value <= 31) {
        dataStartRow = r;
        console.log(`數據從行 ${r} 開始`);
        break;
      }
    }
  }

  if (dataStartRow >= 0) {
    console.log('\n=== 數據行範例 ===');
    for (let r = dataStartRow; r < Math.min(dataStartRow + 3, range.e.r + 1); r++) {
      let row = [];
      for (let c = 0; c <= Math.min(20, range.e.c); c++) {
        const cell = sheet[xlsx.utils.encode_cell({ r, c })];
        const value = cell ? (cell.v !== undefined ? cell.v : '') : '';
        row.push(value);
      }
      console.log(`行 ${r}:`, row.join(' | '));
    }
  }

} catch (error) {
  console.error('錯誤:', error.message);
  console.error(error.stack);
}
