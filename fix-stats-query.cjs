const fs = require('fs');

console.log('=== Fixing Stats Query ===\n');

const filePath = '/app/dist/routes/platform-revenue.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Step 1: Finding stats/platform route\n');

const oldQuery = `SELECT 
        platform_name,
        SUM(lottery_amount) as total_lottery,
        SUM(external_game_amount) as total_external,
        SUM(lottery_dividend) as total_lottery_dividend,
        SUM(external_dividend) as total_external_dividend,
        SUM(private_return) as total_private_return,
        SUM(deposit_amount) as total_deposit,
        SUM(withdrawal_amount) as total_withdrawal,
        SUM(loan_amount) as total_loan,
        SUM(profit) as total_profit,
        AVG(balance) as avg_balance
      FROM platform_transactions
      WHERE 1=1`;

const newQuery = `SELECT 
        platform_name,
        COUNT(*) as record_count,
        SUM(lottery_amount) as total_lottery,
        SUM(external_game_amount) as total_external,
        SUM(lottery_dividend) as total_lottery_dividend,
        SUM(external_dividend) as total_external_dividend,
        SUM(private_return) as total_private_return,
        SUM(deposit_amount) as total_deposit,
        SUM(withdrawal_amount) as total_withdrawal,
        SUM(loan_amount) as total_loan,
        SUM(profit) as total_profit,
        AVG(profit) as avg_profit,
        MAX(profit) as max_profit,
        MIN(profit) as min_profit,
        AVG(balance) as avg_balance
      FROM platform_transactions
      WHERE 1=1`;

if (content.includes('AVG(balance) as avg_balance')) {
  content = content.replace(oldQuery, newQuery);
  console.log('SUCCESS: Updated stats query');
  console.log('Added fields:');
  console.log('  - COUNT(*) as record_count');
  console.log('  - AVG(profit) as avg_profit');
  console.log('  - MAX(profit) as max_profit');
  console.log('  - MIN(profit) as min_profit');
} else {
  console.log('ERROR: Could not find query to replace');
  process.exit(1);
}

fs.writeFileSync(filePath, content, 'utf8');

console.log('\n=== Fix Complete ===');
