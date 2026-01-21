const fs = require('fs');

const filePath = '/app/dist/routes/kol.js';
const content = fs.readFileSync(filePath, 'utf8');

// 找到 POST /payments 路由
const paymentRouteMatch = content.match(/router\.post\(['"]\/payments['"],[\s\S]{0,2000}?(?=router\.(get|post|put|delete)|$)/);

if (paymentRouteMatch) {
  console.log('=== POST /payments Route ===');
  console.log(paymentRouteMatch[0].substring(0, 1500));
} else {
  console.log('POST /payments route not found');
}
