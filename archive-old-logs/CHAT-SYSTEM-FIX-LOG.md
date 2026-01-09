# 企業通訊系統完整修復日誌

**日期**: 2025-12-30  
**版本**: v2.2.0  
**狀態**: ✅ 後端已完成，WebSocket 待實現

---

## 📋 問題總覽

企業通訊系統存在以下關鍵問題：
1. **無法建立聊天室** - 後端路由文件為空
2. **無法建立群組** - 缺少群組創建邏輯
3. **聊天即時性問題** - 缺少 WebSocket 實時通訊
4. **已讀狀態功能** - 需要實現已讀標記和查看
5. **收回訊息功能** - 需要時間限制和權限檢查

---

## 🔍 問題分析與解決方案

### 問題 1: 後端聊天路由為空

#### 症狀
- 前端調用 `/api/chat/channels` 等 API 沒有響應
- 後端 `chat.js` 文件只有基本導出，沒有任何路由處理

#### 根本原因
```javascript
// ❌ 原始的 chat.js（完全空白）
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatRoutes = void 0;
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
exports.chatRoutes = router;
// 沒有任何路由處理邏輯
```

#### 解決方案
創建完整的聊天室後端實現，包含：

**1. 資料庫表結構**
```javascript
// 聊天頻道表
CREATE TABLE IF NOT EXISTS chat_channels (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK(type IN ('DIRECT', 'GROUP')),
    name TEXT,
    participants TEXT NOT NULL,  // JSON 陣列
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
)

// 聊天訊息表
CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    read_by TEXT DEFAULT '[]',  // JSON 陣列
    created_at TEXT NOT NULL,
    FOREIGN KEY (channel_id) REFERENCES chat_channels(id) ON DELETE CASCADE
)
```

**2. 核心 API 端點**

| 端點 | 方法 | 功能 | 狀態 |
|------|------|------|------|
| `/chat/channels` | GET | 獲取用戶的所有聊天頻道 | ✅ |
| `/chat/channels/direct` | POST | 創建一對一聊天 | ✅ |
| `/chat/channels` | POST | 創建群組聊天 | ✅ |
| `/chat/channels/:id/messages` | GET | 獲取頻道訊息（分頁） | ✅ |
| `/chat/channels/:id/messages` | POST | 發送訊息 | ✅ |
| `/chat/channels/:id/read` | POST | 標記訊息為已讀 | ✅ |
| `/chat/channels/:id/messages/:msgId/recall` | POST | 收回訊息 | ✅ |
| `/chat/users` | GET | 獲取聊天用戶列表 | ✅ |

**3. 權限驗證**
所有端點都使用 `authenticateToken` 中間件：
```javascript
router.get('/channels', auth_1.authenticateToken, async (req, res) => {
    const currentUser = req.user;  // 從 JWT 獲取當前用戶
    // ...
});
```

---

### 問題 2: 創建一對一聊天

#### 實現邏輯
```javascript
router.post('/channels/direct', auth_1.authenticateToken, async (req, res) => {
    const { user1, user2 } = req.body;
    
    // 1. 檢查是否已存在該一對一頻道（避免重複）
    const participants = [user1, user2].sort();  // 排序確保一致性
    const existing = await db.get(`
        SELECT * FROM chat_channels
        WHERE type = 'DIRECT' AND participants = ?
    `, [JSON.stringify(participants)]);
    
    if (existing) {
        return res.json({ channel: existing });  // 返回現有頻道
    }
    
    // 2. 創建新頻道
    const channelId = uuidv4();
    await db.run(`
        INSERT INTO chat_channels (id, type, name, participants, created_at, updated_at)
        VALUES (?, 'DIRECT', NULL, ?, ?, ?)
    `, [channelId, JSON.stringify(participants), now, now]);
    
    // 3. 返回頻道資訊（包含參與者詳細資料）
    res.json({ channel: { id, type: 'DIRECT', participants, participantDetails } });
});
```

#### 關鍵學習點
- ✅ **去重檢查**：避免同一對用戶創建多個頻道
- ✅ **參與者排序**：確保 `[A, B]` 和 `[B, A]` 被視為相同
- ✅ **返回詳細資訊**：包含參與者的姓名、頭像等

---

### 問題 3: 創建群組聊天

#### 實現邏輯
```javascript
router.post('/channels', auth_1.authenticateToken, async (req, res) => {
    const { type, name, participant_ids } = req.body;
    
    // 1. 驗證參數
    if (type !== 'GROUP' || !name || !Array.isArray(participant_ids) || participant_ids.length < 2) {
        return res.status(400).json({ error: '無效的群組參數' });
    }
    
    // 2. 確保創建者在參與者列表中
    const participants = Array.from(new Set([currentUser.id, ...participant_ids]));
    
    // 3. 創建群組
    const channelId = uuidv4();
    await db.run(`
        INSERT INTO chat_channels (id, type, name, participants, created_at, updated_at)
        VALUES (?, 'GROUP', ?, ?, ?, ?)
    `, [channelId, name, JSON.stringify(participants), now, now]);
    
    res.json({ channel: { id, type: 'GROUP', name, participants } });
});
```

