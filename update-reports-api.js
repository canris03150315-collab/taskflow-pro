const fs = require('fs');

const filePath = '/app/dist/routes/reports.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Updating reports.js API to support work log fields...');

// 1. Update POST route - Add new fields to INSERT statement
const oldInsert = `INSERT INTO reports (id, type, user_id, created_at, line_leads, registrations, first_deposits, deposit_amount, withdrawal_amount, net_income, notes)`;
const newInsert = `INSERT INTO reports (id, type, user_id, created_at, line_leads, registrations, first_deposits, deposit_amount, withdrawal_amount, net_income, notes, today_tasks, tomorrow_tasks, special_notes)`;

if (content.includes(oldInsert)) {
  content = content.replace(oldInsert, newInsert);
  console.log('Updated INSERT statement');
}

// 2. Update POST route - Add new fields to VALUES
const oldValues = `VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
const newValues = `VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

if (content.includes(oldValues)) {
  content = content.replace(oldValues, newValues);
  console.log('Updated VALUES statement');
}

// 3. Update POST route - Add new fields to parameters array
// Find the line with parameters and add new fields
const oldParams = `content.notes || ''`;
const newParams = `content.notes || '',
        content.todayTasks || '',
        content.tomorrowTasks || '',
        content.specialNotes || ''`;

content = content.replace(
  new RegExp(`(${oldParams.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\s*\\]`, 'g'),
  `${newParams}\n      ]`
);
console.log('Updated parameters array');

// 4. Update response mapping to include new fields
const oldMapping = `notes: row.notes`;
const newMapping = `notes: row.notes,
          todayTasks: row.today_tasks,
          tomorrowTasks: row.tomorrow_tasks,
          specialNotes: row.special_notes`;

content = content.replace(
  new RegExp(`(${oldMapping.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g'),
  newMapping
);
console.log('Updated response mapping');

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: reports.js API updated with work log support');
