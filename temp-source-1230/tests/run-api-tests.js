/**
 * API 測試腳本
 * 直接用 Node.js 執行，不需要安裝額外套件
 * 使用方式: node tests/run-api-tests.js
 */

const API_BASE = 'http://165.227.147.40:3000';

// 顏色輸出
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
};

// 測試結果統計
let passed = 0;
let failed = 0;
const results = [];

// API 呼叫 helper
async function apiCall(method, endpoint, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await response.json().catch(() => ({}));
    return { status: response.status, data, ok: response.ok };
  } catch (error) {
    return { status: 0, data: null, error: error.message };
  }
}

// 測試函數
async function test(name, testFn) {
  try {
    await testFn();
    passed++;
    results.push({ name, status: 'PASS' });
    console.log(colors.green(`  ✓ ${name}`));
  } catch (error) {
    failed++;
    results.push({ name, status: 'FAIL', error: error.message });
    console.log(colors.red(`  ✗ ${name}`));
    console.log(colors.yellow(`    → ${error.message}`));
  }
}

// 斷言函數
function expect(actual) {
  return {
    toBe: (expected) => {
      if (actual !== expected) {
        throw new Error(`期望 ${expected}，但得到 ${actual}`);
      }
    },
    toContain: (expected) => {
      if (!Array.isArray(actual) || !actual.includes(expected)) {
        throw new Error(`期望陣列包含 ${expected}，但得到 ${JSON.stringify(actual)}`);
      }
    },
    toHaveProperty: (prop) => {
      if (actual === null || actual === undefined || !(prop in actual)) {
        throw new Error(`期望物件有屬性 "${prop}"，但沒有找到`);
      }
    },
    toBeOneOf: (options) => {
      if (!options.includes(actual)) {
        throw new Error(`期望 ${JSON.stringify(options)} 其中之一，但得到 ${actual}`);
      }
    }
  };
}

// 主要測試
async function runTests() {
  console.log(colors.cyan('\n═══════════════════════════════════════'));
  console.log(colors.cyan('       企業管理系統 API 測試'));
  console.log(colors.cyan('═══════════════════════════════════════\n'));
  console.log(`測試目標: ${API_BASE}\n`);

  // ===== 健康檢查 =====
  console.log(colors.cyan('【健康檢查】'));
  
  await test('GET /api/health 應該回傳 200', async () => {
    const { status, data } = await apiCall('GET', '/api/health');
    expect(status).toBe(200);
    expect(data).toHaveProperty('status');
  });

  await test('GET /api/version 應該回傳版本資訊', async () => {
    const { status, data } = await apiCall('GET', '/api/version');
    expect(status).toBe(200);
    expect(data).toHaveProperty('version');
  });

  // ===== 認證 API =====
  console.log(colors.cyan('\n【認證 API】'));

  await test('GET /api/auth/setup/check 應該回傳設置狀態', async () => {
    const { status, data } = await apiCall('GET', '/api/auth/setup/check');
    expect(status).toBe(200);
    expect(data).toHaveProperty('needsSetup');
  });

  await test('POST /api/auth/login 錯誤密碼應該回傳 401', async () => {
    const { status } = await apiCall('POST', '/api/auth/login', {
      username: 'testuser',
      password: 'wrongpassword'
    });
    expect(status).toBe(401);
  });

  await test('POST /api/auth/login 不存在的帳號應該回傳 401', async () => {
    const { status } = await apiCall('POST', '/api/auth/login', {
      username: 'nonexistent_user_12345',
      password: 'anypassword'
    });
    expect(status).toBe(401);
  });

  // ===== 受保護的端點 =====
  console.log(colors.cyan('\n【受保護的端點（無 Token）】'));

  await test('GET /api/users 無 token 應該回傳 401', async () => {
    const { status } = await apiCall('GET', '/api/users');
    expect(status).toBe(401);
  });

  await test('GET /api/departments 無 token 應該回傳 401', async () => {
    const { status } = await apiCall('GET', '/api/departments');
    expect(status).toBe(401);
  });

  await test('GET /api/tasks 無 token 應該回傳 401', async () => {
    const { status } = await apiCall('GET', '/api/tasks');
    expect(status).toBe(401);
  });

  await test('GET /api/announcements 無 token 應該回傳 401', async () => {
    const { status } = await apiCall('GET', '/api/announcements');
    expect(status).toBe(401);
  });

  // ===== 無效 Token =====
  console.log(colors.cyan('\n【無效 Token】'));

  await test('GET /api/users 無效 token 應該回傳 401 或 403', async () => {
    const { status } = await apiCall('GET', '/api/users', undefined, 'invalid-token');
    expect(status).toBeOneOf([401, 403]);
  });

  // ===== 結果摘要 =====
  console.log(colors.cyan('\n═══════════════════════════════════════'));
  console.log(colors.cyan('              測試結果'));
  console.log(colors.cyan('═══════════════════════════════════════\n'));
  
  console.log(`  ${colors.green(`通過: ${passed}`)}`);
  console.log(`  ${colors.red(`失敗: ${failed}`)}`);
  console.log(`  總計: ${passed + failed}\n`);

  if (failed === 0) {
    console.log(colors.green('🎉 所有測試通過！\n'));
  } else {
    console.log(colors.yellow('⚠️  部分測試失敗，請檢查上方錯誤訊息\n'));
  }

  // 輸出 JSON 結果（可選）
  // console.log(JSON.stringify({ passed, failed, results }, null, 2));

  process.exit(failed > 0 ? 1 : 0);
}

// 執行測試
runTests().catch(err => {
  console.error(colors.red('測試執行錯誤:'), err);
  process.exit(1);
});