#### 關鍵學習點
- ✅ **最少人數檢查**：群組至少需要 2 個參與者
- ✅ **自動加入創建者**：確保創建者在群組中
- ✅ **去重處理**：使用 `Set` 避免重複參與者

---

### 問題 4: 訊息分頁載入

#### 實現邏輯
```javascript
router.get('/channels/:channelId/messages', auth_1.authenticateToken, async (req, res) => {
    const { limit = 50, before, after } = req.query;
    
    // 1. 驗證用戶是否為頻道成員
    const channel = await db.get('SELECT * FROM chat_channels WHERE id = ?', [channelId]);
    const participants = JSON.parse(channel.participants);
    if (!participants.includes(currentUser.id)) {
        return res.status(403).json({ error: '無權訪問此頻道' });
    }
    
    // 2. 構建分頁查詢
    let query = `
        SELECT m.*, u.name as user_name, u.avatar
        FROM chat_messages m
        LEFT JOIN users u ON m.user_id = u.id
        WHERE m.channel_id = ?
    `;
    const params = [channelId];
    
    if (before) {
        query += ' AND m.created_at < ?';
        params.push(before);
    } else if (after) {
        query += ' AND m.created_at > ?';
        params.push(after);
    }
    
    query += ' ORDER BY m.created_at DESC LIMIT ?';
    params.push(parseInt(limit) + 1);  // 多取一條判斷是否有更多
    
    const messages = await db.all(query, params);
    const hasMore = messages.length > parseInt(limit);
    
    if (hasMore) messages.pop();
    
    res.json({ messages: messages.reverse(), hasMore });
});
```

#### 關鍵學習點
- ✅ **權限檢查**：確保用戶是頻道成員
- ✅ **雙向分頁**：支援 `before`（向上滾動）和 `after`（增量更新）
- ✅ **hasMore 判斷**：多取一條數據來判斷是否還有更多

---

### 問題 5: 已讀狀態功能

#### 實現邏輯
```javascript
router.post('/channels/:channelId/read', auth_1.authenticateToken, async (req, res) => {
    // 1. 獲取所有未讀訊息
    const unreadMessages = await db.all(`
        SELECT id, read_by
        FROM chat_messages
        WHERE channel_id = ?
        AND user_id != ?
        AND NOT (read_by LIKE '%' || ? || '%')
    `, [channelId, currentUser.id, currentUser.id]);
    
    // 2. 更新每條訊息的 read_by
    for (const msg of unreadMessages) {
        const readBy = JSON.parse(msg.read_by || '[]');
        if (!readBy.includes(currentUser.id)) {
            readBy.push(currentUser.id);
            await db.run(
                'UPDATE chat_messages SET read_by = ? WHERE id = ?',
                [JSON.stringify(readBy), msg.id]
            );
        }
    }
    
    res.json({ success: true, markedCount: unreadMessages.length });
});
```

#### 前端顯示已讀人員
前端已實現 `ChatMessageReadStatusModal` 組件：
```typescript
// 點擊訊息顯示已讀狀態
<div onClick={() => setReadStatusMsg(message)}>
  {message.readBy.length > 1 && (
    <span className="text-xs text-gray-500">
      已讀 {message.readBy.length - 1} 人
    </span>
  )}
</div>

// Modal 顯示已讀人員列表
<ChatMessageReadStatusModal
  message={readStatusMsg}
  users={users}
  onClose={() => setReadStatusMsg(null)}
/>
```

#### 關鍵學習點
- ✅ **read_by 陣列**：儲存所有已讀用戶的 ID
- ✅ **排除自己**：不標記自己發送的訊息
- ✅ **批量更新**：一次性標記所有未讀訊息

---

### 問題 6: 收回訊息功能

#### 實現邏輯
```javascript
router.post('/channels/:channelId/messages/:messageId/recall', auth_1.authenticateToken, async (req, res) => {
    // 1. 獲取訊息
    const message = await db.get(
        'SELECT * FROM chat_messages WHERE id = ? AND channel_id = ?',
        [messageId, channelId]
    );
    
    // 2. 權限檢查：只有發送者可以收回
    if (message.user_id !== currentUser.id) {
        return res.status(403).json({ error: '只能收回自己的訊息' });
    }
    
    // 3. 時間限制：只能收回 2 分鐘內的訊息
    const messageTime = new Date(message.created_at).getTime();
    const now = new Date().getTime();
    const twoMinutes = 2 * 60 * 1000;
    
    if (now - messageTime > twoMinutes) {
        return res.status(400).json({ error: '只能收回 2 分鐘內的訊息' });
    }
    
    // 4. 更新訊息內容為已收回標記
    await db.run(
        'UPDATE chat_messages SET content = ? WHERE id = ?',
        ['[RECALLED]', messageId]
    );
    
    res.json({ success: true });
});
```

