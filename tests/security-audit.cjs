/**
 * 企業管理系統 - 基本資安檢查腳本
 * 執行方式: node tests/security-audit.js
 */

const API_BASE = 'http://165.227.147.40:3000';
const fs = require('fs');
const path = require('path');

// 顏色輸出
const c = {
  green: (t) => `\x1b[32m${t}\x1b[0m`,
  red: (t) => `\x1b[31m${t}\x1b[0m`,
  yellow: (t) => `\x1b[33m${t}\x1b[0m`,
  cyan: (t) => `\x1b[36m${t}\x1b[0m`,
  bold: (t) => `\x1b[1m${t}\x1b[0m`,
};

// 檢查結果
const results = {
  passed: [],
  warnings: [],
  failed: [],
};

function pass(category, item, detail = '') {
  results.passed.push({ category, item, detail });
  console.log(c.green(`  ✓ ${item}`));
  if (detail) console.log(`    ${detail}`);
}

function warn(category, item, detail = '') {
  results.warnings.push({ category, item, detail });
  console.log(c.yellow(`  ⚠ ${item}`));
  if (detail) console.log(c.yellow(`    → ${detail}`));
}

function fail(category, item, detail = '') {
  results.failed.push({ category, item, detail });
  console.log(c.red(`  ✗ ${item}`));
  if (detail) console.log(c.red(`    → ${detail}`));
}

async function apiCall(method, endpoint, body, headers = {}) {
  try {
    const defaultHeaders = { 'Content-Type': 'application/json', ...headers };
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers: defaultHeaders,
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await response.json().catch(() => ({}));
    return { status: response.status, data, headers: response.headers };
  } catch (error) {
    return { status: 0, error: error.message };
  }
}

// ========== 檢查項目 ==========

async function checkAuthentication() {
  console.log(c.cyan('\n【1. 認證安全檢查】'));
  
  // 1.1 未授權存取
  const { status } = await apiCall('GET', '/api/users');
  if (status === 401) {
    pass('認證', '未授權請求被正確拒絕', 'API 端點需要認證才能存取');
  } else {
    fail('認證', '未授權請求未被拒絕', `回傳狀態碼: ${status}`);
  }

  // 1.2 無效 Token
  const { status: s2 } = await apiCall('GET', '/api/users', null, { 
    'Authorization': 'Bearer invalid_token_12345' 
  });
  if (s2 === 401 || s2 === 403) {
    pass('認證', '無效 Token 被正確拒絕');
  } else {
    fail('認證', '無效 Token 未被拒絕', `回傳狀態碼: ${s2}`);
  }

  // 1.3 空 Token
  const { status: s3 } = await apiCall('GET', '/api/users', null, { 
    'Authorization': '' 
  });
  if (s3 === 401) {
    pass('認證', '空 Token 被正確拒絕');
  } else {
    fail('認證', '空 Token 未被拒絕', `回傳狀態碼: ${s3}`);
  }
}

async function checkSQLInjection() {
  console.log(c.cyan('\n【2. SQL 注入防護檢查】'));
  
  const sqlPayloads = [
    "' OR '1'='1",
    "'; DROP TABLE users; --",
    "1; SELECT * FROM users",
    "admin'--",
  ];

  for (const payload of sqlPayloads) {
    const { status, data } = await apiCall('POST', '/api/auth/login', {
      username: payload,
      password: payload
    });
    
    // 應該回傳 401（認證失敗）而不是 500（伺服器錯誤）
    if (status === 401) {
      pass('SQL注入', `惡意輸入被安全處理: "${payload.substring(0, 20)}..."`);
    } else if (status === 500) {
      fail('SQL注入', `可能存在 SQL 注入風險`, `輸入: "${payload}" 導致伺服器錯誤`);
    } else {
      warn('SQL注入', `未預期的回應`, `狀態碼: ${status}`);
    }
  }
}

