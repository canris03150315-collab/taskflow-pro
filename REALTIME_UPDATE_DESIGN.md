# 即時更新功能設計文檔

**日期**: 2026-01-06  
**版本**: v8.9.16  
**狀態**: 設計中

---

## 📋 需求

系統需要即時更新功能，當有任何資料變更時（新增、修改、刪除），所有在線用戶都能立即看到更新，無需手動重新整理頁面。

---

## 🔍 現有架構分析

### 前端 WebSocket 客戶端
**位置**: `utils/websocketClient.ts`

**功能**:
- ✅ 基本 WebSocket 連接管理
- ✅ 自動重連機制（3 秒間隔）
- ✅ 訊息處理器註冊/移除
- ✅ 發送訊息功能

**訊息格式**:
```typescript
{
    type: string;      // 事件類型
    payload: any;      // 事件資料
}
```

### 後端 WebSocket 伺服器
**位置**: `/app/dist/websocket-server.js`

**功能**:
- ✅ WebSocket 伺服器（路徑: `/ws`）
- ✅ 用戶連接管理（userId -> WebSocket）
- ✅ 聊天訊息廣播
- ✅ 新頻道通知

**現有事件類型**:
- `AUTH` - 用戶認證
- `AUTH_SUCCESS` - 認證成功
- `PING/PONG` - 心跳檢測
- `chat_message` - 聊天訊息
- `new_channel` - 新頻道通知

---

## 🎯 設計方案

### 新增事件類型

#### 1. 人員管理事件
```javascript
// 用戶新增
{
    type: 'USER_CREATED',
    payload: {
        user: User,           // 新用戶資料
        timestamp: string
    }
}

// 用戶更新
{
    type: 'USER_UPDATED',
    payload: {
        user: User,           // 更新後的用戶資料
        timestamp: string
    }
}

// 用戶刪除
{
    type: 'USER_DELETED',
    payload: {
        userId: string,       // 被刪除的用戶 ID
        timestamp: string
    }
}
```

#### 2. 任務管理事件
```javascript
// 任務新增
{
    type: 'TASK_CREATED',
    payload: {
        task: Task,           // 新任務資料
        timestamp: string
    }
}

// 任務更新
{
    type: 'TASK_UPDATED',
    payload: {
        task: Task,           // 更新後的任務資料
        timestamp: string
    }
}

// 任務刪除
{
    type: 'TASK_DELETED',
    payload: {
        taskId: string,       // 被刪除的任務 ID
        timestamp: string
    }
}
```

#### 3. 公告系統事件
```javascript
// 公告新增
{
    type: 'BULLETIN_CREATED',
    payload: {
        bulletin: Bulletin,   // 新公告資料
        timestamp: string
    }
}

// 公告更新
{
    type: 'BULLETIN_UPDATED',
    payload: {
        bulletin: Bulletin,   // 更新後的公告資料
        timestamp: string
    }
}

// 公告刪除
{
    type: 'BULLETIN_DELETED',
    payload: {
        bulletinId: string,   // 被刪除的公告 ID
        timestamp: string
    }
}
```

#### 4. 財務管理事件
```javascript
// 財務記錄新增
{
    type: 'FINANCE_CREATED',
    payload: {
        finance: Finance,     // 新財務記錄
        timestamp: string
    }
}

// 財務記錄更新
{
    type: 'FINANCE_UPDATED',
    payload: {
        finance: Finance,     // 更新後的財務記錄
        timestamp: string
    }
}

// 財務記錄刪除
{
    type: 'FINANCE_DELETED',
    payload: {
        financeId: string,    // 被刪除的財務記錄 ID
        timestamp: string
    }
}
```

#### 5. 部門管理事件
```javascript
// 部門新增
{
    type: 'DEPARTMENT_CREATED',
    payload: {
        department: Department,
        timestamp: string
    }
}

// 部門更新
{
    type: 'DEPARTMENT_UPDATED',
    payload: {
        department: Department,
        timestamp: string
    }
}

// 部門刪除
{
    type: 'DEPARTMENT_DELETED',
    payload: {
        departmentId: string,
        timestamp: string
    }
}
```

#### 6. SOP 文檔事件
```javascript
// SOP 新增
{
    type: 'SOP_CREATED',
    payload: {
        sop: SOP,
        timestamp: string
    }
}

// SOP 更新
{
    type: 'SOP_UPDATED',
    payload: {
        sop: SOP,
        timestamp: string
    }
}

// SOP 刪除
{
    type: 'SOP_DELETED',
    payload: {
        sopId: string,
        timestamp: string
    }
}
```

