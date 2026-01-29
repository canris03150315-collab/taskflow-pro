# 代碼解耦合指南

## 🔴 什麼是代碼耦合度高？

**現象**：
- 修改一個功能，其他功能出問題
- 代碼互相依賴，難以獨立修改
- 一個文件改動，需要修改多個文件
- 測試困難，無法單獨測試某個功能

**常見耦合問題**：
1. 直接操作資料庫（沒有抽象層）
2. 共用全局變數
3. 組件之間直接依賴
4. 業務邏輯散落各處
5. 沒有明確的模塊邊界

---

## 🎯 解耦合的核心原則

### 1. 單一職責原則（SRP）
每個模塊/函數只做一件事

### 2. 依賴倒置原則（DIP）
依賴抽象，不依賴具體實現

### 3. 接口隔離原則（ISP）
使用小而專注的接口

### 4. 開閉原則（OCP）
對擴展開放，對修改關閉

---

## 🔧 具體解耦合方案

### 方案 1：引入服務層（Service Layer）

**問題**：API 路由直接操作資料庫

```javascript
// ❌ 耦合度高：路由直接操作資料庫
app.get('/api/users', (req, res) => {
  const db = new Database('/app/data/taskflow.db');
  const users = db.prepare('SELECT * FROM users').all();
  db.close();
  res.json(users);
});

app.post('/api/users', (req, res) => {
  const db = new Database('/app/data/taskflow.db');
  db.prepare('INSERT INTO users ...').run(...);
  db.close();
  res.json({ success: true });
});
```

**解決**：引入服務層

```javascript
// ✅ 解耦合：創建服務層
// services/userService.js
class UserService {
  constructor(db) {
    this.db = db;
  }

  getAllUsers() {
    return this.db.prepare('SELECT * FROM users').all();
  }

  createUser(userData) {
    return this.db.prepare('INSERT INTO users ...').run(userData);
  }

  getUserById(id) {
    return this.db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  }

  updateUser(id, userData) {
    return this.db.prepare('UPDATE users SET ... WHERE id = ?').run(userData, id);
  }

  deleteUser(id) {
    return this.db.prepare('DELETE FROM users WHERE id = ?').run(id);
  }
}

// routes/users.js
const userService = new UserService(db);

app.get('/api/users', (req, res) => {
  const users = userService.getAllUsers();
  res.json(users);
});

app.post('/api/users', (req, res) => {
  const user = userService.createUser(req.body);
  res.json(user);
});
```

**優點**：
- 業務邏輯集中在服務層
- 路由只負責處理 HTTP 請求
- 容易測試（可以單獨測試服務層）
- 容易重用（其他地方也可以使用服務）

---

### 方案 2：使用依賴注入（Dependency Injection）

**問題**：硬編碼依賴

```javascript
// ❌ 耦合度高：硬編碼資料庫路徑
class UserService {
  getAllUsers() {
    const db = new Database('/app/data/taskflow.db'); // 硬編碼
    const users = db.prepare('SELECT * FROM users').all();
    db.close();
    return users;
  }
}
```

**解決**：注入依賴

```javascript
// ✅ 解耦合：注入資料庫依賴
class UserService {
  constructor(database) {
    this.db = database; // 依賴注入
  }

  getAllUsers() {
    return this.db.prepare('SELECT * FROM users').all();
  }
}

// 使用時注入依賴
const db = new Database('/app/data/taskflow.db');
const userService = new UserService(db);
```

**優點**：
- 容易切換實現（例如切換資料庫）
- 容易測試（可以注入 mock 資料庫）
- 減少硬編碼

---

### 方案 3：提取共用邏輯

**問題**：重複的代碼散落各處

```javascript
// ❌ 耦合度高：重複的驗證邏輯
app.post('/api/users', (req, res) => {
  if (!req.body.username || req.body.username.length < 3) {
    return res.status(400).json({ error: '用戶名太短' });
  }
  if (!req.body.password || req.body.password.length < 6) {
    return res.status(400).json({ error: '密碼太短' });
  }
  // 創建用戶...
});

app.put('/api/users/:id', (req, res) => {
  if (!req.body.username || req.body.username.length < 3) {
    return res.status(400).json({ error: '用戶名太短' });
  }
  if (!req.body.password || req.body.password.length < 6) {
    return res.status(400).json({ error: '密碼太短' });
  }
  // 更新用戶...
});
```

**解決**：提取驗證邏輯

