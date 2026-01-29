const fs = require('fs');

console.log('=== Refactoring Remaining Leave Routes ===');

const filePath = '/app/dist/routes/leaves.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Original file size:', content.length, 'bytes');

// 1. Refactor POST /:id/approve route
const approvePattern = /await db\.run\([\s\S]*?`UPDATE leave_requests SET[\s\S]*?status = 'APPROVED',[\s\S]*?approver_id = \?,[\s\S]*?approval_notes = \?,[\s\S]*?conflict_override = \?,[\s\S]*?approved_at = \?,[\s\S]*?updated_at = \?[\s\S]*?WHERE id = \?`,[\s\S]*?\[currentUser\.id, approval_notes, conflict_override \? 1 : 0, now, now, id\][\s\S]*?\);[\s\S]*?const updatedLeave = await db\.get\('SELECT \* FROM leave_requests WHERE id = \?', \[id\]\);/;

if (approvePattern.test(content)) {
    content = content.replace(approvePattern, 'const updatedLeave = await LeaveRequestService.approveLeaveRequest(db, id, currentUser.id, approval_notes, conflict_override);');
    console.log('+ Replaced POST /:id/approve route');
} else {
    console.log('! POST /:id/approve pattern not found');
}

// 2. Refactor POST /:id/reject route
const rejectPattern = /await db\.run\([\s\S]*?`UPDATE leave_requests SET[\s\S]*?status = 'REJECTED',[\s\S]*?approver_id = \?,[\s\S]*?approval_notes = \?,[\s\S]*?approved_at = \?,[\s\S]*?updated_at = \?[\s\S]*?WHERE id = \?`,[\s\S]*?\[currentUser\.id, approval_notes, now, now, id\][\s\S]*?\);[\s\S]*?const updatedLeave = await db\.get\('SELECT \* FROM leave_requests WHERE id = \?', \[id\]\);/;

if (rejectPattern.test(content)) {
    content = content.replace(rejectPattern, 'const updatedLeave = await LeaveRequestService.rejectLeaveRequest(db, id, currentUser.id, approval_notes);');
    console.log('+ Replaced POST /:id/reject route');
} else {
    console.log('! POST /:id/reject pattern not found');
}

// 3. Refactor GET /rules/:departmentId route
const getRulesPattern = /const rules = await db\.get\([\s\S]*?'SELECT \* FROM leave_rules WHERE department_id = \?',[\s\S]*?\[departmentId\][\s\S]*?\);/;

if (getRulesPattern.test(content)) {
    content = content.replace(getRulesPattern, 'const rules = await LeaveRequestService.getDepartmentRules(db, departmentId);');
    console.log('+ Replaced GET /rules/:departmentId route');
} else {
    console.log('! GET /rules/:departmentId pattern not found');
}

// 4. Refactor PUT /rules/:departmentId route
const putRulesPattern = /const existing = await db\.get\([\s\S]*?'SELECT \* FROM leave_rules WHERE department_id = \?',[\s\S]*?\[departmentId\][\s\S]*?\);[\s\S]*?if \(existing\) \{[\s\S]*?await db\.run\([\s\S]*?`UPDATE leave_rules[\s\S]*?WHERE department_id = \?`,[\s\S]*?\[[\s\S]*?max_days,[\s\S]*?min_notice_days,[\s\S]*?max_consecutive_days,[\s\S]*?require_proxy[\s\S]*?\][\s\S]*?\);[\s\S]*?\} else \{[\s\S]*?await db\.run\([\s\S]*?`INSERT INTO leave_rules[\s\S]*?VALUES[\s\S]*?\);[\s\S]*?\}[\s\S]*?const rules = await db\.get\([\s\S]*?'SELECT \* FROM leave_rules WHERE department_id = \?',[\s\S]*?\[departmentId\][\s\S]*?\);/;

if (putRulesPattern.test(content)) {
    const replacement = `const rules = await LeaveRequestService.updateDepartmentRules(db, departmentId, {
      maxDays: max_days,
      minNoticeDays: min_notice_days,
      maxConsecutiveDays: max_consecutive_days,
      requireProxy: require_proxy
    });`;
    
    content = content.replace(putRulesPattern, replacement);
    console.log('+ Replaced PUT /rules/:departmentId route');
} else {
    console.log('! PUT /rules/:departmentId pattern not found');
}

fs.writeFileSync(filePath, content, 'utf8');

console.log('\n=== Summary ===');
console.log('Modified file size:', content.length, 'bytes');
console.log('SUCCESS: Remaining leave routes refactored');
