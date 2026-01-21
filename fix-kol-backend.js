const fs = require('fs');

console.log('Fixing KOL backend route...');

const routePath = '/app/dist/routes/kol.js';
let content = fs.readFileSync(routePath, 'utf8');

// Find the UPDATE statement for profiles
const oldUpdate = 'UPDATE kol_profiles SET platform = ?, platform_id = ?, platform_account = ?, contact_info = ?, status = ?, notes = ?, updated_at = ? WHERE id = ?';
const newUpdate = 'UPDATE kol_profiles SET platform = ?, platform_id = ?, platform_account = ?, contact_info = ?, status = ?, status_color = ?, weekly_pay_note = ?, notes = ?, updated_at = ? WHERE id = ?';

if (content.includes(oldUpdate)) {
  content = content.replace(oldUpdate, newUpdate);
  
  // Update the .run() parameters
  const oldRun = '.run(platform, platformId, platformAccount, contactInfo || null, status, notes || null, updatedAt, id)';
  const newRun = '.run(platform, platformId, platformAccount, contactInfo || null, status, statusColor || null, weeklyPayNote || null, notes || null, updatedAt, id)';
  
  content = content.replace(oldRun, newRun);
  
  fs.writeFileSync(routePath, content, 'utf8');
  console.log('SUCCESS: Route updated');
} else {
  console.log('INFO: Already updated or pattern not found');
}

console.log('DONE');
