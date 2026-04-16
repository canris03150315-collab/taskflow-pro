"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.__types_module__ = exports.TaskUrgency = exports.TaskStatus = exports.Role = void 0;
var Role;
(function (Role) {
    Role["BOSS"] = "BOSS";
    Role["MANAGER"] = "MANAGER";
    Role["SUPERVISOR"] = "SUPERVISOR";
    Role["EMPLOYEE"] = "EMPLOYEE";
})(Role || (exports.Role = Role = {}));
var TaskStatus;
(function (TaskStatus) {
    TaskStatus["OPEN"] = "待接取";
    TaskStatus["ASSIGNED"] = "已指派";
    TaskStatus["IN_PROGRESS"] = "進行中";
    TaskStatus["COMPLETED"] = "已完成";
    TaskStatus["CANCELLED"] = "已取消";
})(TaskStatus || (exports.TaskStatus = TaskStatus = {}));
var TaskUrgency;
(function (TaskUrgency) {
    TaskUrgency["LOW"] = "low";
    TaskUrgency["MEDIUM"] = "medium";
    TaskUrgency["HIGH"] = "high";
    TaskUrgency["URGENT"] = "urgent";
})(TaskUrgency || (exports.TaskUrgency = TaskUrgency = {}));
// Dummy export to ensure this file is treated as a module and compiled to JS
exports.__types_module__ = true;
//# sourceMappingURL=index.js.map