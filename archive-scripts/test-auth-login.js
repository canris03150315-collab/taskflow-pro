const Database = require('./node_modules/better-sqlite3');
const bcrypt = require('bcrypt');

async function testLogin() {
    try {
        const db = new Database('/app/data/taskflow.db');
        
        const username = 'canris';
        const password = 'kico123123';
        
        console.log('1. Fetching user...');
        const userRow = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        
        if (!userRow) {
            console.log('User not found');
            return;
        }
        
        console.log('2. User found:', userRow.id, userRow.name);
        console.log('3. Verifying password...');
        
        const isValid = await bcrypt.compare(password, userRow.password);
        console.log('4. Password valid:', isValid);
        
        db.close();
        console.log('SUCCESS: Login test completed');
    } catch (error) {
        console.error('ERROR:', error.message);
        console.error(error.stack);
    }
}

testLogin();