```javascript
// ✅ 解耦合：提取驗證邏輯
// validators/userValidator.js
class UserValidator {
  static validateUsername(username) {
    if (!username || username.length < 3) {
      throw new Error('用戶名太短');
    }
  }

  static validatePassword(password) {
    if (!password || password.length < 6) {
      throw new Error('密碼太短');
    }
  }

  static validateUser(userData) {
    this.validateUsername(userData.username);
    this.validatePassword(userData.password);
  }
}

// routes/users.js
app.post('/api/users', (req, res) => {
  try {
    UserValidator.validateUser(req.body);
    const user = userService.createUser(req.body);
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

**優點**：
- 驗證邏輯集中管理
- 容易修改和維護
- 可重用

---

### 方案 4：使用事件驅動架構

**問題**：功能之間直接調用

```javascript
// ❌ 耦合度高：創建用戶時直接調用其他功能
app.post('/api/users', (req, res) => {
  const user = userService.createUser(req.body);
  
  // 直接調用其他功能
  emailService.sendWelcomeEmail(user.email);
  auditService.logUserCreation(user.id);
  notificationService.notifyAdmins(user);
  
  res.json(user);
});
```

**解決**：使用事件系統

```javascript
// ✅ 解耦合：使用事件
const EventEmitter = require('events');
const eventBus = new EventEmitter();

// 發布事件
app.post('/api/users', (req, res) => {
  const user = userService.createUser(req.body);
  
  // 發布事件，不直接調用
  eventBus.emit('user.created', user);
  
  res.json(user);
});

// 訂閱事件
eventBus.on('user.created', (user) => {
  emailService.sendWelcomeEmail(user.email);
});

eventBus.on('user.created', (user) => {
  auditService.logUserCreation(user.id);
});

eventBus.on('user.created', (user) => {
  notificationService.notifyAdmins(user);
});
```

**優點**：
- 功能之間鬆耦合
- 容易添加新功能（只需訂閱事件）
- 容易移除功能（取消訂閱）

---

### 方案 5：前端組件解耦合

**問題**：組件之間直接依賴

```typescript
// ❌ 耦合度高：組件直接依賴
// UserList.tsx
function UserList() {
  const [users, setUsers] = useState([]);
  
  useEffect(() => {
    // 直接調用 API
    fetch('/api/users')
      .then(res => res.json())
      .then(data => setUsers(data));
  }, []);
  
  return <div>{users.map(user => <UserCard user={user} />)}</div>;
}

// UserCard.tsx
function UserCard({ user }) {
  const handleDelete = () => {
    // 直接調用 API
    fetch(`/api/users/${user.id}`, { method: 'DELETE' })
      .then(() => {
        // 如何通知 UserList 更新？
        // 這裡就會產生耦合問題
      });
  };
  
  return <div>{user.name} <button onClick={handleDelete}>刪除</button></div>;
}
```

**解決**：使用狀態管理和自定義 Hook

```typescript
// ✅ 解耦合：使用自定義 Hook
// hooks/useUsers.ts
function useUsers() {
  const [users, setUsers] = useState([]);
  
  const fetchUsers = async () => {
    const response = await fetch('/api/users');
    const data = await response.json();
    setUsers(data);
  };
  
  const deleteUser = async (id) => {
    await fetch(`/api/users/${id}`, { method: 'DELETE' });
    await fetchUsers(); // 自動重新獲取
  };
  
  useEffect(() => {
    fetchUsers();
  }, []);
  
  return { users, deleteUser, refreshUsers: fetchUsers };
}

// UserList.tsx
function UserList() {
  const { users, deleteUser } = useUsers();
  
  return (
    <div>
      {users.map(user => (
        <UserCard key={user.id} user={user} onDelete={deleteUser} />
      ))}
    </div>
  );
}

// UserCard.tsx
function UserCard({ user, onDelete }) {
  return (
    <div>
      {user.name}
      <button onClick={() => onDelete(user.id)}>刪除</button>
    </div>
  );
}
```

**優點**：
- 組件之間鬆耦合
- 邏輯集中在 Hook 中
- 容易重用和測試

---

## 📋 實施步驟

### 階段 1：識別耦合點（本週）

1. **列出高耦合的代碼**
   - 哪些代碼修改時會影響多處？
   - 哪些邏輯重複出現？
   - 哪些功能難以測試？

2. **繪製依賴關係圖**
   - 哪些模塊依賴哪些模塊？
   - 是否有循環依賴？

3. **優先級排序**
   - 哪些耦合問題最嚴重？
   - 哪些最容易解決？

### 階段 2：逐步重構（本月）

1. **從小處開始**
   - 先重構小的、獨立的模塊
   - 不要一次重構太多

2. **提取服務層**
   - 將業務邏輯從路由中提取出來
   - 創建專門的服務類

3. **提取共用邏輯**
   - 識別重複代碼
   - 提取為共用函數或類

4. **引入依賴注入**
   - 減少硬編碼
   - 提高可測試性

### 階段 3：建立規範（持續）

1. **代碼審查**
   - 新代碼必須遵循解耦合原則
   - 定期審查現有代碼

2. **文檔化**
   - 記錄架構決策
   - 更新開發規範

3. **持續改進**
   - 定期重構
   - 保持代碼質量

---

## 🎯 針對 TaskFlow Pro 的具體建議

### 1. 後端重構優先級

**高優先級**：
```
1. 提取用戶服務（UserService）
2. 提取打卡服務（AttendanceService）
3. 提取工作報表服務（WorkLogService）
```

**中優先級**：
```
4. 提取公告服務（AnnouncementService）
5. 提取任務服務（TaskService）
6. 提取 KOL 服務（KOLService）
```

### 2. 前端重構優先級

**高優先級**：
```
1. 創建 API 客戶端層（統一 API 調用）
2. 提取自定義 Hook（useUsers, useAttendance 等）
3. 創建共用組件庫
```

**中優先級**：
```
4. 引入狀態管理（如果需要）
5. 提取業務邏輯到 Hook
6. 優化組件結構
```

### 3. 創建服務層示例

```javascript
// services/index.js
const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

