const fs = require('fs');
const path = require('path');

console.log('=== API Path Diagnosis ===\n');

// Check .env.production
console.log('Step 1: Check .env.production');
const envPath = path.join(__dirname, '.env.production');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  console.log('Content:', content);
} else {
  console.log('[ERROR] .env.production not found');
}
console.log('');

// Check netlify.toml
console.log('Step 2: Check netlify.toml');
const tomlPath = path.join(__dirname, 'netlify.toml');
if (fs.existsSync(tomlPath)) {
  const content = fs.readFileSync(tomlPath, 'utf8');
  const apiRedirect = content.match(/from = "\/api\/\*"[\s\S]*?to = "([^"]+)"/);
  if (apiRedirect) {
    console.log('API redirect to:', apiRedirect[1]);
  }
}
console.log('');

// Check BackupMonitorView.tsx
console.log('Step 3: Check BackupMonitorView.tsx');
const backupViewPath = path.join(__dirname, 'components', 'BackupMonitorView.tsx');
if (fs.existsSync(backupViewPath)) {
  const content = fs.readFileSync(backupViewPath, 'utf8');
  const fetchLine = content.match(/fetch\(`\$\{[^}]+\}([^`]+)`/);
  if (fetchLine) {
    console.log('Fetch path:', fetchLine[1]);
  }
}
console.log('');

// Check built index.js
console.log('Step 4: Check built files');
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  console.log('dist folder exists');
  const files = fs.readdirSync(path.join(distPath, 'assets')).filter(f => f.includes('BackupMonitor'));
  console.log('BackupMonitor files:', files);
  
  if (files.length > 0) {
    const filePath = path.join(distPath, 'assets', files[0]);
    const content = fs.readFileSync(filePath, 'utf8');
    const apiMatch = content.match(/\/backup\/status|\/api\/backup\/status/g);
    if (apiMatch) {
      console.log('Found API paths in built file:', [...new Set(apiMatch)]);
    }
  }
} else {
  console.log('[WARNING] dist folder not found');
}
console.log('');

console.log('=== Diagnosis Complete ===');
console.log('');
console.log('Expected behavior:');
console.log('1. VITE_API_URL should be "/api"');
console.log('2. Code should use "/backup/status"');
console.log('3. Final URL: /api/backup/status');
console.log('4. Netlify redirects to: http://165.227.147.40:3001/api/backup/status');
