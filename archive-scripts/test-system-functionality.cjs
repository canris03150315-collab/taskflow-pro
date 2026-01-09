const http = require('http');

// 測試配置
const BASE_URL = 'https://bejewelled-shortbread-a1aa30.netlify.app';
const API_URL = 'http://165.227.147.40:3000';

// 測試結果記錄
const testResults = [];

// 輔助函數
function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: body
                });
            });
        });
        
        req.on('error', reject);
        
        if (postData) {
            req.write(postData);
        }
        req.end();
    });
}

// 測試函數
async function testAPI(name, url, method = 'GET', data = null, headers = {}) {
    console.log(`\n🧪 測試: ${name}`);
    console.log(`   URL: ${url}`);
    
    try {
        const options = {
            hostname: new URL(url).hostname,
            port: new URL(url).port || (url.startsWith('https') ? 443 : 80),
            path: new URL(url).pathname + new URL(url).search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };
        
        const postData = data ? JSON.stringify(data) : null;
        if (postData) {
            options.headers['Content-Length'] = Buffer.byteLength(postData);
        }
        
        const response = await makeRequest(options, postData);
        
        console.log(`   狀態碼: ${response.statusCode}`);
        
        if (response.statusCode < 400) {
            console.log(`   ✅ 通過`);
            testResults.push({ name, status: 'PASS', statusCode: response.statusCode });
        } else {
            console.log(`   ❌ 失敗`);
            console.log(`   錯誤: ${response.body}`);
            testResults.push({ name, status: 'FAIL', statusCode: response.statusCode, error: response.body });
        }
        
        return response;
    } catch (error) {
        console.log(`   ❌ 錯誤: ${error.message}`);
        testResults.push({ name, status: 'ERROR', error: error.message });
        return null;
    }
}

// 主測試流程
async function runTests() {
    console.log('🚀 開始企業管理系統功能測試\n');
    console.log('=====================================');
    
    // 1. 健康檢查
    await testAPI('健康檢查', `${API_URL}/api/health`);
    
    // 2. 系統版本
    await testAPI('系統版本', `${API_URL}/api/version`);
    
    // 3. 檢查初始化狀態
    await testAPI('初始化檢查', `${API_URL}/api/auth/setup/check`);
    
    // 4. 嘗試登入（錯誤密碼）
    await testAPI('登入測試（錯誤密碼）', `${API_URL}/api/auth/login`, 'POST', {
        username: 'admin',
        password: 'wrong'
    });
    
    // 5. 獲取部門列表（無認證）
    await testAPI('部門列表（無認證）', `${API_URL}/api/departments`);
    
    // 6. 獲取任務列表（無認證）
    await testAPI('任務列表（無認證）', `${API_URL}/api/tasks`);
    
    // 7. 前端代理測試
    await testAPI('前端代理健康檢查', `${BASE_URL}/api/health`);
    
    // 8. 前端代理初始化檢查
    await testAPI('前端代理初始化檢查', `${BASE_URL}/api/auth/setup/check`);
    
    // 測試結果統計
    console.log('\n=====================================');
    console.log('\n📊 測試結果統計:');
    
    const passed = testResults.filter(r => r.status === 'PASS').length;
    const failed = testResults.filter(r => r.status === 'FAIL').length;
    const errors = testResults.filter(r => r.status === 'ERROR').length;
    
    console.log(`   ✅ 通過: ${passed}`);
    console.log(`   ❌ 失敗: ${failed}`);
    console.log(`   💥 錯誤: ${errors}`);
    console.log(`   📈 總計: ${testResults.length}`);
    
    // 顯示失敗的測試
    const failedTests = testResults.filter(r => r.status !== 'PASS');
    if (failedTests.length > 0) {
        console.log('\n❌ 失敗的測試:');
        failedTests.forEach(test => {
            console.log(`   - ${test.name}: ${test.error || `HTTP ${test.statusCode}`}`);
        });
    }
    
    console.log('\n🎯 建議:');
    if (failed === 0 && errors === 0) {
        console.log('   - 所有基本 API 測試通過');
        console.log('   - 可以開始進行功能測試');
        console.log('   - 請打開瀏覽器訪問: https://bejewelled-shortbread-a1aa30.netlify.app');
    } else {
        console.log('   - 請先修復失敗的 API');
        console.log('   - 檢查後端服務狀態');
        console.log('   - 確認網路連接正常');
    }
}

// 執行測試
runTests().catch(console.error);