// 導出所有服務
module.exports = {
  userService: require('./userService')(db),
  attendanceService: require('./attendanceService')(db),
  workLogService: require('./workLogService')(db),
  announcementService: require('./announcementService')(db),
  taskService: require('./taskService')(db),
};

// services/userService.js
module.exports = (db) => {
  return {
    getAllUsers() {
      return db.prepare('SELECT * FROM users').all();
    },
    
    getUserById(id) {
      return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    },
    
    createUser(userData) {
      const id = generateId();
      db.prepare(`
        INSERT INTO users (id, username, password, name, department_id, role)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, userData.username, userData.password, userData.name, 
             userData.department_id, userData.role);
      return this.getUserById(id);
    },
    
    updateUser(id, userData) {
      db.prepare(`
        UPDATE users 
        SET name = ?, department_id = ?, role = ?
        WHERE id = ?
      `).run(userData.name, userData.department_id, userData.role, id);
      return this.getUserById(id);
    },
    
    deleteUser(id) {
      db.prepare('DELETE FROM users WHERE id = ?').run(id);
    }
  };
};

// routes/users.js
const { userService } = require('../services');

router.get('/api/users', (req, res) => {
  try {
    const users = userService.getAllUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/users', (req, res) => {
  try {
    const user = userService.createUser(req.body);
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

---

## 💡 重構最佳實踐

### 1. 小步重構
```
❌ 一次重構整個系統
✅ 每次重構一個小模塊
```

### 2. 保持功能不變
```
❌ 重構時添加新功能
✅ 重構只改結構，不改功能
```

### 3. 測試驅動
```
❌ 重構後才測試
✅ 重構前後都測試，確保功能一致
```

### 4. 漸進式改進
```
❌ 追求完美架構
✅ 逐步改進，持續優化
```

### 5. 記錄決策
```
❌ 只改代碼
✅ 記錄為什麼這樣改，方便後續維護
```

---

## 🔴 常見錯誤

### 錯誤 1：過度設計
```
問題：引入太多抽象層，代碼變得複雜
解決：只在需要時抽象，不要過度設計
```

### 錯誤 2：一次改太多
```
問題：大規模重構導致系統不穩定
解決：小步重構，每次只改一個模塊
```

### 錯誤 3：沒有測試
```
問題：重構後功能出問題
解決：重構前後都要測試
```

### 錯誤 4：忽略現有代碼
```
問題：新代碼解耦合了，舊代碼還是耦合
解決：逐步重構舊代碼，保持一致性
```

---

## 📊 衡量改進效果

### 指標 1：修改影響範圍
```
改進前：修改一個功能，需要改 5 個文件
改進後：修改一個功能，只需改 1-2 個文件
```

### 指標 2：測試覆蓋率
```
改進前：難以測試，測試覆蓋率低
改進後：容易測試，測試覆蓋率提高
```

### 指標 3：代碼重用性
```
改進前：邏輯重複，難以重用
改進後：邏輯集中，容易重用
```

### 指標 4：開發效率
```
改進前：添加新功能需要理解整個系統
改進後：添加新功能只需理解相關模塊
```

---

## 🎯 立即行動計劃

### 本週
1. ✅ 識別 3 個最耦合的模塊
2. ✅ 為這 3 個模塊創建服務層
3. ✅ 測試重構後的功能

### 本月
1. 🔧 重構所有核心功能的服務層
2. 🔧 提取共用邏輯
3. 🔧 建立代碼規範

### 長期
1. 📦 持續重構
2. 📦 代碼審查
3. 📦 保持代碼質量

---

## 總結

**問題**：代碼耦合度高，修改一處影響多處

**解決方案**：
1. 引入服務層（集中業務邏輯）
2. 使用依賴注入（減少硬編碼）
3. 提取共用邏輯（避免重複）
4. 使用事件驅動（鬆耦合）
5. 前端組件解耦合（使用 Hook）

**實施原則**：
- 小步重構，不要一次改太多
- 保持功能不變，只改結構
- 測試驅動，確保功能正確
- 持續改進，逐步優化

**立即開始**：
1. 識別最耦合的 3 個模塊
2. 為它們創建服務層
3. 測試並驗證

**長期目標**：
- 建立清晰的架構
- 提高代碼質量
- 加快開發速度
- 減少 bug 數量
