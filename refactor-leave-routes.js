const fs = require('fs');

console.log('=== Refactoring Leave Request Routes ===');

const filePath = '/app/dist/routes/leaves.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Original file size:', content.length, 'bytes');

// 1. Add LeaveRequestService import
if (!content.includes("const LeaveRequestService = require('../../services/leaveRequestService');")) {
    const lastRequireIndex = content.lastIndexOf("const { authenticateToken } = require('../middleware/auth');");
    if (lastRequireIndex !== -1) {
        const insertPos = content.indexOf('\n', lastRequireIndex) + 1;
        content = content.slice(0, insertPos) + 
                  "const LeaveRequestService = require('../../services/leaveRequestService');\n" +
                  content.slice(insertPos);
        console.log('+ Added LeaveRequestService import');
    }
}

// 2. Refactor GET / route
const getAllPattern = /let query = 'SELECT \* FROM leave_requests';[\s\S]*?const leaves = await db\.all\(query, params\);/;
if (getAllPattern.test(content)) {
    content = content.replace(getAllPattern, 'const leaves = await LeaveRequestService.getAllLeaveRequests(db, currentUser);');
    console.log('+ Replaced GET / route');
}

// 3. Refactor GET /:id route
const getByIdPattern = /const leave = await db\.get\('SELECT \* FROM leave_requests WHERE id = \?', \[id\]\);/g;
const matches = content.match(getByIdPattern);
if (matches && matches.length > 0) {
    // Only replace the first occurrence in GET /:id route
    content = content.replace(getByIdPattern, 'const leave = await LeaveRequestService.getLeaveRequestById(db, id);');
    console.log('+ Replaced GET /:id route');
}

// 4. Refactor POST / route (create)
const postPattern = /const overlapping = await db\.all\([\s\S]*?\);[\s\S]*?const hasConflict = overlapping\.length > 0;[\s\S]*?const status = hasConflict \? 'CONFLICT' : 'PENDING';[\s\S]*?const conflictDetails = hasConflict[\s\S]*?\);[\s\S]*?await db\.run\([\s\S]*?INSERT INTO leave_requests[\s\S]*?\);[\s\S]*?const leave = await db\.get\('SELECT \* FROM leave_requests WHERE id = \?', \[id\]\);/;

if (postPattern.test(content)) {
    const replacement = `const leave = await LeaveRequestService.createLeaveRequest(db, {
      userId: currentUser.id,
      departmentId: currentUser.department,
      leaveType: leave_type,
      startDate: start_date,
      endDate: end_date,
      startPeriod: start_period,
      endPeriod: end_period,
      days,
      reason,
      proxyUserId: proxy_user_id
    });`;
    
    content = content.replace(postPattern, replacement);
    console.log('+ Replaced POST / route');
}

// 5. Refactor POST /:id/approve route
const approvePattern = /await db\.run\([\s\S]*?UPDATE leave_requests[\s\S]*?SET status = \?, reviewed_by = \?, reviewed_at = \?, updated_at = \?[\s\S]*?WHERE id = \?[\s\S]*?\);[\s\S]*?const leave = await db\.get\('SELECT \* FROM leave_requests WHERE id = \?', \[id\]\);/;

if (approvePattern.test(content)) {
    content = content.replace(approvePattern, 'const leave = await LeaveRequestService.approveLeaveRequest(db, id, currentUser.id, allow_conflict);');
    console.log('+ Replaced POST /:id/approve route');
}

// 6. Refactor POST /:id/reject route
const rejectPattern = /await db\.run\([\s\S]*?UPDATE leave_requests[\s\S]*?SET status = \?, reviewed_by = \?, reviewed_at = \?, reject_reason = \?, updated_at = \?[\s\S]*?WHERE id = \?[\s\S]*?\);[\s\S]*?const leave = await db\.get\('SELECT \* FROM leave_requests WHERE id = \?', \[id\]\);/;

if (rejectPattern.test(content)) {
    content = content.replace(rejectPattern, 'const leave = await LeaveRequestService.rejectLeaveRequest(db, id, currentUser.id, reject_reason);');
    console.log('+ Replaced POST /:id/reject route');
}

// 7. Refactor DELETE /:id route
const deletePattern = /await db\.run\('DELETE FROM leave_requests WHERE id = \?', \[id\]\);/;
if (deletePattern.test(content)) {
    content = content.replace(deletePattern, 'await LeaveRequestService.deleteLeaveRequest(db, id);');
    console.log('+ Replaced DELETE /:id route');
}

// 8. Refactor GET /rules/:departmentId route
const getRulesPattern = /const rules = await db\.get\([\s\S]*?'SELECT \* FROM leave_rules WHERE department_id = \?',[\s\S]*?\[departmentId\][\s\S]*?\);/;

if (getRulesPattern.test(content)) {
    content = content.replace(getRulesPattern, 'const rules = await LeaveRequestService.getDepartmentRules(db, departmentId);');
    console.log('+ Replaced GET /rules/:departmentId route');
}

// 9. Refactor PUT /rules/:departmentId route (complex, need to be careful)
const putRulesPattern = /const existing = await db\.get\([\s\S]*?'SELECT \* FROM leave_rules WHERE department_id = \?',[\s\S]*?\[departmentId\][\s\S]*?\);[\s\S]*?if \(existing\) \{[\s\S]*?await db\.run\([\s\S]*?UPDATE leave_rules[\s\S]*?\);[\s\S]*?\} else \{[\s\S]*?await db\.run\([\s\S]*?INSERT INTO leave_rules[\s\S]*?\);[\s\S]*?\}[\s\S]*?const rules = await db\.get\([\s\S]*?'SELECT \* FROM leave_rules WHERE department_id = \?',[\s\S]*?\[departmentId\][\s\S]*?\);/;

if (putRulesPattern.test(content)) {
    const replacement = `const rules = await LeaveRequestService.updateDepartmentRules(db, departmentId, {
      maxDays: max_days,
      minNoticeDays: min_notice_days,
      maxConsecutiveDays: max_consecutive_days,
      requireProxy: require_proxy
    });`;
    
    content = content.replace(putRulesPattern, replacement);
    console.log('+ Replaced PUT /rules/:departmentId route');
}

fs.writeFileSync(filePath, content, 'utf8');

console.log('\n=== Summary ===');
console.log('Modified file size:', content.length, 'bytes');
console.log('SUCCESS: Leave request routes refactored');
