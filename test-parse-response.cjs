const https = require('https');
const fs = require('fs');

console.log('=== Testing /parse Endpoint Response ===\n');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFkbWluLTE3Njc0NDk5MTQ3NjciLCJ1c2VybmFtZSI6ImNhbnJpcyIsInJvbGUiOiJCT1NTIiwiaWF0IjoxNzY5OTQ4NjYzLCJleHAiOjE3NzAwMzUwNjN9.FqNKxNiW67hm_pjTqz7Ql_Wd8KYWY61qmnuaZyNXwec';

const excelPath = 'C:\\Users\\USER\\Downloads\\平台帳變(備).xlsx';

if (!fs.existsSync(excelPath)) {
  console.log('ERROR: Excel file not found');
  process.exit(1);
}

const fileBuffer = fs.readFileSync(excelPath);
console.log('Excel file loaded:', fileBuffer.length, 'bytes\n');

const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);

const formDataParts = [
  `--${boundary}`,
  'Content-Disposition: form-data; name="file"; filename="test.xlsx"',
  'Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '',
  fileBuffer.toString('binary'),
  `--${boundary}--`
];

const formData = formDataParts.join('\r\n');

const options = {
  hostname: '165.227.147.40',
  port: 3001,
  path: '/api/platform-revenue/parse',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    'Content-Length': Buffer.byteLength(formData)
  },
  rejectUnauthorized: false
};

console.log('Sending request to backend...\n');

const req = https.request(options, (res) => {
  console.log('Response status:', res.statusCode);
  console.log('Response headers:', JSON.stringify(res.headers, null, 2));
  
  let body = '';
  
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    console.log('\nResponse body:');
    console.log(body);
    
    try {
      const json = JSON.parse(body);
      console.log('\nParsed JSON:');
      console.log(JSON.stringify(json, null, 2));
      
      if (json.success) {
        console.log('\n✅ Parse successful!');
        console.log('Total records:', json.total);
        console.log('New records:', json.newRecords?.length || 0);
        console.log('Duplicates:', json.duplicates?.length || 0);
      } else {
        console.log('\n❌ Parse failed');
      }
    } catch (error) {
      console.log('\n❌ Failed to parse JSON:', error.message);
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error.message);
});

req.write(formData);
req.end();

console.log('Request sent, waiting for response...\n');
