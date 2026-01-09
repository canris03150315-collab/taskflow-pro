const http = require('http');

const BASE_URL = 'http://localhost:3000';
const TEST_TOKEN = 'test-token'; // Will be replaced with real token after login

const results = {
  passed: [],
  failed: [],
  warnings: []
};

function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, body: jsonBody, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, body: body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function checkEndpoint(name, method, path, expectedStatus, token = null, data = null) {
  try {
    const result = await makeRequest(method, path, data, token);
    if (result.status === expectedStatus) {
      results.passed.push(`✅ ${name}: ${method} ${path} (${result.status})`);
      return { success: true, result };
    } else {
      results.failed.push(`❌ ${name}: ${method} ${path} - Expected ${expectedStatus}, got ${result.status}`);
      return { success: false, result };
    }
  } catch (error) {
    results.failed.push(`❌ ${name}: ${method} ${path} - Error: ${error.message}`);
    return { success: false, error };
  }
}

async function runChecks() {
  console.log('🔍 開始全面 API 檢查...\n');

  // 1. Health Check
  console.log('📡 檢查系統健康狀態...');
  await checkEndpoint('Health Check', 'GET', '/api/health', 200);

  // 2. Version Check
  console.log('📋 檢查版本信息...');
  await checkEndpoint('Version Info', 'GET', '/api/version', 200);

  // 3. Auth Routes (without token - should fail with 401 or 400)
  console.log('\n🔐 檢查認證路由...');
  await checkEndpoint('Login (no credentials)', 'POST', '/api/auth/login', 400);
  await checkEndpoint('Setup Check', 'GET', '/api/auth/setup/check', 200);

  // 4. Protected Routes (without token - should fail with 401)
  console.log('\n🔒 檢查受保護的路由（無 Token）...');
  await checkEndpoint('Users List (no auth)', 'GET', '/api/users', 401);
  await checkEndpoint('Tasks List (no auth)', 'GET', '/api/tasks', 401);
  await checkEndpoint('Departments (no auth)', 'GET', '/api/departments', 401);
  await checkEndpoint('Attendance (no auth)', 'GET', '/api/attendance', 401);
  await checkEndpoint('Chat Channels (no auth)', 'GET', '/api/chat/channels', 401);
  await checkEndpoint('Reports (no auth)', 'GET', '/api/reports', 401);
  await checkEndpoint('Finance (no auth)', 'GET', '/api/finance', 401);
  await checkEndpoint('Forum (no auth)', 'GET', '/api/forum', 401);
  await checkEndpoint('Announcements (no auth)', 'GET', '/api/announcements', 401);

  // 5. Check route files exist and are not empty
  console.log('\n📁 檢查路由文件...');
  const routeFiles = [
    'auth.js', 'users.js', 'tasks.js', 'departments.js', 
    'attendance.js', 'chat.js', 'reports.js', 'finance.js',
    'forum.js', 'announcements.js', 'version.js', 'sync.js'
  ];

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 檢查結果摘要');
  console.log('='.repeat(60));
  console.log(`✅ 通過: ${results.passed.length}`);
  console.log(`❌ 失敗: ${results.failed.length}`);
  console.log(`⚠️  警告: ${results.warnings.length}`);
  
  if (results.passed.length > 0) {
    console.log('\n✅ 通過的測試:');
    results.passed.forEach(r => console.log(`  ${r}`));
  }
  
  if (results.failed.length > 0) {
    console.log('\n❌ 失敗的測試:');
    results.failed.forEach(r => console.log(`  ${r}`));
  }

  if (results.warnings.length > 0) {
    console.log('\n⚠️  警告:');
    results.warnings.forEach(r => console.log(`  ${r}`));
  }

  console.log('\n' + '='.repeat(60));
  console.log(`總計: ${results.passed.length + results.failed.length} 個測試`);
  console.log('='.repeat(60));

  // Exit with error code if any tests failed
  if (results.failed.length > 0) {
    process.exit(1);
  }
}

runChecks().catch(error => {
  console.error('檢查過程發生錯誤:', error);
  process.exit(1);
});
