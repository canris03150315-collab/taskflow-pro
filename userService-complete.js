const Database = require('better-sqlite3');

class UserService {
  constructor(dbPath) {
    this.db = new Database(dbPath);
  }

  getAllUsers() {
    return this.db.prepare('SELECT * FROM users').all();
  }

  getUserById(id) {
    return this.db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  }

  getUserByUsername(username) {
    return this.db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  }

  createUser(userData) {
    const { id, username, password, name, department_id, role } = userData;
    const now = new Date().toISOString();
    this.db.prepare('INSERT INTO users (id, username, password, name, department_id, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, username, password, name, department_id, role, now);
    return this.getUserById(id);
  }

  updateUser(id, userData) {
    const { name, department_id, role, password } = userData;
    if (password) {
      this.db.prepare('UPDATE users SET name = ?, department_id = ?, role = ?, password = ? WHERE id = ?').run(name, department_id, role, password, id);
    } else {
      this.db.prepare('UPDATE users SET name = ?, department_id = ?, role = ? WHERE id = ?').run(name, department_id, role, id);
    }
    return this.getUserById(id);
  }

  deleteUser(id) {
    this.db.prepare('DELETE FROM users WHERE id = ?').run(id);
  }
}

module.exports = UserService;
