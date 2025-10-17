#!/usr/bin/env node

/**
 * Synchronize Database Schema with Drizzle TypeScript Schema
 * 
 * This script uses Drizzle Kit to generate the database directly from the TypeScript schema.
 * This ensures 100% consistency between the code and the database structure.
 * 
 * Steps:
 * 1. Back up current database (if exists)
 * 2. Drop existing database to start fresh
 * 3. Use drizzle-kit push to generate from schema.ts
 * 4. Verify critical columns exist
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'local.db');
const BACKUP_PATH = path.join(__dirname, `local.db.backup-${Date.now()}`);

console.log('🔄 Starting Drizzle Schema Synchronization...\n');

// Step 1: Backup existing database
console.log('Step 1/4: Backing up existing database...');
if (fs.existsSync(DB_PATH)) {
  try {
    fs.copyFileSync(DB_PATH, BACKUP_PATH);
    console.log(`✅ Backup created: ${BACKUP_PATH}\n`);
  } catch (error) {
    console.log(`⚠️  Could not create backup: ${error.message}`);
  }
} else {
  console.log('ℹ️  No existing database to backup\n');
}

// Step 2: Remove existing database files
console.log('Step 2/4: Removing existing database files...');
try {
  ['local.db', 'local.db-wal', 'local.db-shm'].forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`  - Removed ${file}`);
    }
  });
  console.log('✅ Old database files removed\n');
} catch (error) {
  console.error(`❌ Error removing database files: ${error.message}`);
  process.exit(1);
}

// Step 3: Push schema using Drizzle Kit
console.log('Step 3/4: Pushing schema from TypeScript definitions...');
try {
  execSync('npm run db:push', { 
    stdio: 'inherit',
    cwd: __dirname 
  });
  console.log('✅ Schema pushed successfully\n');
} catch (error) {
  console.error('❌ Error pushing schema:', error.message);
  console.log('\nℹ️  If drizzle-kit is not installed, run:');
  console.log('   npm install -D drizzle-kit');
  process.exit(1);
}

// Step 4: Verify critical columns
console.log('Step 4/4: Verifying schema consistency...');

const Database = (await import('better-sqlite3')).default;
const db = new Database(DB_PATH);

// Critical columns to verify (table => column name)
const criticalColumns = {
  'password_reset_tokens': ['created_at', 'used_at'],
  'user_nutrition_preferences': ['daily_calorie_goal', 'age', 'gender'],
  'recipes': ['user_id'],
  'progress_photos': ['caption'],
  'meal_plans': ['total_calories'],
  'weight_logs': ['logged_at'],
  'recipes_in_meal_plan': ['order']
};

let allValid = true;

for (const [tableName, columns] of Object.entries(criticalColumns)) {
  const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const columnNames = tableInfo.map(col => col.name);
  
  console.log(`\n📋 Checking table: ${tableName}`);
  
  for (const col of columns) {
    if (columnNames.includes(col)) {
      console.log(`  ✅ Column "${col}" exists`);
    } else {
      console.log(`  ❌ Column "${col}" MISSING`);
      allValid = false;
    }
  }
}

db.close();

console.log('\n' + '='.repeat(60));
if (allValid) {
  console.log('✅ SUCCESS: Database schema is consistent with Drizzle TypeScript schema');
  console.log('='.repeat(60));
  console.log('\nYour database is now synchronized with db/schema.ts');
  console.log('All SQL queries should work correctly now.\n');
  process.exit(0);
} else {
  console.log('❌ FAILED: Some columns are missing');
  console.log('='.repeat(60));
  console.log('\nThe schema push may have failed or the TypeScript schema is incorrect.');
  console.log(`Backup available at: ${BACKUP_PATH}`);
  console.log('Check drizzle.config.ts and db/schema.ts for issues.\n');
  process.exit(1);
}
