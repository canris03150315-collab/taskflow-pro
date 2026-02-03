const fs = require('fs');

console.log('=== Refactor KOL API to Weekly System ===\n');

const filePath = '/app/dist/routes/kol.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Step 1: Remove contract routes...');
// Remove all contract-related routes
const contractRoutes = [
  /router\.get\('\/contracts'[\s\S]*?\}\);/g,
  /router\.post\('\/contracts'[\s\S]*?\}\);/g,
  /router\.put\('\/contracts\/:id'[\s\S]*?\}\);/g,
  /router\.delete\('\/contracts\/:id'[\s\S]*?\}\);/g
];

contractRoutes.forEach((pattern, index) => {
  const matches = content.match(pattern);
  if (matches) {
    content = content.replace(pattern, '');
    console.log('  Removed contract route ' + (index + 1));
  }
});

console.log('Step 2: Remove payment routes...');
// Remove all payment-related routes
const paymentRoutes = [
  /router\.get\('\/payments'[\s\S]*?\}\);/g,
  /router\.post\('\/payments'[\s\S]*?\}\);/g,
  /router\.delete\('\/payments\/:id'[\s\S]*?\}\);/g,
  /router\.post\('\/batch\/payments'[\s\S]*?\}\);/g
];

paymentRoutes.forEach((pattern, index) => {
  const matches = content.match(pattern);
  if (matches) {
    content = content.replace(pattern, '');
    console.log('  Removed payment route ' + (index + 1));
  }
});

console.log('Step 3: Simplify stats route...');
// Replace stats route with simplified version
const oldStatsRoute = /router\.get\('\/stats'[\s\S]*?\}\);/;
const newStatsRoute = `router.get('/stats', authenticateToken, checkKOLPermission, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const userDept = req.query.departmentId || currentUser.department;
    
    const totalKOLs = dbCall(db, 'prepare', 'SELECT COUNT(*) as count FROM kol_profiles WHERE department_id = ? OR department_id IS NULL').get(userDept).count;
    const activeKOLs = dbCall(db, 'prepare', 'SELECT COUNT(*) as count FROM kol_profiles WHERE status_color = ? AND (department_id = ? OR department_id IS NULL)').get('green', userDept).count;
    const pausedKOLs = dbCall(db, 'prepare', 'SELECT COUNT(*) as count FROM kol_profiles WHERE status_color = ? AND (department_id = ? OR department_id IS NULL)').get('yellow', userDept).count;
    const stoppedKOLs = dbCall(db, 'prepare', 'SELECT COUNT(*) as count FROM kol_profiles WHERE status_color = ? AND (department_id = ? OR department_id IS NULL)').get('red', userDept).count;
    
    res.json({
      totalKOLs,
      activeKOLs,
      pausedKOLs,
      stoppedKOLs
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});`;

if (content.match(oldStatsRoute)) {
  content = content.replace(oldStatsRoute, newStatsRoute);
  console.log('  Simplified stats route');
}

console.log('Step 4: Update GET /profiles to remove contract stats...');
// Simplify profiles route - remove contract-related stats
const oldProfilesRoute = /const profilesWithStats = profiles\.map\(profile => \{[\s\S]*?\}\);/;
const newProfilesRoute = `const profilesWithStats = profiles;`;

if (content.match(oldProfilesRoute)) {
  content = content.replace(oldProfilesRoute, newProfilesRoute);
  console.log('  Simplified profiles route');
}

console.log('Step 5: Simplify GET /profiles/:id...');
// Remove contract and payment queries from profile details
const oldProfileDetails = /const contracts = dbCall[\s\S]*?const payments = dbCall[\s\S]*?\)\).all\(id\);/;
if (content.match(oldProfileDetails)) {
  content = content.replace(oldProfileDetails, '');
  console.log('  Removed contract and payment queries from profile details');
}

const oldProfileDetailsResponse = /res\.json\(\{ profile, contracts, payments \}\);/;
const newProfileDetailsResponse = 'res.json({ profile });';
if (content.match(oldProfileDetailsResponse)) {
  content = content.replace(oldProfileDetailsResponse, newProfileDetailsResponse);
  console.log('  Simplified profile details response');
}

console.log('Step 6: Simplify Excel export...');
// Simplify Excel export to only include profile data
const oldExportQuery = /SELECT p\.facebook_id[\s\S]*?ORDER BY p\.updated_at DESC/;
const newExportQuery = 'SELECT * FROM kol_profiles ORDER BY updated_at DESC';

if (content.match(oldExportQuery)) {
  content = content.replace(oldExportQuery, newExportQuery);
  console.log('  Simplified Excel export query');
}

console.log('Step 7: Simplify Excel import...');
// Remove contract creation from Excel import
const contractInsertPattern = /if \(row\.salaryAmount\) \{[\s\S]*?INSERT INTO kol_contracts[\s\S]*?\}\)/g;
if (content.match(contractInsertPattern)) {
  content = content.replace(contractInsertPattern, '');
  console.log('  Removed contract creation from Excel import');
}

console.log('\nStep 8: Write updated file...');
fs.writeFileSync(filePath, content, 'utf8');

console.log('\n=== Refactor Complete ===');
console.log('KOL API is now in weekly mode');
console.log('Removed: contract routes, payment routes');
console.log('Simplified: stats, profiles, Excel import/export');
