const fs = require('fs');

console.log('=== 匯出 KOL 完整數據（包含合約和支付記錄） ===\n');

function dbCall(db, method, ...args) {
  if (typeof db[method] === 'function') {
    return db[method](...args);
  }
  if (db.db && typeof db.db[method] === 'function') {
    return db.db[method](...args);
  }
  throw new Error(`Method ${method} not found on database object`);
}

try {
  const Database = require('better-sqlite3');
  const db = new Database('/app/data/taskflow.db');
  
  // 1. 獲取所有 KOL 檔案
  const profiles = dbCall(db, 'prepare', 'SELECT * FROM kol_profiles').all();
  console.log(`✅ 找到 ${profiles.length} 個 KOL 檔案`);
  
  // 2. 獲取所有合約
  const contracts = dbCall(db, 'prepare', 'SELECT * FROM kol_contracts').all();
  console.log(`✅ 找到 ${contracts.length} 個合約`);
  
  // 3. 獲取所有支付記錄
  const payments = dbCall(db, 'prepare', 'SELECT * FROM kol_payments').all();
  console.log(`✅ 找到 ${payments.length} 個支付記錄`);
  
  // 4. 構建完整數據結構
  const fullData = {
    exportDate: new Date().toISOString(),
    exportVersion: 'v8.9.170-before-kol-refactor',
    profiles: profiles,
    contracts: contracts,
    payments: payments,
    summary: {
      totalProfiles: profiles.length,
      totalContracts: contracts.length,
      totalPayments: payments.length
    }
  };
  
  // 5. 寫入 JSON 文件
  const jsonPath = '/app/data/kol-full-backup-20260126.json';
  fs.writeFileSync(jsonPath, JSON.stringify(fullData, null, 2), 'utf8');
  console.log(`\n✅ 完整數據已匯出至: ${jsonPath}`);
  
  // 6. 統計信息
  console.log('\n📊 數據統計：');
  console.log(`   - KOL 檔案: ${profiles.length} 個`);
  console.log(`   - 合約: ${contracts.length} 個`);
  console.log(`   - 支付記錄: ${payments.length} 個`);
  
  // 7. 計算總金額
  const totalUnpaid = contracts.reduce((sum, c) => sum + (c.unpaid_amount || 0), 0);
  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  console.log(`   - 總未付金額: $${totalUnpaid.toFixed(2)}`);
  console.log(`   - 總已付金額: $${totalPaid.toFixed(2)}`);
  
  db.close();
  console.log('\n✅ 匯出完成！');
  
} catch (error) {
  console.error('❌ 匯出失敗:', error);
  process.exit(1);
}
