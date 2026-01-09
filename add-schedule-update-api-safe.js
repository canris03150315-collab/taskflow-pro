const fs = require('fs');

console.log('Adding schedule update API safely...\n');

try {
  const filePath = '/app/dist/routes/schedules.js';
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if already added
  if (content.includes("router.put('/:id'")) {
    console.log('INFO: Update API already exists');
    process.exit(0);
  }
  
  // Find the get rules route
  const getRulesPattern = /router\.get\('\/rules\/:departmentId'/;
  const match = content.match(getRulesPattern);
  
  if (!match) {
    console.error('ERROR: Could not find insertion point');
    process.exit(1);
  }
  
  const insertPos = content.indexOf(match[0]);
  
  // Prepare the update route - use concat to avoid quote issues
  const updateRoute = [
    '',
    '  // Update schedule (for supervisor adjustment)',
    "  router.put('/:id', authenticateToken, async (req, res) => {",
    '    try {',
    '      const currentUser = req.user;',
    '      const { id } = req.params;',
    '      const { selectedDays } = req.body;',
    '',
    '      const canManage = currentUser.role === ' + "'BOSS'" + ' || currentUser.role === ' + "'MANAGER'" + ' || currentUser.role === ' + "'SUPERVISOR';" ,
    '      if (!canManage) {',
    "        return res.status(403).json({ error: 'Permission denied' });",
    '      }',
    '',
    "      const schedule = await db.get('SELECT * FROM schedules WHERE id = ?', [id]);",
    '      if (!schedule) {',
    "        return res.status(404).json({ error: 'Schedule not found' });",
    '      }',
    '',
    '      const now = new Date().toISOString();',
    '      const selectedDaysStr = JSON.stringify(selectedDays);',
    '      const totalDays = selectedDays.length;',
    '',
    '      // Re-check conflicts',
    '      const deptSchedules = await db.all(',
    "        'SELECT * FROM schedules WHERE department_id = ? AND year = ? AND month = ? AND id != ? AND status = ?',",
    "        [schedule.department_id, schedule.year, schedule.month, id, 'APPROVED']",
    '      );',
    '',
    "      const deptUsers = await db.all('SELECT * FROM users WHERE department = ?', [schedule.department_id]);",
    '      const conflicts = [];',
    '      const daysInMonth = new Date(schedule.year, schedule.month, 0).getDate();',
    '',
    '      for (let day = 1; day <= daysInMonth; day++) {',
    '        let offCount = 0;',
    '        for (const s of deptSchedules) {',
    "          const offDays = JSON.parse(s.selected_days || '[]');",
    '          if (offDays.includes(day)) offCount++;',
    '        }',
    '        if (selectedDays.includes(day)) offCount++;',
    '',
    '        const totalStaff = deptUsers.length;',
    '        const onDutyCount = totalStaff - offCount;',
    "        const rules = await db.get('SELECT * FROM schedule_rules WHERE department_id = ?', [schedule.department_id]);",
    '        const minOnDuty = rules ? rules.min_on_duty_staff : 3;',
    '',
    '        if (onDutyCount < minOnDuty) {',
    '          conflicts.push({ day, onDuty: onDutyCount, required: minOnDuty });',
    '        }',
    '      }',
    '',
    '      const hasConflict = conflicts.length > 0 ? 1 : 0;',
    '      const conflictDetails = conflicts.length > 0 ? JSON.stringify(conflicts) : null;',
    '',
    '      await db.run(',
    "        'UPDATE schedules SET selected_days = ?, total_days = ?, has_conflict = ?, conflict_details = ?, updated_at = ? WHERE id = ?',",
    '        [selectedDaysStr, totalDays, hasConflict, conflictDetails, now, id]',
    '      );',
    '',
    "      const updatedSchedule = await db.get('SELECT * FROM schedules WHERE id = ?', [id]);",
    "      if (wsServer) wsServer.broadcast('SCHEDULE_UPDATED', updatedSchedule);",
    '      res.json({ success: true, schedule: updatedSchedule });',
    '    } catch (error) {',
    "      console.error('Update schedule error:', error);",
    "      res.status(500).json({ error: 'Internal server error' });",
    '    }',
    '  });',
    ''
  ].join('\n');
  
  // Insert the route
  const before = content.substring(0, insertPos);
  const after = content.substring(insertPos);
  content = before + updateRoute + after;
  
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log('OK Schedule update API added successfully');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