async function checkXSS() {
  console.log(c.cyan('\n【3. XSS 防護檢查】'));
  
  const xssPayloads = [
    '<script>alert("XSS")</script>',
    '"><img src=x onerror=alert(1)>',
    "javascript:alert('XSS')",
  ];

  // 測試登入端點
  for (const payload of xssPayloads) {
    const { status, data } = await apiCall('POST', '/api/auth/login', {
      username: payload,
      password: 'test'
    });
    
    // 檢查回應中是否直接包含未編碼的 payload
    const responseStr = JSON.stringify(data);
    if (responseStr.includes('<script>') || responseStr.includes('onerror=')) {
      fail('XSS', '回應中包含未編碼的惡意腳本');
    } else {
      pass('XSS', `惡意腳本輸入被安全處理`);
    }
  }
}

async function checkRateLimiting() {
  console.log(c.cyan('\n【4. 速率限制檢查】'));
  
  // 快速發送多個請求
  const requests = [];
  for (let i = 0; i < 20; i++) {
    requests.push(apiCall('POST', '/api/auth/login', {
      username: 'test',
      password: 'wrong'
    }));
  }
  
  const responses = await Promise.all(requests);
  const rateLimited = responses.some(r => r.status === 429);
  
  if (rateLimited) {
    pass('速率限制', '暴力攻擊防護已啟用', '連續錯誤登入會被限制');
  } else {
    warn('速率限制', '可能需要加強速率限制', '20 次連續請求都成功（建議設定登入限制）');
  }
}

async function checkSecurityHeaders() {
  console.log(c.cyan('\n【5. 安全標頭檢查】'));
  
  const { headers } = await apiCall('GET', '/api/health');
  
  // 檢查重要的安全標頭
  const securityHeaders = {
    'x-content-type-options': '防止 MIME 類型嗅探',
    'x-frame-options': '防止點擊劫持',
    'x-xss-protection': 'XSS 過濾器',
  };

  for (const [header, desc] of Object.entries(securityHeaders)) {
    if (headers?.get(header)) {
      pass('安全標頭', `${header}`, desc);
    } else {
      warn('安全標頭', `缺少 ${header}`, desc);
    }
  }
}

async function checkSensitiveDataExposure() {
  console.log(c.cyan('\n【6. 敏感資料保護檢查】'));
  
  // 檢查錯誤訊息是否洩漏敏感資訊
  const { data } = await apiCall('POST', '/api/auth/login', {
    username: 'nonexistent',
    password: 'wrong'
  });
  
  const errorStr = JSON.stringify(data).toLowerCase();
  
  // 檢查是否洩漏資料庫資訊
  if (errorStr.includes('sqlite') || errorStr.includes('mysql') || errorStr.includes('postgres')) {
    fail('資料洩漏', '錯誤訊息洩漏資料庫類型');
  } else {
    pass('資料洩漏', '錯誤訊息未洩漏資料庫資訊');
  }
  
  // 檢查是否區分「帳號不存在」和「密碼錯誤」
  if (errorStr.includes('帳號不存在') || errorStr.includes('user not found')) {
    warn('資料洩漏', '錯誤訊息可能洩漏帳號存在性', '建議統一使用「帳號或密碼錯誤」');
  } else {
    pass('資料洩漏', '錯誤訊息未洩漏帳號存在性');
  }
}

function checkSourceCode() {
  console.log(c.cyan('\n【7. 原始碼安全檢查】'));
  
  const serverDir = path.join(__dirname, '..', 'server', 'src');
  
  // 檢查是否有硬編碼的密碼或金鑰
  const patterns = [
    { pattern: /password\s*=\s*['"][^'"]+['"]/gi, desc: '硬編碼密碼' },
    { pattern: /api[_-]?key\s*=\s*['"][^'"]+['"]/gi, desc: '硬編碼 API 金鑰' },
    { pattern: /secret\s*=\s*['"][^'"]+['"]/gi, desc: '硬編碼密鑰' },
  ];

  try {
    const files = findFiles(serverDir, '.ts');
    let issues = 0;
    
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      for (const { pattern, desc } of patterns) {
        const matches = content.match(pattern);
        if (matches) {
          // 排除環境變數和範例
          const realMatches = matches.filter(m => 
            !m.includes('process.env') && 
            !m.includes('example') &&
            !m.includes('placeholder')
          );
          if (realMatches.length > 0) {
            warn('原始碼', `可能的${desc}`, `檔案: ${path.basename(file)}`);
            issues++;
          }
        }
      }
    }
    
    if (issues === 0) {
      pass('原始碼', '未發現硬編碼的敏感資料');
    }
  } catch (e) {
    warn('原始碼', '無法掃描原始碼', e.message);
  }
  
  // 檢查密碼加密
  try {
    const authFile = path.join(serverDir, 'routes', 'auth.ts');
    if (fs.existsSync(authFile)) {
      const content = fs.readFileSync(authFile, 'utf8');
      if (content.includes('bcrypt') || content.includes('argon2') || content.includes('scrypt')) {
        pass('原始碼', '密碼使用安全雜湊演算法');
      } else {
        warn('原始碼', '請確認密碼是否使用安全雜湊');
      }
    }
  } catch (e) {
    // 忽略
  }
}

