const Database = require('./node_modules/better-sqlite3');
const bcrypt = require('bcrypt');

const db = new Database('/app/data/taskflow.db');

console.log('Checking user password hash...');
const user = db.prepare('SELECT id, username, password FROM users WHERE username = ?').get('canris');

if (!user) {
    console.log('ERROR: User not found');
    process.exit(1);
}

console.log('User ID:', user.id);
console.log('Username:', user.username);
console.log('Password hash:', user.password);
console.log('Hash length:', user.password ? user.password.length : 0);
console.log('Hash starts with $2b$:', user.password ? user.password.startsWith('$2b$') : false);

// Test password verification
bcrypt.compare('kico123123', user.password).then(isValid => {
    console.log('Password verification result:', isValid);
    db.close();
    if (!isValid) {
        console.log('ERROR: Password verification failed');
        process.exit(1);
    }
    console.log('SUCCESS: Password hash is valid');
}).catch(err => {
    console.error('ERROR: Password verification error:', err.message);
    db.close();
    process.exit(1);
});
