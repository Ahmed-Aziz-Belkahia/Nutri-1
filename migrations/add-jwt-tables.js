/**
 * Database Migration: Add JWT Authentication Tables
 * 
 * This migration adds three new tables for JWT authentication:
 * 1. refresh_tokens - Store refresh tokens for persistent auth
 * 2. api_usage_tracking - Track OpenAI API usage for rate limiting
 * 3. user_token_limits - Manage user token limits and premium tiers
 * 
 * Run this script: node migrations/add-jwt-tables.js
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path
const dbPath = path.join(__dirname, '..', 'local.db');

console.log('[Migration] Starting JWT tables migration...');
console.log(`[Migration] Database path: ${dbPath}`);

try {
  // Open database
  const db = new Database(dbPath);
  
  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');
  
  console.log('[Migration] Database opened successfully');

  // Check if tables already exist
  const existingTables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' 
    AND name IN ('refresh_tokens', 'api_usage_tracking', 'user_token_limits')
  `).all();

  if (existingTables.length > 0) {
    console.log(`[Migration] ⚠️  Warning: ${existingTables.length} table(s) already exist:`);
    existingTables.forEach(table => console.log(`  - ${table.name}`));
    console.log('[Migration] Skipping migration to prevent data loss');
    console.log('[Migration] If you want to recreate tables, manually drop them first');
    db.close();
    process.exit(0);
  }

  // Start transaction
  console.log('[Migration] Starting transaction...');
  db.exec('BEGIN TRANSACTION');

  // 1. Create refresh_tokens table
  console.log('[Migration] Creating refresh_tokens table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at INTEGER NOT NULL,
      is_revoked INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Create indexes for refresh_tokens
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
  `);
  
  console.log('[Migration] ✅ refresh_tokens table created');

  // 2. Create api_usage_tracking table
  console.log('[Migration] Creating api_usage_tracking table...');
  db.exec(`
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
  `);

  // Create indexes for api_usage_tracking
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON api_usage_tracking(user_id);
    CREATE INDEX IF NOT EXISTS idx_api_usage_request_date ON api_usage_tracking(request_date);
    CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint ON api_usage_tracking(endpoint);
  `);
  
  console.log('[Migration] ✅ api_usage_tracking table created');

  // 3. Create user_token_limits table
  console.log('[Migration] Creating user_token_limits table...');
  db.exec(`
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
  `);

  // Create indexes for user_token_limits
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_user_token_limits_user_id ON user_token_limits(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_token_limits_tier ON user_token_limits(tier);
  `);
  
  console.log('[Migration] ✅ user_token_limits table created');

  // Initialize token limits for existing users
  console.log('[Migration] Initializing token limits for existing users...');
  const result = db.exec(`
    INSERT INTO user_token_limits (user_id, tier, daily_token_limit, monthly_token_limit, daily_used, monthly_used)
    SELECT 
      id,
      'free',
      10000,
      200000,
      0,
      0
    FROM users
    WHERE id NOT IN (SELECT user_id FROM user_token_limits);
  `);
  
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  console.log(`[Migration] ✅ Initialized token limits for ${userCount.count} existing user(s)`);

  // Commit transaction
  db.exec('COMMIT');
  console.log('[Migration] Transaction committed successfully');

  // Verify tables
  console.log('[Migration] Verifying tables...');
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' 
    AND name IN ('refresh_tokens', 'api_usage_tracking', 'user_token_limits')
    ORDER BY name
  `).all();

  console.log(`[Migration] ✅ Verified ${tables.length} tables created:`);
  tables.forEach(table => console.log(`  - ${table.name}`));

  // Close database
  db.close();
  console.log('[Migration] Database closed');
  console.log('[Migration] ✅ Migration completed successfully!');
  
  console.log('\n[Migration] Summary:');
  console.log('  ✅ refresh_tokens table created with indexes');
  console.log('  ✅ api_usage_tracking table created with indexes');
  console.log('  ✅ user_token_limits table created with indexes');
  console.log(`  ✅ Token limits initialized for ${userCount.count} user(s)`);
  console.log('\n[Migration] Next steps:');
  console.log('  1. Restart the server');
  console.log('  2. Test JWT authentication endpoints');
  console.log('  3. Verify user can login and access protected routes');
  
} catch (error) {
  console.error('[Migration] ❌ Error during migration:', error);
  console.error('[Migration] Rolling back...');
  
  try {
    const db = new Database(dbPath);
    db.exec('ROLLBACK');
    db.close();
    console.log('[Migration] Rollback successful');
  } catch (rollbackError) {
    console.error('[Migration] Rollback failed:', rollbackError);
  }
  
  process.exit(1);
}
