#!/bin/bash
# Test the eligible approvers API endpoint

echo "=== Testing Eligible Approvers API Endpoint ==="
echo ""

# Get token first (using Seven's credentials)
echo "1. Getting authentication token..."
TOKEN_RESPONSE=$(docker exec taskflow-pro node -e "
const Database = require('better-sqlite3');
const jwt = require('jsonwebtoken');
const db = new Database('/app/data/taskflow.db');

const user = db.prepare('SELECT * FROM users WHERE id = ?').get('admin-1767449914767');
const token = jwt.sign(
  { id: user.id, username: user.username, role: user.role },
  process.env.JWT_SECRET || 'your-secret-key-change-this-in-production',
  { expiresIn: '24h' }
);

console.log(token);
db.close();
")

echo "Token obtained: ${TOKEN_RESPONSE:0:50}..."
echo ""

# Test the API endpoint
echo "2. Testing GET /api/reports/approval/eligible-approvers"
echo ""

docker exec taskflow-pro curl -s -X GET \
  http://localhost:3000/api/reports/approval/eligible-approvers \
  -H "Authorization: Bearer $TOKEN_RESPONSE" \
  -H "Content-Type: application/json" | jq .

echo ""
echo "=== Test Complete ==="
