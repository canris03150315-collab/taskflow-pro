const fs = require('fs');

const filePath = '/app/dist/database-v2.js';
const content = fs.readFileSync(filePath, 'utf8');

console.log('=== Checking database-v2.js initialization ===\n');

// Find the INSERT INTO departments section
const lines = content.split('\n');
let inDeptSection = false;
let deptLines = [];

lines.forEach((line, i) => {
  if (line.includes('INSERT INTO departments')) {
    inDeptSection = true;
    deptLines.push({ num: i + 1, text: line });
  } else if (inDeptSection && (line.includes('VALUES') || line.includes('Engineering') || line.includes('Marketing') || line.includes('HR'))) {
    deptLines.push({ num: i + 1, text: line });
  } else if (inDeptSection && line.includes(';')) {
    deptLines.push({ num: i + 1, text: line });
    inDeptSection = false;
  }
});

if (deptLines.length > 0) {
  console.log('Found department initialization:');
  deptLines.forEach(l => {
    console.log('Line', l.num, ':', l.text.trim().substring(0, 100));
  });
} else {
  console.log('No department initialization found');
}

// Check for any initialization logic
const initMatches = content.match(/async\s+initialize\s*\([^)]*\)\s*\{[\s\S]{0,500}/g);
if (initMatches) {
  console.log('\n=== Found initialize methods ===');
  initMatches.forEach((match, i) => {
    console.log('\nMethod', i + 1, ':');
    console.log(match.substring(0, 200));
  });
}
