#!/bin/bash

echo "========================================="
echo "🧪 Testing JWT Authentication on VPS"
echo "========================================="
echo ""

BASE_URL="http://localhost:5000"

# Test 1: Register a new user
echo "Test 1: Register new user..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","name":"Test User"}')

echo "Response: $REGISTER_RESPONSE"
echo ""

# Extract token from response (if successful)
ACCESS_TOKEN=$(echo $REGISTER_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Registration failed or user already exists. Trying login..."
  echo ""
  
  # Test 2: Login with existing user
  echo "Test 2: Login..."
  LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"Test123!"}')
  
  echo "Response: $LOGIN_RESPONSE"
  echo ""
  
  ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
fi

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Could not get access token. Check the responses above."
  exit 1
fi

echo "✅ Got access token: ${ACCESS_TOKEN:0:50}..."
echo ""

# Test 3: Access protected route /api/auth/me
echo "Test 3: Access /api/auth/me with token..."
ME_RESPONSE=$(curl -s -X GET "$BASE_URL/api/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "Response: $ME_RESPONSE"
echo ""

if echo $ME_RESPONSE | grep -q "id"; then
  echo "✅ Protected route /api/auth/me works!"
else
  echo "❌ Protected route failed"
fi

echo ""

# Test 4: Access protected route /api/user
echo "Test 4: Access /api/user with token..."
USER_RESPONSE=$(curl -s -X GET "$BASE_URL/api/user" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "Response: $USER_RESPONSE"
echo ""

if echo $USER_RESPONSE | grep -q "email"; then
  echo "✅ Protected route /api/user works!"
else
  echo "❌ Protected route failed"
fi

echo ""
echo "========================================="
echo "🎉 JWT Testing Complete!"
echo "========================================="
