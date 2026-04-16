"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSecureDatabase = isSecureDatabase;
exports.isLegacyDatabase = isLegacyDatabase;
// 類型守衛函數
function isSecureDatabase(db) {
    return db && typeof db.get === 'function' && typeof db.encrypt === 'function';
}
function isLegacyDatabase(db) {
    return db && typeof db.get === 'function' && typeof db.generateEncryptionKey === 'function';
}
//# sourceMappingURL=database.js.map