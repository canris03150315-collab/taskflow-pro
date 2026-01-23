const fs = require('fs');

const filePath = '/app/dist/routes/attendance.js';
let content = fs.readFileSync(filePath, 'utf8');

// 找到編輯路由中的 UPDATE 語句，移除 notes 欄位
const oldUpdate = `await db.run(\`
      UPDATE attendance_records 
      SET clock_in = ?, clock_out = ?, duration_minutes = ?, notes = ?
      WHERE id = ?
    \`, [
      clock_in || existing.clock_in,
      clock_out || existing.clock_out,
      durationMinutes,
      notes !== undefined ? notes : existing.notes,
      id
    ]);`;

const newUpdate = `await db.run(\`
      UPDATE attendance_records 
      SET clock_in = ?, clock_out = ?, duration_minutes = ?
      WHERE id = ?
    \`, [
      clock_in || existing.clock_in,
      clock_out || existing.clock_out,
      durationMinutes,
      id
    ]);`;

if (content.includes(oldUpdate)) {
    content = content.replace(oldUpdate, newUpdate);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Fixed attendance edit route - removed notes field');
} else {
    console.log('INFO: Could not find exact match, trying alternative approach');
    
    // 嘗試更寬鬆的匹配
    const pattern = /UPDATE attendance_records[\s\S]*?SET clock_in = \?, clock_out = \?, duration_minutes = \?, notes = \?[\s\S]*?WHERE id = \?/;
    if (pattern.test(content)) {
        content = content.replace(
            /UPDATE attendance_records[\s\S]*?SET clock_in = \?, clock_out = \?, duration_minutes = \?, notes = \?[\s\S]*?WHERE id = \?/,
            'UPDATE attendance_records \n      SET clock_in = ?, clock_out = ?, duration_minutes = ?\n      WHERE id = ?'
        );
        
        // 同時修改參數數組
        content = content.replace(
            /notes !== undefined \? notes : existing\.notes,\s*id/,
            'id'
        );
        
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('SUCCESS: Fixed attendance edit route using pattern matching');
    } else {
        console.error('ERROR: Could not find UPDATE statement to fix');
        process.exit(1);
    }
}
