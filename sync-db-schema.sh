#!/bin/bash

echo "=========================================="
echo "Syncing Database Schema with Drizzle"
echo "=========================================="
echo ""

echo "1. Checking current tables..."
echo "Current tables in database:"
sqlite3 local.db "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;" | head -20
echo ""

echo "2. Running Drizzle Push to sync schema..."
npx drizzle-kit push
echo ""

echo "3. Verifying JWT tables after push..."
jwt_tables=$(sqlite3 local.db "SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE '%token%' OR name = 'api_usage_tracking') ORDER BY name;")
if [ -z "$jwt_tables" ]; then
  echo "❌ JWT tables still missing!"
  echo ""
  echo "Manually creating tables..."
  sqlite3 local.db << 'EOF'
-- Create refresh_tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  is_revoked INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Create api_usage_tracking table
CREATE TABLE IF NOT EXISTS api_usage_tracking (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  endpoint TEXT NOT NULL,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0,
  request_date INTEGER NOT NULL,
  model TEXT,
  status TEXT NOT NULL DEFAULT 'success',
  metadata TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON api_usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_request_date ON api_usage_tracking(request_date);
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint ON api_usage_tracking(endpoint);

-- Create user_token_limits table
CREATE TABLE IF NOT EXISTS user_token_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  tier TEXT NOT NULL DEFAULT 'free',
  daily_token_limit INTEGER NOT NULL DEFAULT 10000,
  monthly_token_limit INTEGER NOT NULL DEFAULT 200000,
  daily_used INTEGER NOT NULL DEFAULT 0,
  monthly_used INTEGER NOT NULL DEFAULT 0,
  last_reset_daily INTEGER NOT NULL,
  last_reset_monthly INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_user_token_limits_user_id ON user_token_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_token_limits_tier ON user_token_limits(tier);
EOF
  echo "✅ Manual table creation complete"
else
  echo "✅ JWT tables found:"
  echo "$jwt_tables"
fi
echo ""

echo "4. Initializing token limits for existing users..."
user_count=$(sqlite3 local.db "SELECT COUNT(*) FROM users;")
echo "Found $user_count users"

sqlite3 local.db << 'EOF'
INSERT OR IGNORE INTO user_token_limits (user_id, tier, daily_token_limit, monthly_token_limit, daily_used, monthly_used, last_reset_daily, last_reset_monthly, updated_at)
SELECT 
  id,
  'free',
  10000,
  200000,
  0,
  0,
  strftime('%s', 'now'),
  strftime('%s', 'now'),
  strftime('%s', 'now')
FROM users
WHERE id NOT IN (SELECT user_id FROM user_token_limits);
EOF

token_limits=$(sqlite3 local.db "SELECT COUNT(*) FROM user_token_limits;")
echo "Token limits initialized: $token_limits"
echo ""

echo "5. Final verification..."
echo "All tables:"
sqlite3 local.db "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
echo ""

echo "=========================================="
echo "✅ Database schema sync complete!"
echo "=========================================="
echo ""
echo "🔄 Restart PM2 to apply changes:"
echo "   pm2 restart myapp"
echo ""
echo "🧪 Run tests:"
echo "   ./test-jwt-auth.sh"
