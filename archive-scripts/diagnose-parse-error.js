const fs = require('fs');

console.log('=== Diagnosing /parse Endpoint Error ===\n');

const logPath = '/root/.pm2/logs/taskflow-pro-error.log';
const containerLogPath = '/var/log/taskflow-pro.log';

console.log('Step 1: Checking recent error logs...\n');

// Check PM2 logs if exists
if (fs.existsSync(logPath)) {
  const logs = fs.readFileSync(logPath, 'utf8');
  const recentLogs = logs.split('\n').slice(-50).join('\n');
  console.log('PM2 Error Logs (last 50 lines):');
  console.log(recentLogs);
} else {
  console.log('PM2 logs not found at', logPath);
}

console.log('\n\nStep 2: Checking platform-revenue.js /parse endpoint...\n');

const routePath = '/app/dist/routes/platform-revenue.js';
const content = fs.readFileSync(routePath, 'utf8');
const lines = content.split('\n');

let inParseRoute = false;
let parseCode = [];
let lineNum = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (line.includes("router.post('/parse'")) {
    inParseRoute = true;
    lineNum = i + 1;
  }
  
  if (inParseRoute) {
    parseCode.push(`${i + 1}: ${line}`);
    
    if (line.includes('});') && parseCode.length > 10) {
      // Find the closing of the route
      let braceCount = 0;
      for (let j = 0; j < parseCode.length; j++) {
        const l = parseCode[j];
        braceCount += (l.match(/{/g) || []).length;
        braceCount -= (l.match(/}/g) || []).length;
        if (braceCount === 0 && j > 5) {
          parseCode = parseCode.slice(0, j + 1);
          break;
        }
      }
      break;
    }
  }
}

if (parseCode.length > 0) {
  console.log('Found /parse endpoint at line', lineNum);
  console.log('\nEndpoint code:');
  parseCode.forEach(line => console.log(line));
  
  console.log('\n\nStep 3: Checking for common issues...\n');
  
  const codeStr = parseCode.join('\n');
  
  const issues = [];
  
  if (!codeStr.includes('multer')) {
    issues.push('- Missing multer middleware for file upload');
  }
  
  if (!codeStr.includes('req.file')) {
    issues.push('- Not accessing uploaded file via req.file');
  }
  
  if (!codeStr.includes('xlsx') && !codeStr.includes('XLSX')) {
    issues.push('- Missing xlsx library for Excel parsing');
  }
  
  if (!codeStr.includes('authenticateToken')) {
    issues.push('- Missing authentication middleware');
  }
  
  if (issues.length > 0) {
    console.log('Potential issues found:');
    issues.forEach(issue => console.log(issue));
  } else {
    console.log('No obvious issues found in code structure');
  }
} else {
  console.log('ERROR: /parse endpoint not found in platform-revenue.js');
}

console.log('\n=== Diagnosis Complete ===');
