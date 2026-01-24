const fs = require('fs');

const filePath = '/app/dist/routes/ai-assistant.js';
let content = fs.readFileSync(filePath, 'utf8');

// Fix KOL query - use kol_profiles instead of kol_contracts
// kol_contracts table has 0 records, kol_profiles has the actual data
content = content.replace(
  /const kolContracts = await db\.all\("SELECT id, kol_name, platform, status, monthly_fee FROM kol_contracts WHERE status = 'active' LIMIT 20"\);/g,
  "const kolContracts = await db.all(\"SELECT id, platform_id as name, platform, status FROM kol_profiles WHERE status = 'ACTIVE' LIMIT 20\");"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Fixed KOL query to use kol_profiles table');
