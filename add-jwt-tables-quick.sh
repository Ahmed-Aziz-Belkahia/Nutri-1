#!/bin/bash

# Quick fix: Add JWT tables to existing database
# Run this on VPS

echo "Adding JWT tables to database..."

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

-- Create indexes for refresh_tokens
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
  request_date INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  model TEXT,
  status TEXT NOT NULL DEFAULT 'success',
  metadata TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for api_usage_tracking
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
  last_reset_daily INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  last_reset_monthly INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for user_token_limits
CREATE INDEX IF NOT EXISTS idx_user_token_limits_user_id ON user_token_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_token_limits_tier ON user_token_limits(tier);

-- Initialize token limits for existing users
INSERT OR IGNORE INTO user_token_limits (user_id, tier, daily_token_limit, monthly_token_limit, daily_used, monthly_used)
SELECT 
  id,
  'free',
  10000,
  200000,
  0,
  0
FROM users
WHERE id NOT IN (SELECT user_id FROM user_token_limits);
EOF

echo ""
echo "✅ JWT tables created successfully!"
echo ""
echo "Verifying tables..."
sqlite3 local.db "SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE '%token%' OR name LIKE '%api_usage%') ORDER BY name;"
echo ""
echo "Counting existing users..."
user_count=$(sqlite3 local.db "SELECT COUNT(*) FROM users;")
echo "Users: $user_count"
echo ""
token_limits_count=$(sqlite3 local.db "SELECT COUNT(*) FROM user_token_limits;")
echo "Token limits initialized: $token_limits_count"
echo ""
echo "🔄 Restart PM2 for changes to take effect:"
echo "   pm2 restart myapp"
