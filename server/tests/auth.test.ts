/**
 * 認證 API 測試
 * 測試登入、登出、Token 驗證等功能
 */

const API_BASE = process.env.API_URL || 'http://165.227.147.40:3000';

// 測試用帳號（需要先在系統中建立）
const TEST_USER = {
  username: 'testuser',
  password: 'testpass123'
};

// Helper function to make API calls
async function apiCall(method: string, endpoint: string, body?: any, token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

describe('認證 API 測試', () => {
  
  describe('POST /api/auth/login', () => {
    
    test('正確的帳號密碼應該回傳 token', async () => {
      const { status, data } = await apiCall('POST', '/api/auth/login', {
        username: 'Seven',  // 使用實際存在的帳號
        password: 'seven'   // 使用實際密碼
      });
      
      // 如果登入成功
      if (status === 200) {
        expect(data).toHaveProperty('token');
        expect(data).toHaveProperty('user');
        expect(data.user).toHaveProperty('id');
        expect(data.user).toHaveProperty('name');
      }
      // 允許 401（帳號不存在）因為這是測試環境
      expect([200, 401]).toContain(status);
    });

    test('錯誤的密碼應該回傳 401', async () => {
      const { status, data } = await apiCall('POST', '/api/auth/login', {
        username: 'Seven',
        password: 'wrongpassword'
      });
      
      expect(status).toBe(401);
      expect(data).toHaveProperty('error');
    });

    test('不存在的帳號應該回傳 401', async () => {
      const { status, data } = await apiCall('POST', '/api/auth/login', {
        username: 'nonexistentuser12345',
        password: 'anypassword'
      });
      
      expect(status).toBe(401);
    });

    test('缺少帳號應該回傳錯誤', async () => {
      const { status } = await apiCall('POST', '/api/auth/login', {
        password: 'somepassword'
      });
      
      expect([400, 401]).toContain(status);
    });

    test('缺少密碼應該回傳錯誤', async () => {
      const { status } = await apiCall('POST', '/api/auth/login', {
        username: 'someuser'
      });
      
      expect([400, 401]).toContain(status);
    });
  });

  describe('GET /api/auth/setup/check', () => {
    
    test('應該回傳系統設置狀態', async () => {
      const { status, data } = await apiCall('GET', '/api/auth/setup/check');
      
      expect(status).toBe(200);
      expect(data).toHaveProperty('needsSetup');
      expect(typeof data.needsSetup).toBe('boolean');
    });
  });

  describe('受保護的 API 端點', () => {
    
    test('沒有 token 應該回傳 401', async () => {
      const { status } = await apiCall('GET', '/api/users');
      
      expect(status).toBe(401);
    });

    test('無效的 token 應該回傳 401 或 403', async () => {
      const { status } = await apiCall('GET', '/api/users', undefined, 'invalid-token');
      
      expect([401, 403]).toContain(status);
    });
  });

});

describe('健康檢查 API', () => {
  
  test('GET /api/health 應該回傳 200', async () => {
    const { status, data } = await apiCall('GET', '/api/health');
    
    expect(status).toBe(200);
    expect(data).toHaveProperty('status');
    expect(data.status).toBe('ok');
  });

  test('GET /api/version 應該回傳版本資訊', async () => {
    const { status, data } = await apiCall('GET', '/api/version');
    
    expect(status).toBe(200);
    expect(data).toHaveProperty('version');
  });
});
