const fs = require('fs');

console.log('=== Fix KOL GET /profiles - Add Department Filter ===');

try {
  const kolPath = '/app/dist/routes/kol.js';
  let content = fs.readFileSync(kolPath, 'utf8');
  
  // Replace the query initialization
  const oldQuery = "let query = 'SELECT * FROM kol_profiles WHERE 1=1';\n    const params = [];";
  const newQuery = `const userDept = req.query.departmentId || currentUser.department;
    let query = 'SELECT * FROM kol_profiles WHERE (department_id = ? OR department_id IS NULL)';
    const params = [userDept];`;
  
  if (content.includes(oldQuery)) {
    content = content.replace(oldQuery, newQuery);
    console.log('SUCCESS: Fixed GET /profiles query');
  } else {
    console.log('WARNING: Pattern not found, trying alternative...');
    
    // Try with different line endings
    const altOldQuery = "let query = 'SELECT * FROM kol_profiles WHERE 1=1';";
    if (content.includes(altOldQuery)) {
      content = content.replace(
        altOldQuery,
        `const userDept = req.query.departmentId || currentUser.department;
    let query = 'SELECT * FROM kol_profiles WHERE (department_id = ? OR department_id IS NULL)';`
      );
      
      // Also fix params initialization
      content = content.replace(
        "const params = [];",
        "const params = [userDept];"
      );
      console.log('SUCCESS: Fixed with alternative pattern');
    }
  }
  
  fs.writeFileSync(kolPath, content, 'utf8');
  console.log('\n=== Done ===');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
