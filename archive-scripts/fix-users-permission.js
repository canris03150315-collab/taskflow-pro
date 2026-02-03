const fs = require('fs');

console.log('Fixing users API permission for EMPLOYEE...');

try {
  const usersPath = '/app/dist/routes/users.js';
  let content = fs.readFileSync(usersPath, 'utf8');
  
  // Current: requireRole([BOSS, MANAGER, SUPERVISOR])
  // Need: Allow EMPLOYEE to get users in their department
  
  // Find and replace the middleware chain
  const oldMiddleware = "(0, auth_1.requireRole)([types_1.Role.BOSS, types_1.Role.MANAGER, types_1.Role.SUPERVISOR])";
  
  if (content.includes(oldMiddleware)) {
    // Remove the requireRole middleware for GET /users
    // Instead, we'll handle permission in the route handler
    
    const oldRouterGet = "router.get('/', auth_1.authenticateToken, (0, auth_1.requireRole)([types_1.Role.BOSS, types_1.Role.MANAGER, types_1.Role.SUPERVISOR]), async (req, res) => {";
    
    const newRouterGet = "router.get('/', auth_1.authenticateToken, async (req, res) => {";
    
    if (content.includes(oldRouterGet)) {
      content = content.replace(oldRouterGet, newRouterGet);
      
      // Also need to add department filtering for EMPLOYEE
      const oldQueryPart = "let query = 'SELECT id, name, role, department, avatar, username, permissions, created_at, updated_at FROM users';";
      const oldParamsPart = "let params = [];";
      
      const newQueryLogic = `let query = 'SELECT id, name, role, department, avatar, username, permissions, created_at, updated_at FROM users';
        let params = [];
        
        // EMPLOYEE can only see users in their own department
        if (currentUser.role === 'EMPLOYEE') {
            query += ' WHERE department = ?';
            params.push(currentUser.department);
        }`;
      
      content = content.replace(oldQueryPart + "\\n" + "        " + oldParamsPart, newQueryLogic);
      
      // Try simpler replacement
      content = content.replace(
        "let query = 'SELECT id, name, role, department, avatar, username, permissions, created_at, updated_at FROM users';\n        let params = [];",
        newQueryLogic
      );
      
      fs.writeFileSync(usersPath, content, 'utf8');
      console.log('SUCCESS: Users API permission fixed');
      console.log('EMPLOYEE can now get users in their department');
    } else {
      console.log('Router pattern not found exactly');
    }
  } else {
    console.log('requireRole middleware not found');
    
    // Check if already fixed
    if (content.includes("currentUser.role === 'EMPLOYEE'")) {
      console.log('Already fixed!');
    }
  }
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
