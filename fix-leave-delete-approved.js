const fs = require('fs');

console.log('=== Fixing Leave Delete to Allow Approved Leaves ===');

const filePath = '/app/dist/routes/leaves.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Original file size:', content.length, 'bytes');

// Find and replace the delete route logic
// Current: Only owner can cancel their own pending/conflict leaves
// New: Owner can cancel any of their leaves, BOSS/MANAGER can cancel any leaves

const oldPattern = /\/\/ Only owner can cancel their own pending\/conflict leaves[\s\S]*?if \(leave\.user_id !== currentUser\.id\) \{[\s\S]*?return res\.status\(403\)\.json\(\{ error: 'Permission denied' \}\);[\s\S]*?\}/;

const newLogic = `// Check permission: owner can cancel their own leaves, BOSS/MANAGER can cancel any leaves
    const isOwner = leave.user_id === currentUser.id;
    const isBossOrManager = currentUser.role === 'BOSS' || currentUser.role === 'MANAGER';
    
    if (!isOwner && !isBossOrManager) {
      return res.status(403).json({ error: 'Permission denied' });
    }`;

if (oldPattern.test(content)) {
    content = content.replace(oldPattern, newLogic);
    console.log('+ Updated delete permission logic');
} else {
    console.log('! Pattern not found, trying alternative pattern...');
    
    // Alternative pattern - just the permission check
    const altPattern = /if \(leave\.user_id !== currentUser\.id\) \{[\s\S]*?return res\.status\(403\)\.json\(\{ error: 'Permission denied' \}\);[\s\S]*?\}/;
    
    if (altPattern.test(content)) {
        content = content.replace(altPattern, `const isOwner = leave.user_id === currentUser.id;
    const isBossOrManager = currentUser.role === 'BOSS' || currentUser.role === 'MANAGER';
    
    if (!isOwner && !isBossOrManager) {
      return res.status(403).json({ error: 'Permission denied' });
    }`);
        console.log('+ Updated delete permission logic (alternative pattern)');
    } else {
        console.log('x Failed to find permission check pattern');
    }
}

fs.writeFileSync(filePath, content, 'utf8');

console.log('Modified file size:', content.length, 'bytes');
console.log('SUCCESS: Leave delete logic updated');
console.log('\nChanges:');
console.log('- Owner can now cancel their own leaves (any status)');
console.log('- BOSS/MANAGER can cancel any leaves');