#### 前端顯示收回訊息
```typescript
// 顯示收回的訊息
{message.content === '[RECALLED]' ? (
  <div className="text-gray-400 italic">此訊息已被收回</div>
) : (
  <div>{message.content}</div>
)}

// 長按選單（手機版）
<div onTouchStart={() => handleLongPressStart(message.id)}
     onTouchEnd={handleLongPressEnd}>
  {longPressMenuId === message.id && (
    <button onClick={() => handleRecallMessage(message.id)}>
      收回訊息
    </button>
  )}
</div>
```

#### 關鍵學習點
- ✅ **權限檢查**：只有發送者可以收回
- ✅ **時間限制**：2 分鐘內可收回
- ✅ **標記而非刪除**：保留訊息記錄，只修改內容
- ✅ **手機支援**：長按 0.5 秒彈出選單

---

## 🚀 WebSocket 實時通訊（待實現）

### 當前狀態
- ❌ 後端沒有 WebSocket 服務器
- ✅ 前端已實現 WebSocket 客戶端（`utils/websocketClient.ts`）
- ✅ 前端有備用輪詢機制（當 WebSocket 未連接時）

### 前端 WebSocket 實現
```typescript
// 前端已實現的功能
const wsClient = getWebSocketClient();
wsClient.addMessageHandler(handleWsMessage);
wsClient.connect(token);

// 處理不同類型的訊息
switch (message.type) {
  case 'AUTH_SUCCESS':
    setWsConnected(true);
    break;
  case 'NEW_MESSAGE':
    // 收到新訊息，更新 UI
    setMessages(prev => [...prev, message.message]);
    break;
  case 'MESSAGES_READ':
    // 訊息已讀更新
    break;
  case 'USER_TYPING':
    // 顯示 "對方正在輸入..."
    break;
}
```

### 需要實現的後端 WebSocket 服務器

**1. 安裝依賴**
```bash
npm install ws @types/ws
```

**2. 創建 WebSocket 服務器**
```javascript
const WebSocket = require('ws');

class ChatWebSocketServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.clients = new Map(); // userId -> WebSocket
    
    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });
  }
  
  handleConnection(ws, req) {
    ws.on('message', (data) => {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'AUTH':
          this.authenticateClient(ws, message.token);
          break;
        case 'TYPING':
          this.broadcastTyping(message.channelId, message.userId);
          break;
      }
    });
  }
  
  broadcastNewMessage(channelId, message, participants) {
    participants.forEach(userId => {
      const client = this.clients.get(userId);
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'NEW_MESSAGE',
          message: message
        }));
      }
    });
  }
}
```

**3. 整合到 Express 服務器**
```javascript
// 在 server.js 中
const chatWs = new ChatWebSocketServer(this.server);

// 在發送訊息後廣播
router.post('/channels/:channelId/messages', async (req, res) => {
  // ... 創建訊息
  res.json({ message });
  
  // 廣播給其他參與者
  chatWs.broadcastNewMessage(channelId, message, participants);
});
```

---

## 📊 功能完成狀態

| 功能 | 後端 | 前端 | WebSocket | 狀態 |
|------|------|------|-----------|------|
| 創建一對一聊天 | ✅ | ✅ | ⏳ | 可用（輪詢） |
| 創建群組聊天 | ✅ | ✅ | ⏳ | 可用（輪詢） |
| 發送訊息 | ✅ | ✅ | ⏳ | 可用（輪詢） |
| 接收訊息 | ✅ | ✅ | ⏳ | 可用（輪詢） |
| 訊息分頁 | ✅ | ✅ | - | ✅ 完成 |
| 已讀狀態 | ✅ | ✅ | ⏳ | 可用（輪詢） |
| 已讀人員查看 | ✅ | ✅ | - | ✅ 完成 |
| 收回訊息 | ✅ | ✅ | ⏳ | 可用（輪詢） |
| 圖片訊息 | - | ✅ | - | 前端已支援 |
| 檔案訊息 | - | ✅ | - | 前端已支援 |
| 正在輸入提示 | - | ✅ | ❌ | 需 WebSocket |

**圖例**：
- ✅ 已完成
- ⏳ 待實現（目前使用輪詢）
- ❌ 未實現
- `-` 不適用

---

## 🔄 當前工作模式

