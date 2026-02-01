#!/bin/bash

echo "=== Testing Platform Revenue API with Valid Token ==="
echo ""

# Step 1: Login
echo "Step 1: Login to get token..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"boss","password":"boss123"}')

echo "Login response: $LOGIN_RESPONSE"

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get token"
  exit 1
fi

echo "✅ Got token: ${TOKEN:0:50}..."
echo ""

# Step 2: Test platform-revenue API
echo "Step 2: Testing /api/platform-revenue/platforms..."
PLATFORMS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  http://localhost:3001/api/platform-revenue/platforms \
  -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$PLATFORMS_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$PLATFORMS_RESPONSE" | sed '/HTTP_CODE:/d')

echo "HTTP Status: $HTTP_CODE"
echo "Response: $BODY"

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ API call SUCCESSFUL!"
else
  echo "❌ API call failed with status $HTTP_CODE"
fi

echo ""
echo "=== Test Complete ==="
