const DatabaseV2 = require('./dist/database-v2');
const db = new DatabaseV2.SecureDatabase();

async function run() {
    try {
        await db.initialize();
        const users = await db.allAsync("SELECT id, name FROM users WHERE name LIKE '%主管%'");
        console.log('--- USER INFO ---');
        console.log(JSON.stringify(users, null, 2));
        
        if (users.length > 0) {
            const userId = users[0].id;
            const records = await db.allAsync("SELECT * FROM attendance_records WHERE user_id = ? ORDER BY clock_in DESC LIMIT 5", [userId]);
            console.log('--- RECENT RECORDS ---');
            console.log(JSON.stringify(records, null, 2));
            
            const open = await db.allAsync("SELECT * FROM attendance_records WHERE user_id = ? AND clock_out IS NULL", [userId]);
            console.log('--- OPEN SESSIONS ---');
            console.log(JSON.stringify(open, null, 2));
        }
    } catch (e) {
        console.error('DIAG ERROR:', e.message);
    } finally {
        await db.close();
    }
}
run();