#### 7. 備忘錄事件
```javascript
// 備忘錄新增
{
    type: 'MEMO_CREATED',
    payload: {
        memo: Memo,
        timestamp: string
    }
}

// 備忘錄更新
{
    type: 'MEMO_UPDATED',
    payload: {
        memo: Memo,
        timestamp: string
    }
}

// 備忘錄刪除
{
    type: 'MEMO_DELETED',
    payload: {
        memoId: string,
        timestamp: string
    }
}
```

---

## 🔧 實施計劃

### 階段 1: 後端擴展

#### 1.1 修改 WebSocket 伺服器
**文件**: `/app/dist/websocket-server.js`

**新增功能**:
```javascript
// 廣播到所有連接的用戶
broadcastToAll(type, payload) {
    const message = JSON.stringify({ type, payload });
    let sentCount = 0;
    
    this.clients.forEach((client, userId) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
            sentCount++;
        }
    });
    
    console.log(`廣播 ${type} 到 ${sentCount} 個用戶`);
}

// 廣播到特定用戶列表
broadcastToUsers(userIds, type, payload) {
    const message = JSON.stringify({ type, payload });
    let sentCount = 0;
    
    userIds.forEach(userId => {
        const client = this.clients.get(userId);
        if (client && client.readyState === WebSocket.OPEN) {
            client.send(message);
            sentCount++;
        }
    });
    
    console.log(`廣播 ${type} 到 ${sentCount}/${userIds.length} 個用戶`);
}
```

#### 1.2 在各 API 路由中發送事件

**users.js** - 人員管理:
```javascript
// POST /api/users - 新增用戶後
if (req.wsServer) {
    req.wsServer.broadcastToAll('USER_CREATED', {
        user: newUser,
        timestamp: new Date().toISOString()
    });
}

// PUT /api/users/:id - 更新用戶後
if (req.wsServer) {
    req.wsServer.broadcastToAll('USER_UPDATED', {
        user: updatedUser,
        timestamp: new Date().toISOString()
    });
}

// DELETE /api/users/:id - 刪除用戶後
if (req.wsServer) {
    req.wsServer.broadcastToAll('USER_DELETED', {
        userId: id,
        timestamp: new Date().toISOString()
    });
}
```

**tasks.js** - 任務管理:
```javascript
// POST /api/tasks
if (req.wsServer) {
    req.wsServer.broadcastToAll('TASK_CREATED', {
        task: newTask,
        timestamp: new Date().toISOString()
    });
}

// PUT /api/tasks/:id
if (req.wsServer) {
    req.wsServer.broadcastToAll('TASK_UPDATED', {
        task: updatedTask,
        timestamp: new Date().toISOString()
    });
}

// DELETE /api/tasks/:id
if (req.wsServer) {
    req.wsServer.broadcastToAll('TASK_DELETED', {
        taskId: id,
        timestamp: new Date().toISOString()
    });
}
```

**bulletins.js** - 公告系統:
```javascript
// 類似的模式應用到公告的 POST, PUT, DELETE
```

**finance.js** - 財務管理:
```javascript
// 類似的模式應用到財務的 POST, PUT, DELETE
```

**departments.js** - 部門管理:
```javascript
// 類似的模式應用到部門的 POST, PUT, DELETE
```

**sops.js** - SOP 文檔:
```javascript
// 類似的模式應用到 SOP 的 POST, PUT, DELETE
```

**memos.js** - 備忘錄:
```javascript
// 類似的模式應用到備忘錄的 POST, PUT, DELETE
```

#### 1.3 在 server.js 中注入 wsServer
```javascript
// 在中間件中注入 wsServer
app.use((req, res, next) => {
    req.wsServer = wsServer;
    next();
});
```

---

### 階段 2: 前端監聽

#### 2.1 修改各 View 組件

**PersonnelView.tsx** - 人員管理:
```typescript
useEffect(() => {
    const handleUserUpdate = (msg: WebSocketMessage) => {
        if (msg.type === 'USER_CREATED' || msg.type === 'USER_UPDATED') {
            // 重新獲取用戶列表
            loadUsers();
        } else if (msg.type === 'USER_DELETED') {
            // 從列表中移除用戶
            setUsers(prev => prev.filter(u => u.id !== msg.payload.userId));
        }
    };
    
    wsClient?.addMessageHandler(handleUserUpdate);
    return () => wsClient?.removeMessageHandler(handleUserUpdate);
}, [wsClient]);
```

**DashboardView.tsx** - 任務管理:
```typescript
useEffect(() => {
    const handleTaskUpdate = (msg: WebSocketMessage) => {
        if (msg.type === 'TASK_CREATED' || msg.type === 'TASK_UPDATED') {
            loadTasks();
        } else if (msg.type === 'TASK_DELETED') {
            setTasks(prev => prev.filter(t => t.id !== msg.payload.taskId));
        }
    };
    
    wsClient?.addMessageHandler(handleTaskUpdate);
    return () => wsClient?.removeMessageHandler(handleTaskUpdate);
}, [wsClient]);
```

