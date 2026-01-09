const fs = require('fs');

console.log('Adding conflict check to schedules API...\n');

try {
  const filePath = '/app/dist/routes/schedules.js';
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Find the submit schedule route
  const submitRoutePattern = /router\.post\('\/', authenticateToken, async \(req, res\) => \{/;
  
  if (!submitRoutePattern.test(content)) {
    console.error('ERROR: Could not find submit schedule route');
    process.exit(1);
  }
  
  // Add conflict check logic before the INSERT
  const oldSubmitLogic = `await db.run(
        \`INSERT INTO schedules (
          id, user_id, department_id, year, month, selected_days, total_days,
          status, submitted_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)\`,
        [id, currentUser.id, currentUser.department, year, month, selectedDaysStr, totalDays, now, now, now]
      );`;
  
  const newSubmitLogic = `// Check for conflicts
      const deptSchedules = await db.all(
        'SELECT * FROM schedules WHERE department_id = ? AND year = ? AND month = ? AND status = "APPROVED"',
        [currentUser.department, year, month]
      );
      
      const deptUsers = await db.all(
        'SELECT * FROM users WHERE department = ?',
        [currentUser.department]
      );
      
      const conflicts = [];
      const daysInMonth = new Date(year, month, 0).getDate();
      
      for (let day = 1; day <= daysInMonth; day++) {
        let offCount = 0;
        
        // Count existing approved off days
        for (const schedule of deptSchedules) {
          const offDays = JSON.parse(schedule.selected_days || '[]');
          if (offDays.includes(day)) {
            offCount++;
          }
        }
        
        // Check if current user is off on this day
        if (selectedDays.includes(day)) {
          offCount++;
        }
        
        const totalStaff = deptUsers.length;
        const onDutyCount = totalStaff - offCount;
        
        // Get department rules
        const rules = await db.get(
          'SELECT * FROM schedule_rules WHERE department_id = ?',
          [currentUser.department]
        );
        
        const minOnDuty = rules ? rules.min_on_duty_staff : 3;
        
        if (onDutyCount < minOnDuty) {
          conflicts.push({
            day: day,
            onDuty: onDutyCount,
            required: minOnDuty,
            message: \`\${month}/\${day} only \${onDutyCount} staff on duty (min: \${minOnDuty})\`
          });
        }
      }
      
      const hasConflict = conflicts.length > 0 ? 1 : 0;
      const conflictDetails = conflicts.length > 0 ? JSON.stringify(conflicts) : null;

      await db.run(
        \`INSERT INTO schedules (
          id, user_id, department_id, year, month, selected_days, total_days,
          status, has_conflict, conflict_details, submitted_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?)\`,
        [id, currentUser.id, currentUser.department, year, month, selectedDaysStr, totalDays, hasConflict, conflictDetails, now, now, now]
      );`;
  
  content = content.replace(oldSubmitLogic, newSubmitLogic);
  
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log('OK Conflict check added to schedules API');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
