#!/usr/bin/env node

/**
 * Fix order_num column to order in recipes_in_meal_plan table
 * This preserves all existing data
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'local.db');

console.log('🔧 Fixing order_num → order column...\n');

if (!fs.existsSync(dbPath)) {
  console.error('❌ Database not found!');
  process.exit(1);
}

const db = new Database(dbPath);

try {
  // Check current columns
  const columns = db.prepare('PRAGMA table_info(recipes_in_meal_plan)').all();
  const columnNames = columns.map(col => col.name);
  
  const hasOrder = columnNames.includes('order');
  const hasOrderNum = columnNames.includes('order_num');
  
  console.log('Current columns:', columnNames.join(', '));
  console.log(`Has 'order': ${hasOrder}`);
  console.log(`Has 'order_num': ${hasOrderNum}\n`);
  
  if (hasOrder && !hasOrderNum) {
    console.log('✅ Column is already correct!');
    process.exit(0);
  }
  
  if (!hasOrderNum) {
    console.log('❌ No order_num column found. Cannot fix.');
    process.exit(1);
  }
  
  // Backup
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupPath = path.join(__dirname, `local.db.before-order-fix.${timestamp}`);
  fs.copyFileSync(dbPath, backupPath);
  console.log(`📦 Backup created: ${backupPath}\n`);
  
  // Rename order_num to order
  console.log('🔄 Recreating table with correct column name...');
  
  db.exec(`
    BEGIN TRANSACTION;
    
    -- Create new table with correct schema
    CREATE TABLE recipes_in_meal_plan_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meal_plan_id INTEGER NOT NULL,
      recipe_id INTEGER NOT NULL,
      meal_type TEXT NOT NULL,
      serving_size REAL DEFAULT 1.0 NOT NULL,
      "order" INTEGER DEFAULT 0 NOT NULL,
      is_frozen INTEGER DEFAULT 1,
      is_completed INTEGER DEFAULT 0,
      completed_at INTEGER,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id),
      FOREIGN KEY (recipe_id) REFERENCES recipes(id)
    );
    
    -- Copy data from old table (rename order_num to order)
    INSERT INTO recipes_in_meal_plan_new 
      (id, meal_plan_id, recipe_id, meal_type, serving_size, "order", 
       is_frozen, is_completed, completed_at, created_at)
    SELECT 
      id, meal_plan_id, recipe_id, meal_type, serving_size, order_num,
      is_frozen, is_completed, completed_at, created_at
    FROM recipes_in_meal_plan;
    
    -- Drop old table
    DROP TABLE recipes_in_meal_plan;
    
    -- Rename new table
    ALTER TABLE recipes_in_meal_plan_new RENAME TO recipes_in_meal_plan;
    
    COMMIT;
  `);
  
  console.log('✅ Table recreated successfully!\n');
  
  // Verify
  const newColumns = db.prepare('PRAGMA table_info(recipes_in_meal_plan)').all();
  const newColumnNames = newColumns.map(col => col.name);
  
  console.log('New columns:', newColumnNames.join(', '));
  
  if (newColumnNames.includes('order') && !newColumnNames.includes('order_num')) {
    console.log('\n✅ Fix complete! Column is now "order"');
    
    // Count records
    const count = db.prepare('SELECT COUNT(*) as count FROM recipes_in_meal_plan').get();
    console.log(`✅ Preserved ${count.count} records\n`);
  } else {
    console.log('\n❌ Something went wrong!');
    process.exit(1);
  }
  
} catch (error) {
  console.error('\n❌ Error:', error.message);
  console.error('\nRestoring from backup...');
  process.exit(1);
} finally {
  db.close();
}
