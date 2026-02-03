const fs = require('fs');

console.log('=== Fixing Stats SQL Query ===\n');

const filePath = '/app/dist/routes/platform-revenue.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Step 1: Locate the stats query\n');

const lines = content.split('\n');
let queryStartLine = -1;
let queryEndLine = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("SELECT") && lines[i+1] && lines[i+1].includes("platform_name")) {
    queryStartLine = i;
    for (let j = i; j < lines.length; j++) {
      if (lines[j].includes("FROM platform_transactions")) {
        queryEndLine = j;
        break;
      }
    }
    break;
  }
}

if (queryStartLine === -1) {
  console.log('ERROR: Could not find query');
  process.exit(1);
}

console.log('Found query at lines', queryStartLine, 'to', queryEndLine);

const newQueryLines = [
  '      SELECT',
  '        platform_name,',
  '        COUNT(*) as record_count,',
  '        SUM(lottery_amount) as total_lottery,',
  '        SUM(external_game_amount) as total_external,',
  '        SUM(lottery_dividend) as total_lottery_dividend,',
  '        SUM(external_dividend) as total_external_dividend,',
  '        SUM(private_return) as total_private_return,',
  '        SUM(deposit_amount) as total_deposit,',
  '        SUM(withdrawal_amount) as total_withdrawal,',
  '        SUM(loan_amount) as total_loan,',
  '        SUM(profit) as total_profit,',
  '        AVG(profit) as avg_profit,',
  '        MAX(profit) as max_profit,',
  '        MIN(profit) as min_profit,',
  '        AVG(balance) as avg_balance',
  '      FROM platform_transactions'
];

lines.splice(queryStartLine, queryEndLine - queryStartLine + 1, ...newQueryLines);

content = lines.join('\n');

fs.writeFileSync(filePath, content, 'utf8');

console.log('\nSUCCESS: Updated query with new fields:');
console.log('  - COUNT(*) as record_count');
console.log('  - AVG(profit) as avg_profit');
console.log('  - MAX(profit) as max_profit');
console.log('  - MIN(profit) as min_profit');

console.log('\n=== Fix Complete ===');
