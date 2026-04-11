/**
 * Migration runner for VPS database
 * Run this on the VPS server to add recipe fields to food_logs table
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use VPS database path
const dbPath = process.env.DATABASE_PATH || join(__dirname, 'local.db');
console.log('Database path:', dbPath);

const db = new Database(dbPath);

console.log('🔄 Starting migration: Add recipe fields to food_logs...');

try {
  db.exec('BEGIN TRANSACTION');

  // Add recipe-like fields to food_logs table
  const alterStatements = [
    `ALTER TABLE food_logs ADD COLUMN description TEXT`,
    `ALTER TABLE food_logs ADD COLUMN ingredients TEXT`,
    `ALTER TABLE food_logs ADD COLUMN instructions TEXT`,
    `ALTER TABLE food_logs ADD COLUMN prep_time INTEGER`,
    `ALTER TABLE food_logs ADD COLUMN cook_time INTEGER`,
    `ALTER TABLE food_logs ADD COLUMN servings INTEGER DEFAULT 1`,
    `ALTER TABLE food_logs ADD COLUMN image_url TEXT`,
    `ALTER TABLE food_logs ADD COLUMN source TEXT DEFAULT 'scanned'`,
    `ALTER TABLE food_logs ADD COLUMN is_recipe INTEGER DEFAULT 0`,
    `ALTER TABLE food_logs ADD COLUMN recipe_id INTEGER REFERENCES recipes(id)`,
    `ALTER TABLE food_logs ADD COLUMN cuisine_type TEXT`,
    `ALTER TABLE food_logs ADD COLUMN meal_type TEXT`,
    `ALTER TABLE food_logs ADD COLUMN difficulty TEXT`,
    `ALTER TABLE food_logs ADD COLUMN tags TEXT`,
  ];

  // Execute each ALTER statement
  for (const statement of alterStatements) {
    try {
      db.exec(statement);
      console.log('✅', statement.split('ADD COLUMN')[1].split(' ')[1]);
    } catch (error) {
      // Column might already exist, that's okay
      if (error.message.includes('duplicate column name')) {
        console.log('⚠️  Column already exists:', statement.split('ADD COLUMN')[1].split(' ')[1]);
      } else {
        throw error;
      }
    }
  }

  db.exec('COMMIT');
  console.log('✅ Migration completed successfully!');
  console.log('');
  console.log('🎉 Food logs can now store full recipe information!');

} catch (error) {
  db.exec('ROLLBACK');
  console.error('❌ Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}
