const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
let authToken = '';

const results = {
  passed: [],
  failed: [],
  total: 0
};

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
  const response = await axios.post(`${BASE_URL}/api/auth/login`, {
    username: 'admin',
    password: 'admin123'
  });
  authToken = response.data.token;
}

async function runTests() {
  console.log('=== TaskFlow Pro API 自動化測試 ===\n');

  await test('1. 登入 API', async () => {
    await login();
    if (!authToken) throw new Error('未獲取到 token');
  });

  const headers = { Authorization: `Bearer ${authToken}` };

  await test('2. 用戶列表 API', async () => {
    const res = await axios.get(`${BASE_URL}/api/users`, { headers });
    if (!Array.isArray(res.data)) throw new Error('返回格式錯誤');
  });

  await test('3. 部門列表 API', async () => {
    const res = await axios.get(`${BASE_URL}/api/departments`, { headers });
    if (!Array.isArray(res.data)) throw new Error('返回格式錯誤');
  });

  await test('4. 打卡記錄 API', async () => {
    const res = await axios.get(`${BASE_URL}/api/attendance`, { headers });
    if (!Array.isArray(res.data)) throw new Error('返回格式錯誤');
  });

  await test('5. 工作報表 API', async () => {
    const res = await axios.get(`${BASE_URL}/api/work-logs`, { headers });
    if (!Array.isArray(res.data)) throw new Error('返回格式錯誤');
  });

  await test('6. 報表中心 API', async () => {
    const res = await axios.get(`${BASE_URL}/api/reports`, { headers });
    if (!Array.isArray(res.data)) throw new Error('返回格式錯誤');
  });

  await test('7. 公告列表 API', async () => {
    const res = await axios.get(`${BASE_URL}/api/announcements`, { headers });
    if (!Array.isArray(res.data)) throw new Error('返回格式錯誤');
  });

  await test('8. 任務列表 API', async () => {
    const res = await axios.get(`${BASE_URL}/api/tasks`, { headers });
    if (!Array.isArray(res.data)) throw new Error('返回格式錯誤');
  });

  await test('9. 排班列表 API', async () => {
    const res = await axios.get(`${BASE_URL}/api/schedules`, { headers });
    if (!Array.isArray(res.data)) throw new Error('返回格式錯誤');
  });

  await test('10. 財務記錄 API', async () => {
    const res = await axios.get(`${BASE_URL}/api/finance`, { headers });
    if (!Array.isArray(res.data)) throw new Error('返回格式錯誤');
  });

  await test('11. KOL 列表 API', async () => {
    const res = await axios.get(`${BASE_URL}/api/kol/profiles`, { headers });
    if (!Array.isArray(res.data)) throw new Error('返回格式錯誤');
  });

  await test('12. 請假記錄 API', async () => {
    const res = await axios.get(`${BASE_URL}/api/leave-requests`, { headers });
    if (!Array.isArray(res.data)) throw new Error('返回格式錯誤');
  });

  await test('13. 建議箱 API', async () => {
    const res = await axios.get(`${BASE_URL}/api/suggestions`, { headers });
    if (!Array.isArray(res.data)) throw new Error('返回格式錯誤');
  });

  await test('14. 備忘錄 API', async () => {
    const res = await axios.get(`${BASE_URL}/api/memos`, { headers });
    if (!Array.isArray(res.data)) throw new Error('返回格式錯誤');
  });

  await test('15. 聊天對話 API', async () => {
    const res = await axios.get(`${BASE_URL}/api/chat/conversations`, { headers });
    if (!Array.isArray(res.data)) throw new Error('返回格式錯誤');
  });

  await test('16. AI 對話 API', async () => {
    const res = await axios.get(`${BASE_URL}/api/ai/conversations`, { headers });
    if (!Array.isArray(res.data)) throw new Error('返回格式錯誤');
  });

  await test('17. 審計日誌 API', async () => {
    const res = await axios.get(`${BASE_URL}/api/audit-logs`, { headers });
    if (!Array.isArray(res.data)) throw new Error('返回格式錯誤');
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
  }

  console.log('\n=== 測試完成 ===');
  
  process.exit(results.failed.length > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error('測試執行失敗:', error);
  process.exit(1);
});
