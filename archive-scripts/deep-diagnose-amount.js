const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Deep Diagnosis of Amount Calculation Issue ===\n');

try {
  // 檢查所有收入記錄的詳細信息
  const records = db.prepare(`
    SELECT 
      id, 
      type, 
      amount, 
      description, 
      category,
      date,
      created_at,
      CAST(amount AS TEXT) as amount_text,
      LENGTH(description) as desc_length
    FROM finance 
    WHERE type = 'INCOME' 
    ORDER BY created_at DESC
  `).all();
  
  console.log('Total INCOME records:', records.length);
  console.log('\n=== Detailed Analysis ===\n');
  
  records.forEach((r, index) => {
    console.log(`[${index + 1}] Record Analysis:`);
    console.log(`    ID: ${r.id}`);
    console.log(`    Amount: ${r.amount} (stored as: ${r.amount_text})`);
    console.log(`    Description: "${r.description}" (length: ${r.desc_length})`);
    console.log(`    Category: ${r.category}`);
    console.log(`    Date: ${r.date}`);
    console.log(`    Created: ${r.created_at}`);
    
    // 嘗試解析描述為數字
    const descNum = parseFloat(r.description);
    if (!isNaN(descNum)) {
      console.log(`    ⚠️  Description is numeric: ${descNum}`);
      
      // 檢查各種可能的計算模式
      const patterns = [
        { name: '10000 - (desc * 2)', value: 10000 - (descNum * 2) },
        { name: '10000 - desc', value: 10000 - descNum },
        { name: '10000 - (desc * desc)', value: 10000 - (descNum * descNum) },
        { name: 'desc * 1000', value: descNum * 1000 }
      ];
      
      patterns.forEach(p => {
        if (Math.abs(p.value - r.amount) < 0.01) {
          console.log(`    🔴 MATCH FOUND: ${p.name} = ${p.value}`);
        }
      });
    }
    console.log('');
  });
  
  // 檢查是否有觸發器或約束
  console.log('=== Checking for triggers ===');
  const triggers = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='trigger' AND tbl_name='finance'").all();
  if (triggers.length > 0) {
    console.log('Found triggers:');
    triggers.forEach(t => {
      console.log(`  - ${t.name}`);
      console.log(`    SQL: ${t.sql}`);
    });
  } else {
    console.log('No triggers found on finance table.');
  }
  
  // 檢查表結構
  console.log('\n=== Table schema ===');
  const schema = db.prepare("PRAGMA table_info(finance)").all();
  schema.forEach(col => {
    console.log(`  ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
  });
  
} catch (error) {
  console.error('Error:', error);
}

db.close();
