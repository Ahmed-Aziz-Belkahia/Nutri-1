#!/usr/bin/env node

/**
 * Create a fresh database from the current schema
 * This script deletes the old database and creates a new one
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🗄️  Creating fresh database from schema...\n');

// Step 1: Backup old database if it exists
const dbPath = path.join(__dirname, 'local.db');
if (fs.existsSync(dbPath)) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupPath = path.join(__dirname, `local.db.backup.${timestamp}`);
  
  console.log('📦 Backing up old database...');
  try {
    fs.copyFileSync(dbPath, backupPath);
    console.log(`✅ Backup created: ${backupPath}\n`);
  } catch (error) {
    console.log(`⚠️  Could not backup database: ${error.message}\n`);
  }
}

// Step 2: Remove old database files
console.log('🗑️  Removing old database files...');
try {
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  if (fs.existsSync(dbPath + '-wal')) fs.unlinkSync(dbPath + '-wal');
  if (fs.existsSync(dbPath + '-shm')) fs.unlinkSync(dbPath + '-shm');
  console.log('✅ Old database files removed\n');
} catch (error) {
  console.log(`⚠️  Could not remove old files: ${error.message}\n`);
}

// Step 3: Create fresh database using drizzle-kit push
console.log('🏗️  Creating new database from db/schema.ts...');
console.log('Running: npx drizzle-kit push\n');

try {
  // Run drizzle-kit push to create database from schema
  execSync('npx drizzle-kit push', {
    cwd: __dirname,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
  
  console.log('\n✅ Database created successfully!\n');
  
  // Step 4: Verify database
  if (!fs.existsSync(dbPath)) {
    console.log('❌ Database file was not created!\n');
    process.exit(1);
  }
  
  // Import sqlite to check tables
  const Database = (await import('better-sqlite3')).default;
  const db = new Database(dbPath);
  
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' 
    ORDER BY name
  `).all();
  
  console.log(`📊 Database contains ${tables.length} tables:`);
  tables.forEach(table => {
    console.log(`   - ${table.name}`);
  });
  
  db.close();
  console.log('\n🎉 Fresh database ready to use!\n');
  
} catch (error) {
  console.error('\n❌ drizzle-kit push failed:', error.message);
  console.error('\nTrying emergency fallback: emergency-create-db.js...\n');
  
  try {
    execSync('node emergency-create-db.js', {
      cwd: __dirname,
      stdio: 'inherit'
    });
    console.log('\n✅ Database created using emergency method\n');
  } catch (fallbackError) {
    console.error('\n❌ Emergency method also failed:', fallbackError.message);
    console.error('\nLast resort: setup.js...\n');
    
    try {
      execSync('node setup.js', {
        cwd: __dirname,
        stdio: 'inherit'
      });
      console.log('\n✅ Database created using setup.js\n');
    } catch (finalError) {
      console.error('\n❌ All methods failed!');
      process.exit(1);
    }
  }
}
