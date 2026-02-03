const http = require('http');

const BASE_URL = 'localhost';
const PORT = 3000;
let authToken = '';

const results = {
  passed: [],
  failed: [],
  total: 0
};

function request(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch {
            resolve(body);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
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

async function test(name, fn) {
  results.total++;
  try {
    await fn();
    results.passed.push(name);
    console.log(`✅ ${name}`);
  } catch (error) {
    results.failed.push({ name, error: error.message });
    console.log(`❌ ${name}: ${error.message}`);
  }
}

async function login() {
  const response = await request('POST', '/api/auth/login', {
    username: 'admin',
    password: 'admin123'
  });
  authToken = response.token;
}

async function runTests() {
  console.log('=== TaskFlow Pro API 自動化測試 ===\n');

  await test('1. 登入 API', async () => {
    await login();
    if (!authToken) throw new Error('未獲取到 token');
  });

  const headers = { Authorization: `Bearer ${authToken}` };

  await test('2. 用戶列表 API', async () => {
    const res = await request('GET', '/api/users', null, headers);
    if (!Array.isArray(res)) throw new Error('返回格式錯誤');
  });

  await test('3. 部門列表 API', async () => {
    const res = await request('GET', '/api/departments', null, headers);
    if (!Array.isArray(res)) throw new Error('返回格式錯誤');
  });

  await test('4. 打卡記錄 API', async () => {
    const res = await request('GET', '/api/attendance', null, headers);
    if (!Array.isArray(res)) throw new Error('返回格式錯誤');
  });

  await test('5. 工作報表 API', async () => {
    const res = await request('GET', '/api/work-logs', null, headers);
    if (!Array.isArray(res)) throw new Error('返回格式錯誤');
  });

  await test('6. 報表中心 API', async () => {
    const res = await request('GET', '/api/reports', null, headers);
    if (!Array.isArray(res)) throw new Error('返回格式錯誤');
  });

  await test('7. 公告列表 API', async () => {
    const res = await request('GET', '/api/announcements', null, headers);
    if (!Array.isArray(res)) throw new Error('返回格式錯誤');
  });

  await test('8. 任務列表 API', async () => {
    const res = await request('GET', '/api/tasks', null, headers);
    if (!Array.isArray(res)) throw new Error('返回格式錯誤');
  });

  await test('9. 排班列表 API', async () => {
    const res = await request('GET', '/api/schedules', null, headers);
    if (!Array.isArray(res)) throw new Error('返回格式錯誤');
  });

  await test('10. 財務記錄 API', async () => {
    const res = await request('GET', '/api/finance', null, headers);
    if (!Array.isArray(res)) throw new Error('返回格式錯誤');
  });

  await test('11. KOL 列表 API', async () => {
    const res = await request('GET', '/api/kol/profiles', null, headers);
    if (!Array.isArray(res)) throw new Error('返回格式錯誤');
  });

  await test('12. 請假記錄 API', async () => {
    const res = await request('GET', '/api/leave-requests', null, headers);
    if (!Array.isArray(res)) throw new Error('返回格式錯誤');
  });

  await test('13. 建議箱 API', async () => {
    const res = await request('GET', '/api/suggestions', null, headers);
    if (!Array.isArray(res)) throw new Error('返回格式錯誤');
  });

  await test('14. 備忘錄 API', async () => {
    const res = await request('GET', '/api/memos', null, headers);
    if (!Array.isArray(res)) throw new Error('返回格式錯誤');
  });

  await test('15. 聊天對話 API', async () => {
    const res = await request('GET', '/api/chat/conversations', null, headers);
    if (!Array.isArray(res)) throw new Error('返回格式錯誤');
  });

  await test('16. AI 對話 API', async () => {
    const res = await request('GET', '/api/ai/conversations', null, headers);
    if (!Array.isArray(res)) throw new Error('返回格式錯誤');
  });

  await test('17. 審計日誌 API', async () => {
    const res = await request('GET', '/api/audit-logs', null, headers);
    if (!Array.isArray(res)) throw new Error('返回格式錯誤');
  });

  console.log('\n=== 測試結果 ===');
  console.log(`總測試數: ${results.total}`);
  console.log(`通過: ${results.passed.length} (${(results.passed.length/results.total*100).toFixed(1)}%)`);
  console.log(`失敗: ${results.failed.length}`);
  
  if (results.failed.length > 0) {
    console.log('\n失敗的測試:');
    results.failed.forEach(f => {
      console.log(`  ❌ ${f.name}: ${f.error}`);
    });
    console.log('\n建議：檢查失敗的 API 端點和相關功能');
  } else {
    console.log('\n✅ 所有 API 測試通過！');
  }

  console.log('\n=== 測試完成 ===');
  
  process.exit(results.failed.length > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error('測試執行失敗:', error);
  process.exit(1);
});
