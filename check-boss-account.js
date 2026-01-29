const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Checking BOSS Account ===\n');

// Check BOSS users
const bossUsers = db.prepare('SELECT id, username, name, role, department FROM users WHERE role = ?').all('BOSS');

console.log('BOSS Users:');
bossUsers.forEach(user => {
    console.log(`- ID: ${user.id}`);
    console.log(`  Username: ${user.username}`);
    console.log(`  Name: ${user.name}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Department: ${user.department}\n`);
});

// Check if there's a user named 'Seven' with BOSS role
const sevenUser = db.prepare('SELECT id, username, name, role, department FROM users WHERE name = ?').get('Seven');
if (sevenUser) {
    console.log('User "Seven":');
    console.log(`- ID: ${sevenUser.id}`);
    console.log(`  Username: ${sevenUser.username}`);
    console.log(`  Role: ${sevenUser.role}`);
    console.log(`  Department: ${sevenUser.department}`);
}

db.close();