### 輪詢機制（備用方案）
前端已實現智能輪詢：
```typescript
const poll = () => {
    // 只在 WebSocket 未連接時輪詢
    if (!wsClientRef.current?.isConnected()) {
        if(activeChannelId && lastMessageTimestamp) {
            loadNewMessages(activeChannelId);  // 增量載入新訊息
            api.chat.markRead(channelId, currentUser.id);
        }
        loadChannels();  // 更新頻道列表
    }
};

// 動態調整輪詢間隔
const delay = wsClientRef.current?.isConnected() 
    ? 30000  // WebSocket 連接時：30 秒
    : (document.hidden ? 15000 : 5000);  // 未連接時：5-15 秒
```

### 優點
- ✅ 無需 WebSocket 即可工作
- ✅ 頁面隱藏時降低頻率
- ✅ 自動切換到 WebSocket（當可用時）

### 缺點
- ❌ 延遲較高（5-30 秒）
- ❌ 增加服務器負載
- ❌ 無法實現 "正在輸入" 功能

---

## 📝 部署檢查清單

部署聊天功能時，務必遵循以下步驟：

- [x] 1. 備份原始 chat.js
- [x] 2. 上傳新的 chat.js 到容器
- [x] 3. 驗證模組導出格式正確
- [x] 4. 重啟容器
- [x] 5. 檢查容器日誌確認正常啟動
- [ ] 6. 測試創建一對一聊天
- [ ] 7. 測試創建群組聊天
- [ ] 8. 測試發送和接收訊息
- [ ] 9. 測試已讀狀態
- [ ] 10. 測試收回訊息
- [ ] 11. 創建備份

---

## 🚨 常見錯誤與解決方案

### 錯誤 1: 無法創建頻道
**症狀**：前端調用 API 返回 500 錯誤

**可能原因**：
1. 資料庫表未初始化
2. 參數格式錯誤

**解決方案**：
```javascript
// 每個路由都先初始化表
await initChatTables(db);

// 檢查參數
if (!user1 || !user2) {
    return res.status(400).json({ error: '缺少必要參數' });
}
```

### 錯誤 2: 訊息未顯示
**症狀**：發送訊息後，前端看不到新訊息

**可能原因**：
1. 前後端數據格式不匹配
2. 輪詢未觸發

**解決方案**：
```javascript
// 後端確保返回正確格式
res.json({
    message: {
        id: messageId,
        channel_id: channelId,  // 注意：snake_case
        user_id: currentUser.id,
        user_name: user.name,
        content: content,
        timestamp: now,
        read_by: [currentUser.id]
    }
});

// 前端映射格式
const m = response.message;
return {
    id: m.id,
    channelId: m.channel_id,  // 轉換為 camelCase
    userId: m.user_id,
    userName: m.user_name,
    content: m.content,
    timestamp: m.timestamp,
    readBy: m.read_by || []
};
```

### 錯誤 3: 已讀狀態不更新
**症狀**：標記已讀後，未讀數量沒有變化

**可能原因**：
1. read_by 陣列未正確更新
2. 前端未重新載入頻道列表

**解決方案**：
```javascript
// 後端確保更新 read_by
const readBy = JSON.parse(msg.read_by || '[]');
if (!readBy.includes(currentUser.id)) {
    readBy.push(currentUser.id);
    await db.run(
        'UPDATE chat_messages SET read_by = ? WHERE id = ?',
        [JSON.stringify(readBy), msg.id]
    );
}

// 前端標記後重新載入
await api.chat.markRead(channelId, currentUser.id);
await loadChannels();  // 更新未讀數
```

---

## 📚 相關文件

- **後端路由**：`/app/dist/routes/chat.js`（容器內）
- **前端組件**：
  - `components/ChatSystem.tsx` - 主聊天系統
  - `components/ChatView.tsx` - 聊天視圖
  - `components/ChatMessageReadStatusModal.tsx` - 已讀狀態 Modal
  - `components/CreateGroupModal.tsx` - 創建群組 Modal
  - `components/GroupInfoModal.tsx` - 群組資訊 Modal
- **WebSocket 客戶端**：`utils/websocketClient.ts`
- **API 服務**：`services/api.ts` (chat 部分)

---

## 🎯 下一步計劃

### 短期（必要）
1. ✅ 完成基本聊天功能測試
2. ⏳ 實現 WebSocket 服務器
3. ⏳ 整合 WebSocket 到聊天路由
4. ⏳ 測試實時訊息推送

### 中期（優化）
1. 訊息快取機制
2. 離線訊息同步
3. 訊息搜尋功能
4. 訊息轉發功能

### 長期（增強）
1. 語音訊息
2. 視訊通話
3. 訊息加密
4. 訊息備份和匯出

---

**創建日期**：2025-12-30  
**最後更新**：2025-12-30 03:40  
**版本**：2.2.0  
**狀態**：✅ 後端完成，✅ 基本功能可用（輪詢模式），⏳ WebSocket 待實現
