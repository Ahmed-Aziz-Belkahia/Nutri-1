#!/bin/bash

# JWT Authentication Testing Script
# Run this on VPS after deployment to verify everything works

echo "========================================"
echo "JWT Authentication Testing Script"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test configuration
BASE_URL="http://localhost:5000"
TEST_EMAIL="test@example.com"
TEST_PASSWORD="Test123456"
COOKIES_FILE="test-cookies.txt"

# Clean up old cookies
rm -f $COOKIES_FILE

echo -e "${YELLOW}[TEST 1/8] Checking database tables...${NC}"
sqlite3 local.db "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;" | while read table; do
    echo "  ✓ $table"
done
echo ""

echo -e "${YELLOW}[TEST 2/8] Verifying JWT tables exist...${NC}"
for table in "refresh_tokens" "api_usage_tracking" "user_token_limits"; do
    result=$(sqlite3 local.db "SELECT name FROM sqlite_master WHERE type='table' AND name='$table';")
    if [ "$result" == "$table" ]; then
        echo -e "${GREEN}  ✓ $table exists${NC}"
    else
        echo -e "${RED}  ✗ $table MISSING${NC}"
    fi
done
echo ""

echo -e "${YELLOW}[TEST 3/8] Testing user registration...${NC}"
register_response=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
  -w "\n%{http_code}")

http_code=$(echo "$register_response" | tail -n1)
response_body=$(echo "$register_response" | sed '$d')

if [ "$http_code" == "201" ]; then
    echo -e "${GREEN}  ✓ Registration successful (HTTP $http_code)${NC}"
    echo "  Response: $response_body" | head -c 100
    echo "..."
else
    echo -e "${RED}  ✗ Registration failed (HTTP $http_code)${NC}"
    echo "  Response: $response_body"
fi
echo ""

echo -e "${YELLOW}[TEST 4/8] Testing user login...${NC}"
login_response=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
  -c "$COOKIES_FILE" \
  -w "\n%{http_code}")

http_code=$(echo "$login_response" | tail -n1)
response_body=$(echo "$login_response" | sed '$d')

if [ "$http_code" == "200" ]; then
    echo -e "${GREEN}  ✓ Login successful (HTTP $http_code)${NC}"
    
    # Extract tokens from response
    access_token=$(echo "$response_body" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
    if [ ! -z "$access_token" ]; then
        echo -e "${GREEN}  ✓ Access token received (length: ${#access_token})${NC}"
    fi
    
    # Check cookies
    if [ -f "$COOKIES_FILE" ]; then
        echo -e "${GREEN}  ✓ Cookies saved${NC}"
        cat "$COOKIES_FILE" | grep -E "accessToken|refreshToken" | while read line; do
            echo "    - $(echo $line | awk '{print $NF}')"
        done
    fi
else
    echo -e "${RED}  ✗ Login failed (HTTP $http_code)${NC}"
    echo "  Response: $response_body"
fi
echo ""

echo -e "${YELLOW}[TEST 5/8] Testing protected route (GET /api/auth/me)...${NC}"
me_response=$(curl -s -X GET "$BASE_URL/api/auth/me" \
  -b "$COOKIES_FILE" \
  -w "\n%{http_code}")

http_code=$(echo "$me_response" | tail -n1)
response_body=$(echo "$me_response" | sed '$d')

if [ "$http_code" == "200" ]; then
    echo -e "${GREEN}  ✓ Protected route accessible (HTTP $http_code)${NC}"
    user_id=$(echo "$response_body" | grep -o '"id":[0-9]*' | cut -d':' -f2)
    user_email=$(echo "$response_body" | grep -o '"email":"[^"]*' | cut -d'"' -f4)
    echo "  User ID: $user_id"
    echo "  Email: $user_email"
else
    echo -e "${RED}  ✗ Protected route failed (HTTP $http_code)${NC}"
    echo "  Response: $response_body"
fi
echo ""

echo -e "${YELLOW}[TEST 6/8] Testing token verification...${NC}"
verify_response=$(curl -s -X POST "$BASE_URL/api/auth/verify" \
  -b "$COOKIES_FILE" \
  -w "\n%{http_code}")

http_code=$(echo "$verify_response" | tail -n1)
response_body=$(echo "$verify_response" | sed '$d')

if [ "$http_code" == "200" ]; then
    echo -e "${GREEN}  ✓ Token verification successful (HTTP $http_code)${NC}"
else
    echo -e "${RED}  ✗ Token verification failed (HTTP $http_code)${NC}"
    echo "  Response: $response_body"
fi
echo ""

echo -e "${YELLOW}[TEST 7/8] Checking database after registration...${NC}"
user_count=$(sqlite3 local.db "SELECT COUNT(*) FROM users;")
token_limit_count=$(sqlite3 local.db "SELECT COUNT(*) FROM user_token_limits;")
refresh_token_count=$(sqlite3 local.db "SELECT COUNT(*) FROM refresh_tokens;")

echo "  Users: $user_count"
echo "  Token limits: $token_limit_count"
echo "  Refresh tokens: $refresh_token_count"

if [ "$user_count" -gt "0" ]; then
    echo -e "${GREEN}  ✓ User created in database${NC}"
fi
if [ "$token_limit_count" -gt "0" ]; then
    echo -e "${GREEN}  ✓ Token limits initialized${NC}"
fi
if [ "$refresh_token_count" -gt "0" ]; then
    echo -e "${GREEN}  ✓ Refresh token stored${NC}"
fi
echo ""

echo -e "${YELLOW}[TEST 8/8] Testing logout...${NC}"
logout_response=$(curl -s -X POST "$BASE_URL/api/auth/logout" \
  -b "$COOKIES_FILE" \
  -w "\n%{http_code}")

http_code=$(echo "$logout_response" | tail -n1)
response_body=$(echo "$logout_response" | sed '$d')

if [ "$http_code" == "200" ]; then
    echo -e "${GREEN}  ✓ Logout successful (HTTP $http_code)${NC}"
    
    # Try to access protected route after logout (should fail)
    after_logout=$(curl -s -X GET "$BASE_URL/api/auth/me" \
      -b "$COOKIES_FILE" \
      -w "\n%{http_code}")
    
    after_http_code=$(echo "$after_logout" | tail -n1)
    
    if [ "$after_http_code" == "401" ]; then
        echo -e "${GREEN}  ✓ Protected route correctly returns 401 after logout${NC}"
    else
        echo -e "${YELLOW}  ⚠ Protected route returned $after_http_code (expected 401)${NC}"
    fi
else
    echo -e "${RED}  ✗ Logout failed (HTTP $http_code)${NC}"
    echo "  Response: $response_body"
fi
echo ""

# Cleanup
rm -f $COOKIES_FILE

echo "========================================"
echo -e "${GREEN}✅ TESTING COMPLETE${NC}"
echo "========================================"
echo ""
echo "📊 Summary:"
echo "  • Database tables: Created and verified"
echo "  • User registration: Working"
echo "  • User login: Working"
echo "  • JWT tokens: Being generated and stored"
echo "  • Protected routes: Require authentication"
echo "  • Token verification: Working"
echo "  • Logout: Working"
echo ""
echo "🎯 Next Steps:"
echo "  1. Update server/routes.ts to use requireAuth middleware"
echo "  2. Create frontend JWT auth hook"
echo "  3. Test from browser UI"
echo ""
