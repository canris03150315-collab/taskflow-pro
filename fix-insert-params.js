const fs = require('fs');
const path = require('path');

const filePath = '/app/platform-revenue-detailed.js';

console.log('Reading file...');
let content = fs.readFileSync(filePath, 'utf8');

// 找到並修正 INSERT 參數
const oldPattern = `        const id = \`platform-tx-\${Date.now()}-\${uuidv4().slice(0, 8)}\`;
        insertStmt.run(
          id, record.platform_name, record.date,
          record.lottery_wage, record.lottery_rebate, record.game_ag, record.game_chess,
          record.game_rebate, record.game_private, record.lottery_dividend_receive,
          record.lottery_dividend_send, record.external_dividend_receive, record.external_dividend_send,
          record.lottery_amount, record.external_game_amount, record.lottery_dividend, record.external_dividend,
          record.private_return, record.deposit_amount, record.withdrawal_amount, record.loan_amount,
          record.profit, record.balance,
          currentUser.id, currentUser.username, now, record.fileName || '',
          now, now
        );`;

const newPattern = `        const id = \`platform-tx-\${Date.now()}-\${uuidv4().slice(0, 8)}\`;
        insertStmt.run(
          id, record.platform_name, record.date,
          record.lottery_wage, record.lottery_rebate, record.game_ag, record.game_chess,
          record.game_rebate, record.game_private, record.lottery_dividend_receive,
          record.lottery_dividend_send, record.external_dividend_receive, record.external_dividend_send,
          record.lottery_amount, record.external_game_amount, record.lottery_dividend, record.external_dividend,
          record.private_return, record.deposit_amount, record.withdrawal_amount, record.loan_amount,
          record.profit, record.balance,
          currentUser.id, currentUser.username, now, record.fileName || '',
          now, now
        );`;

if (content.includes(oldPattern)) {
  content = content.replace(oldPattern, newPattern);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ File updated successfully');
} else {
  console.log('⚠️ Pattern not found, checking current content...');
  
  // 檢查檔案中 insertStmt.run 的實際內容
  const lines = content.split('\n');
  let inInsertBlock = false;
  let insertLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('insertStmt.run(')) {
      inInsertBlock = true;
      insertLines.push(`Line ${i+1}: ${lines[i]}`);
    } else if (inInsertBlock) {
      insertLines.push(`Line ${i+1}: ${lines[i]}`);
      if (lines[i].includes(');')) {
        break;
      }
    }
  }
  
  console.log('Current insertStmt.run block:');
  console.log(insertLines.join('\n'));
}