**BulletinView.tsx** - 公告系統:
```typescript
useEffect(() => {
    const handleBulletinUpdate = (msg: WebSocketMessage) => {
        if (msg.type === 'BULLETIN_CREATED' || msg.type === 'BULLETIN_UPDATED') {
            loadBulletins();
        } else if (msg.type === 'BULLETIN_DELETED') {
            setBulletins(prev => prev.filter(b => b.id !== msg.payload.bulletinId));
        }
    };
    
    wsClient?.addMessageHandler(handleBulletinUpdate);
    return () => wsClient?.removeMessageHandler(handleBulletinUpdate);
}, [wsClient]);
```

**FinanceView.tsx** - 財務管理:
```typescript
useEffect(() => {
    const handleFinanceUpdate = (msg: WebSocketMessage) => {
        if (msg.type === 'FINANCE_CREATED' || msg.type === 'FINANCE_UPDATED') {
            loadFinanceRecords();
        } else if (msg.type === 'FINANCE_DELETED') {
            setRecords(prev => prev.filter(r => r.id !== msg.payload.financeId));
        }
    };
    
    wsClient?.addMessageHandler(handleFinanceUpdate);
    return () => wsClient?.removeMessageHandler(handleFinanceUpdate);
}, [wsClient]);
```

**類似的模式應用到**:
- DepartmentDataView.tsx
- SOPView.tsx
- MemoView.tsx

---

## 🎨 優化策略

### 1. 防抖動（Debounce）
避免短時間內多次重新獲取資料：
```typescript
const debouncedLoad = useMemo(
    () => debounce(() => loadData(), 500),
    []
);

useEffect(() => {
    const handler = (msg: WebSocketMessage) => {
        if (msg.type === 'DATA_UPDATED') {
            debouncedLoad();
        }
    };
    wsClient?.addMessageHandler(handler);
    return () => wsClient?.removeMessageHandler(handler);
}, [wsClient, debouncedLoad]);
```

### 2. 選擇性更新
只更新變更的項目，而不是重新獲取整個列表：
```typescript
if (msg.type === 'USER_UPDATED') {
    setUsers(prev => prev.map(u => 
        u.id === msg.payload.user.id ? msg.payload.user : u
    ));
}
```

### 3. 權限過濾
只廣播給有權限查看的用戶：
```javascript
// 後端根據權限過濾用戶列表
const authorizedUsers = getAllAuthorizedUsers(resourceType);
req.wsServer.broadcastToUsers(authorizedUsers, eventType, payload);
```

---

## 📊 測試計劃

### 1. 單用戶測試
- [ ] 新增資料後自動顯示
- [ ] 修改資料後自動更新
- [ ] 刪除資料後自動移除

### 2. 多用戶測試
- [ ] 用戶 A 新增，用戶 B 立即看到
- [ ] 用戶 A 修改，用戶 B 立即看到更新
- [ ] 用戶 A 刪除，用戶 B 立即看到移除

### 3. 斷線重連測試
- [ ] 斷線後自動重連
- [ ] 重連後同步最新資料
- [ ] 斷線期間的變更在重連後顯示

### 4. 效能測試
- [ ] 10 個用戶同時在線
- [ ] 50 個用戶同時在線
- [ ] 100 個用戶同時在線

---

## 🔐 安全考量

### 1. 認證
- ✅ WebSocket 連接需要 token 認證
- ✅ 只有認證用戶才能接收事件

### 2. 權限
- ⚠️ 需要實施權限過濾（未來改進）
- ⚠️ 敏感資料不應廣播給無權限用戶

### 3. 資料驗證
- ✅ 所有事件資料都經過後端驗證
- ✅ 前端只接收已驗證的資料

---

## 📝 實施順序

1. ✅ 創建快照（v8.9.15-before-realtime-update）
2. ⏳ 修改後端 WebSocket 伺服器
3. ⏳ 修改後端 API 路由（users, tasks, bulletins）
4. ⏳ 修改前端 View 組件（PersonnelView, DashboardView, BulletinView）
5. ⏳ 測試基本功能
6. ⏳ 擴展到其他模組（finance, departments, sops, memos）
7. ⏳ 完整測試
8. ⏳ 部署後端
9. ⏳ 部署前端
10. ⏳ 創建最終快照（v8.9.16-realtime-update-complete）

---

## 🎯 預期效果

### 修改前
- ❌ 需要手動重新整理頁面
- ❌ 多用戶協作時看不到其他人的變更
- ❌ 資料不同步

### 修改後
- ✅ 自動即時更新
- ✅ 多用戶協作即時同步
- ✅ 資料始終保持最新

---

**最後更新**: 2026-01-06  
**作者**: Cascade AI
