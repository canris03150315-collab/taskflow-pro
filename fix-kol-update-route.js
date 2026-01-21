const fs = require('fs');

console.log('Fixing KOL update route...');

const routePath = '/app/dist/routes/kol.js';
let content = fs.readFileSync(routePath, 'utf8');

// Find and replace the UPDATE statement
const oldUpdate = `      UPDATE kol_profiles
      SET facebook_id = ?, platform_account = ?, contact_info = ?, status = ?, notes = ?, updated_at = ?
      WHERE id = ?`;

const newUpdate = `      UPDATE kol_profiles
      SET facebook_id = ?, platform_account = ?, contact_info = ?, status = ?, status_color = ?, weekly_pay_note = ?, notes = ?, updated_at = ?
      WHERE id = ?`;

if (content.includes(oldUpdate)) {
  content = content.replace(oldUpdate, newUpdate);
  
  // Update the .run() parameters
  const oldRun = '.run(facebookId, platformAccount, contactInfo || null, status, notes || null, now, id)';
  const newRun = '.run(facebookId, platformAccount, contactInfo || null, status, statusColor || null, weeklyPayNote || null, notes || null, now, id)';
  
  content = content.replace(oldRun, newRun);
  
  fs.writeFileSync(routePath, content, 'utf8');
  console.log('SUCCESS: Route updated');
} else {
  console.log('WARNING: Pattern not found, checking alternative...');
  
  // Try alternative pattern
  if (content.includes('SET facebook_id = ?, platform_account = ?, contact_info = ?, status = ?, notes = ?, updated_at = ?')) {
    content = content.replace(
      'SET facebook_id = ?, platform_account = ?, contact_info = ?, status = ?, notes = ?, updated_at = ?',
      'SET facebook_id = ?, platform_account = ?, contact_info = ?, status = ?, status_color = ?, weekly_pay_note = ?, notes = ?, updated_at = ?'
    );
    
    content = content.replace(
      '.run(facebookId, platformAccount, contactInfo || null, status, notes || null, now, id)',
      '.run(facebookId, platformAccount, contactInfo || null, status, statusColor || null, weeklyPayNote || null, notes || null, now, id)'
    );
    
    fs.writeFileSync(routePath, content, 'utf8');
    console.log('SUCCESS: Route updated (alternative pattern)');
  } else {
    console.log('ERROR: Could not find pattern to replace');
  }
}

console.log('DONE');
