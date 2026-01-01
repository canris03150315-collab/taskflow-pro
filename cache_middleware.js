"use strict";
/**
 * 服務端快取中間件
 * 支援記憶體快取和 Redis（可選）
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheMiddleware = exports.cache = exports.CacheManager = void 0;

// 簡易記憶體快取實現（無需 Redis 依賴）
class MemoryCache {
    constructor(options = {}) {
        this.store = new Map();
        this.defaultTTL = options.defaultTTL || 300; // 預設 5 分鐘
        this.maxSize = options.maxSize || 1000;
        this.stats = { hits: 0, misses: 0 };
        
        // 定期清理過期項目
        setInterval(() => this.cleanup(), 60000);
    }
    
    async get(key) {
        const item = this.store.get(key);
        if (!item) {
            this.stats.misses++;
            return null;
        }
        
        if (item.expireAt && item.expireAt < Date.now()) {
            this.store.delete(key);
            this.stats.misses++;
            return null;
        }
        
        this.stats.hits++;
        return item.value;
    }
    
    async set(key, value, ttl) {
        // 如果超過最大容量，清理最舊的項目
        if (this.store.size >= this.maxSize) {
            const oldestKey = this.store.keys().next().value;
            this.store.delete(oldestKey);
        }
        
        const expireAt = ttl ? Date.now() + (ttl * 1000) : null;
        this.store.set(key, { value, expireAt, createdAt: Date.now() });
    }
    
    async del(key) {
        this.store.delete(key);
    }
    
    async delPattern(pattern) {
        const regex = new RegExp(pattern.replace('*', '.*'));
        for (const key of this.store.keys()) {
            if (regex.test(key)) {
                this.store.delete(key);
            }
        }
    }
    
    async flush() {
        this.store.clear();
    }
    
    cleanup() {
        const now = Date.now();
        for (const [key, item] of this.store.entries()) {
            if (item.expireAt && item.expireAt < now) {
                this.store.delete(key);
            }
        }
    }
    
    getStats() {
        const hitRate = this.stats.hits + this.stats.misses > 0
            ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
            : 0;
        return {
            size: this.store.size,
            hits: this.stats.hits,
            misses: this.stats.misses,
            hitRate: `${hitRate}%`
        };
    }
}

// 快取管理器
class CacheManager {
    constructor(options = {}) {
        // 優先使用 Redis，否則使用記憶體快取
        if (options.redis) {
            this.client = options.redis;
            this.type = 'redis';
        } else {
            this.client = new MemoryCache(options);
            this.type = 'memory';
        }
        
        // 快取鍵前綴
        this.prefix = options.prefix || 'taskflow:';
        
        // TTL 配置（秒）
        this.ttl = {
            users: 300,        // 5 分鐘
            channels: 60,      // 1 分鐘
            messages: 30,      // 30 秒
            tasks: 120,        // 2 分鐘
            departments: 600,  // 10 分鐘
            settings: 3600,    // 1 小時
            ...options.ttl
        };
        
        console.log(`[Cache] 使用 ${this.type} 快取`);
    }
    
    _key(key) {
        return `${this.prefix}${key}`;
    }
    
    async get(key) {
        try {
            const data = await this.client.get(this._key(key));
            if (data && this.type === 'redis') {
                return JSON.parse(data);
            }
            return data;
        } catch (err) {
            console.error('[Cache] 讀取失敗:', err);
            return null;
        }
    }
    
    async set(key, value, ttl) {
        try {
            const data = this.type === 'redis' ? JSON.stringify(value) : value;
            await this.client.set(this._key(key), data, ttl);
        } catch (err) {
            console.error('[Cache] 寫入失敗:', err);
        }
    }
    
    async del(key) {
        try {
            await this.client.del(this._key(key));
        } catch (err) {
            console.error('[Cache] 刪除失敗:', err);
        }
    }
    
    async invalidatePattern(pattern) {
        try {
            await this.client.delPattern(this._key(pattern));
        } catch (err) {
            console.error('[Cache] 批量刪除失敗:', err);
        }
    }
    
    // 快取包裝器 - 自動處理快取讀取/寫入
    async wrap(key, ttl, fetchFn) {
        const cached = await this.get(key);
        if (cached !== null) {
            return cached;
        }
        
        const data = await fetchFn();
        await this.set(key, data, ttl);
        return data;
    }
    
    // 預定義的快取方法
    async getUsers() {
        return this.get('users:all');
    }
    
    async setUsers(users) {
        return this.set('users:all', users, this.ttl.users);
    }
    
    async invalidateUsers() {
        return this.invalidatePattern('users:*');
    }
    
    async getTasks(filter = 'all') {
        return this.get(`tasks:${filter}`);
    }
    
    async setTasks(tasks, filter = 'all') {
        return this.set(`tasks:${filter}`, tasks, this.ttl.tasks);
    }
    
    async invalidateTasks() {
        return this.invalidatePattern('tasks:*');
    }
    
    async getChannels(userId) {
        return this.get(`channels:${userId}`);
    }
    
    async setChannels(userId, channels) {
        return this.set(`channels:${userId}`, channels, this.ttl.channels);
    }
    
    async invalidateChannels(userId) {
        if (userId) {
            return this.del(`channels:${userId}`);
        }
        return this.invalidatePattern('channels:*');
    }
    
    getStats() {
        if (this.client.getStats) {
            return this.client.getStats();
        }
        return { type: this.type };
    }
}

exports.CacheManager = CacheManager;

// 單例實例
let cacheInstance = null;

const getCache = (options) => {
    if (!cacheInstance) {
        cacheInstance = new CacheManager(options);
    }
    return cacheInstance;
};

exports.cache = getCache;

// Express 中間件 - 自動快取 GET 請求
const cacheMiddleware = (options = {}) => {
    const cache = getCache(options);
    const ttl = options.ttl || 60;
    const excludePaths = options.exclude || ['/auth', '/login', '/logout'];
    
    return async (req, res, next) => {
        // 只快取 GET 請求
        if (req.method !== 'GET') {
            return next();
        }
        
        // 排除特定路徑
        if (excludePaths.some(path => req.path.includes(path))) {
            return next();
        }
        
        const cacheKey = `route:${req.originalUrl}`;
        
        try {
            const cached = await cache.get(cacheKey);
            if (cached) {
                res.set('X-Cache', 'HIT');
                return res.json(cached);
            }
        } catch (err) {
            // 快取讀取失敗，繼續處理請求
        }
        
        // 攔截 res.json 以快取回應
        const originalJson = res.json.bind(res);
        res.json = (data) => {
            res.set('X-Cache', 'MISS');
            cache.set(cacheKey, data, ttl).catch(() => {});
            return originalJson(data);
        };
        
        next();
    };
};

exports.cacheMiddleware = cacheMiddleware;
