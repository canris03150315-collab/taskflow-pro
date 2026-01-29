const fs = require('fs');
const path = require('path');

console.log('=== Diagnosing Frontend Login Code ===\n');

// Check if api.ts has the localStorage.setItem code
console.log('Step 1: Checking api.ts file...');
const apiPath = '/app/dist/services/api.js';

try {
  const apiContent = fs.readFileSync(apiPath, 'utf8');
  
  console.log('File found:', apiPath);
  console.log('File size:', apiContent.length, 'bytes');
  console.log('');
  
  // Check for localStorage.setItem in login function
  console.log('Step 2: Searching for localStorage.setItem in login...');
  
  const hasAuthToken = apiContent.includes("localStorage.setItem('auth_token'");
  const hasUserData = apiContent.includes("localStorage.setItem('user'");
  
  console.log('  Has auth_token setItem:', hasAuthToken ? 'YES' : 'NO');
  console.log('  Has user setItem:', hasUserData ? 'YES' : 'NO');
  console.log('');
  
  // Find the login function
  console.log('Step 3: Extracting login function...');
  const loginMatch = apiContent.match(/login:\s*async\s*\([^)]*\)[^{]*\{[\s\S]*?\n\s{8}\}/);
  
  if (loginMatch) {
    console.log('Login function found:');
    console.log('---START---');
    console.log(loginMatch[0].substring(0, 500));
    console.log('...');
    console.log('---END---');
  } else {
    console.log('ERROR: Could not find login function');
  }
  
  console.log('');
  console.log('Step 4: Checking compiled JavaScript...');
  
  // Check if the compiled JS has the setItem calls
  const loginFuncStart = apiContent.indexOf('login:');
  const loginFuncEnd = apiContent.indexOf('setup:', loginFuncStart);
  
  if (loginFuncStart > 0 && loginFuncEnd > loginFuncStart) {
    const loginFunc = apiContent.substring(loginFuncStart, loginFuncEnd);
    
    const hasSetAuthToken = loginFunc.includes("setItem('auth_token'") || loginFunc.includes('setItem("auth_token"');
    const hasSetUser = loginFunc.includes("setItem('user'") || loginFunc.includes('setItem("user"');
    
    console.log('In compiled login function:');
    console.log('  Sets auth_token:', hasSetAuthToken ? 'YES' : 'NO');
    console.log('  Sets user:', hasSetUser ? 'YES' : 'NO');
    
    if (!hasSetUser) {
      console.log('');
      console.log('ERROR: The compiled JavaScript does NOT have localStorage.setItem for user!');
      console.log('This means the TypeScript was not properly compiled.');
    }
  }
  
  console.log('');
  console.log('=== Diagnosis Complete ===');
  console.log('');
  
  if (hasUserData) {
    console.log('[INFO] The source code HAS the localStorage.setItem for user');
    console.log('[ACTION NEEDED] Need to rebuild frontend to compile TypeScript to JavaScript');
  } else {
    console.log('[ERROR] The source code is MISSING localStorage.setItem for user');
    console.log('[ACTION NEEDED] Need to add localStorage.setItem to api.ts');
  }
  
} catch (error) {
  console.error('ERROR reading file:', error.message);
  console.log('');
  console.log('Trying alternative path...');
  
  // Try to find the file
  const possiblePaths = [
    '/app/dist/services/api.js',
    '/app/services/api.js',
    '/app/dist/api.js'
  ];
  
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      console.log('Found file at:', p);
    }
  }
}
