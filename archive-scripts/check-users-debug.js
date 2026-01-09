const DatabaseV2 = require('./dist/database-v2');
const db = new DatabaseV2.SecureDatabase();
async function run() {
    await db.initialize();
    const users = await db.allAsync("SELECT id, name, username, role FROM users");
    console.log('USERS_START');
    console.log(JSON.stringify(users, null, 2));
    console.log('USERS_END');
    await db.close();
}
run();
