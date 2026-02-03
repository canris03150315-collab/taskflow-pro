const xlsx = require('xlsx');

const filePath = 'C:\\Users\\USER\\Downloads\\平台帳變(備).xlsx';

console.log('=== 完整分析 Excel 檔案結構 ===\n');

try {
  const workbook = xlsx.readFileSync(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const range = xlsx.utils.decode_range(sheet['!ref']);

  console.log('總行數:', range.e.r + 1);
  console.log('總列數:', range.e.c + 1);

  // 分析第 0 行 - 平台名稱
  console.log('\n=== 第 0 行：平台名稱 ===');
  let row0 = [];
  for (let c = 0; c <= Math.min(50, range.e.c); c++) {
    const cell = sheet[xlsx.utils.encode_cell({ r: 0, c })];
    const value = cell ? (cell.v !== undefined ? cell.v : '') : '';
    if (value) {
      row0.push({ col: c, value: value });
    }
  }
  console.log('發現的平台名稱:', row0);

  // 分析第 1 行 - 欄位標題
  console.log('\n=== 第 1 行：欄位標題 ===');
  let row1 = [];
  for (let c = 0; c <= Math.min(50, range.e.c); c++) {
    const cell = sheet[xlsx.utils.encode_cell({ r: 1, c })];
    const value = cell ? (cell.v !== undefined ? cell.v : '') : '';
    if (value) {
      row1.push({ col: c, value: value });
    }
  }
  console.log('發現的欄位標題:', row1);

  // 分析第 2 行 - 子欄位
  console.log('\n=== 第 2 行：子欄位 ===');
  let row2 = [];
  for (let c = 0; c <= Math.min(50, range.e.c); c++) {
    const cell = sheet[xlsx.utils.encode_cell({ r: 2, c })];
    const value = cell ? (cell.v !== undefined ? cell.v : '') : '';
    if (value) {
      row2.push({ col: c, value: value });
    }
  }
  console.log('發現的子欄位:', row2);

  // 分析數據行
  console.log('\n=== 數據行範例（行 4-6，前 30 列）===');
  for (let r = 4; r < Math.min(7, range.e.r + 1); r++) {
    let row = [];
    for (let c = 0; c <= Math.min(30, range.e.c); c++) {
      const cell = sheet[xlsx.utils.encode_cell({ r, c })];
      const value = cell ? (cell.v !== undefined ? cell.v : '') : '';
      row.push(value);
    }
    console.log(`行 ${r}:`, row.join(' | '));
  }

  // 分析第一個平台的完整結構
  console.log('\n=== 第一個平台完整結構（前 20 列，行 0-5）===');
  for (let r = 0; r < Math.min(6, range.e.r + 1); r++) {
    let row = [];
    for (let c = 0; c <= Math.min(20, range.e.c); c++) {
      const cell = sheet[xlsx.utils.encode_cell({ r, c })];
      const value = cell ? (cell.v !== undefined ? cell.v : '') : '';
      row.push(value);
    }
    console.log(`行 ${r}:`, row.join(' | '));
  }

  // 計算每個平台的列數
  console.log('\n=== 推測每個平台的列數 ===');
  const platformCols = [];
  let currentPlatform = null;
  let startCol = -1;

  for (let c = 0; c <= Math.min(50, range.e.c); c++) {
    const cell = sheet[xlsx.utils.encode_cell({ r: 0, c })];
    const value = cell ? (cell.v !== undefined ? cell.v : '') : '';
    
    if (value && (value.includes('主管') || value.includes('平台'))) {
      if (currentPlatform) {
        platformCols.push({
          name: currentPlatform,
          startCol: startCol,
          endCol: c - 1,
          colCount: c - startCol
        });
      }
      currentPlatform = value;
      startCol = c;
    }
  }
  
  if (currentPlatform) {
    platformCols.push({
      name: currentPlatform,
      startCol: startCol,
      endCol: Math.min(50, range.e.c),
      colCount: Math.min(50, range.e.c) - startCol + 1
    });
  }

  console.log('平台結構:', JSON.stringify(platformCols, null, 2));

} catch (error) {
  console.error('錯誤:', error.message);
  console.error(error.stack);
}