function findFiles(dir, ext) {
  const files = [];
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory() && !item.includes('node_modules')) {
        files.push(...findFiles(fullPath, ext));
      } else if (item.endsWith(ext)) {
        files.push(fullPath);
      }
    }
  } catch (e) {}
  return files;
}

function generateReport() {
  console.log(c.cyan('\n═══════════════════════════════════════════════'));
  console.log(c.cyan('           資安檢查報告摘要'));
  console.log(c.cyan('═══════════════════════════════════════════════\n'));
  
  console.log(c.green(`  ✓ 通過: ${results.passed.length} 項`));
  console.log(c.yellow(`  ⚠ 警告: ${results.warnings.length} 項`));
  console.log(c.red(`  ✗ 失敗: ${results.failed.length} 項`));
  
  const total = results.passed.length + results.warnings.length + results.failed.length;
  const score = Math.round((results.passed.length / total) * 100);
  
  console.log(c.bold(`\n  安全分數: ${score}/100`));
  
  if (score >= 80) {
    console.log(c.green('\n  📊 評等: 良好'));
    console.log('  系統具備基本安全防護\n');
  } else if (score >= 60) {
    console.log(c.yellow('\n  📊 評等: 尚可'));
    console.log('  建議改善警告項目\n');
  } else {
    console.log(c.red('\n  📊 評等: 需改善'));
    console.log('  請優先處理失敗項目\n');
  }

  // 輸出詳細報告到檔案
  const reportDate = new Date().toISOString().split('T')[0];
  const reportContent = `
# 企業管理系統 資安檢查報告
生成時間: ${new Date().toLocaleString('zh-TW')}
目標系統: ${API_BASE}

## 摘要
- 通過: ${results.passed.length} 項
- 警告: ${results.warnings.length} 項
- 失敗: ${results.failed.length} 項
- 安全分數: ${score}/100

## 通過項目
${results.passed.map(r => `- [✓] ${r.item}${r.detail ? ` (${r.detail})` : ''}`).join('\n')}

## 警告項目
${results.warnings.map(r => `- [⚠] ${r.item}${r.detail ? `\n  → ${r.detail}` : ''}`).join('\n')}

## 失敗項目
${results.failed.map(r => `- [✗] ${r.item}${r.detail ? `\n  → ${r.detail}` : ''}`).join('\n')}

## 建議改善事項
${results.warnings.length > 0 ? results.warnings.map(r => `1. ${r.item}: ${r.detail}`).join('\n') : '無'}

## 免責聲明
此報告為自動化基本檢查結果，不等同於專業資安稽核。
如需正式認證，請洽詢專業資安公司。
`;

  const reportPath = path.join(__dirname, `security-report-${reportDate}.md`);
  fs.writeFileSync(reportPath, reportContent);
  console.log(`  📄 詳細報告已儲存: ${reportPath}\n`);
}

// ========== 主程式 ==========
async function main() {
  console.log(c.cyan('\n═══════════════════════════════════════════════'));
  console.log(c.cyan('       企業管理系統 基本資安檢查'));
  console.log(c.cyan('═══════════════════════════════════════════════'));
  console.log(`\n測試目標: ${API_BASE}`);
  console.log(`檢查時間: ${new Date().toLocaleString('zh-TW')}`);

  await checkAuthentication();
  await checkSQLInjection();
  await checkXSS();
  await checkRateLimiting();
  await checkSecurityHeaders();
  await checkSensitiveDataExposure();
  checkSourceCode();
  
  generateReport();
}

main().catch(err => {
  console.error(c.red('檢查執行錯誤:'), err);
  process.exit(1);
});
