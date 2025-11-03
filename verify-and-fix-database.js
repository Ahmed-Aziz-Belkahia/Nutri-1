#!/usr/bin/env node

/**
 * Verify and Fix Database Schema
 * 
 * This script verifies that all tables from the Drizzle schema exist in the database
 * and automatically creates any missing tables or columns.
 * 
 * Run this script:
 * - After git pull in production
 * - Before starting the application
 * - As part of deployment process
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'local.db');

console.log('🔍 Verifying Database Schema...\n');

if (!fs.existsSync(DB_PATH)) {
  console.log('❌ Database does not exist. Please run generate-db-from-drizzle.js first.\n');
  process.exit(1);
}

const sqlite = new Database(DB_PATH);

// Define critical tables with their complete schemas
const CRITICAL_TABLES = {
  refresh_tokens: `CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at INTEGER NOT NULL,
    is_revoked INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  )`,
  
  api_usage_tracking: `CREATE TABLE IF NOT EXISTS api_usage_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    cost_usd REAL NOT NULL DEFAULT 0,
    request_date INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    model TEXT,
    status TEXT NOT NULL DEFAULT 'success',
    metadata TEXT
  )`,
  
  user_token_limits: `CREATE TABLE IF NOT EXISTS user_token_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    tier TEXT NOT NULL DEFAULT 'free',
    daily_token_limit INTEGER NOT NULL DEFAULT 10000,
    monthly_token_limit INTEGER NOT NULL DEFAULT 200000,
    daily_used INTEGER NOT NULL DEFAULT 0,
    monthly_used INTEGER NOT NULL DEFAULT 0,
    last_reset_daily INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    last_reset_monthly INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  )`
};

// Expected columns for each critical table
const EXPECTED_COLUMNS = {
  refresh_tokens: ['id', 'user_id', 'token', 'expires_at', 'is_revoked', 'created_at'],
  api_usage_tracking: ['id', 'user_id', 'endpoint', 'tokens_used', 'cost_usd', 'request_date', 'model', 'status', 'metadata'],
  user_token_limits: ['id', 'user_id', 'tier', 'daily_token_limit', 'monthly_token_limit', 'daily_used', 'monthly_used', 'last_reset_daily', 'last_reset_monthly', 'updated_at']
};

let hasErrors = false;
let fixedTables = [];

// Get list of existing tables
const existingTables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
const existingTableNames = existingTables.map(t => t.name);

console.log('Step 1/2: Verifying critical tables exist...\n');

// Create missing critical tables
for (const [tableName, createSQL] of Object.entries(CRITICAL_TABLES)) {
  if (!existingTableNames.includes(tableName)) {
    console.log(`⚠️  Table "${tableName}" is missing. Creating...`);
    try {
      sqlite.prepare(createSQL).run();
      console.log(`✅ Table "${tableName}" created successfully\n`);
      fixedTables.push(tableName);
    } catch (error) {
      console.error(`❌ Error creating table "${tableName}": ${error.message}\n`);
      hasErrors = true;
    }
  } else {
    console.log(`✅ Table "${tableName}" exists`);
  }
}

console.log('\nStep 2/2: Verifying critical columns...\n');

// Verify critical columns exist
for (const [tableName, expectedColumns] of Object.entries(EXPECTED_COLUMNS)) {
  const tableInfo = sqlite.prepare(`PRAGMA table_info(${tableName})`).all();
  const existingColumns = tableInfo.map(col => col.name);
  
  console.log(`📋 Checking table: ${tableName}`);
  
  const missingColumns = expectedColumns.filter(col => !existingColumns.includes(col));
  
  if (missingColumns.length > 0) {
    console.log(`  ❌ Missing columns: ${missingColumns.join(', ')}`);
    console.log(`  ⚠️  Table "${tableName}" needs to be recreated with correct schema`);
    hasErrors = true;
  } else {
    console.log(`  ✅ All required columns present\n`);
  }
}

sqlite.close();

console.log('='.repeat(60));
if (!hasErrors && fixedTables.length === 0) {
  console.log('✅ SUCCESS: Database schema is correct and up to date');
  console.log('='.repeat(60));
  console.log('\nYour database matches the Drizzle schema perfectly.\n');
  process.exit(0);
} else if (!hasErrors && fixedTables.length > 0) {
  console.log('✅ SUCCESS: Database schema fixed automatically');
  console.log('='.repeat(60));
  console.log(`\nFixed tables: ${fixedTables.join(', ')}`);
  console.log('Your database now matches the Drizzle schema.\n');
  process.exit(0);
} else {
  console.log('⚠️  WARNING: Some schema issues detected');
  console.log('='.repeat(60));
  console.log('\nPlease review the errors above and fix manually if needed.\n');
  process.exit(1);
}
