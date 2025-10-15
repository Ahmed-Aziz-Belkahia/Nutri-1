// Migration to add missing quiz fields to user_dietary_preferences table
// These fields are collected during the meal planning quiz but were not being saved

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', 'local.db');
const db = new Database(dbPath);

console.log('🔄 Starting migration: Adding quiz fields to user_dietary_preferences...');

try {
  // Start transaction
  db.exec('BEGIN');

  // Add health_goals column (JSON array or string)
  try {
    db.exec(`
      ALTER TABLE user_dietary_preferences 
      ADD COLUMN health_goals TEXT;
    `);
    console.log('✅ Added health_goals column');
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('⏭️  health_goals column already exists, skipping');
    } else {
      throw error;
    }
  }

  // Add cuisine_preferences column (JSON array or string)
  try {
    db.exec(`
      ALTER TABLE user_dietary_preferences 
      ADD COLUMN cuisine_preferences TEXT;
    `);
    console.log('✅ Added cuisine_preferences column');
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('⏭️  cuisine_preferences column already exists, skipping');
    } else {
      throw error;
    }
  }

  // Add cooking_skill_level column (text: 'beginner', 'intermediate', 'advanced')
  try {
    db.exec(`
      ALTER TABLE user_dietary_preferences 
      ADD COLUMN cooking_skill_level TEXT;
    `);
    console.log('✅ Added cooking_skill_level column');
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('⏭️  cooking_skill_level column already exists, skipping');
    } else {
      throw error;
    }
  }

  // Commit transaction
  db.exec('COMMIT');
  
  console.log('✅ Migration completed successfully!');
  console.log('📊 Quiz answers (health goals, cuisine preferences, cooking skill) will now be saved and used for AI meal generation');
  
} catch (error) {
  // Rollback on error
  db.exec('ROLLBACK');
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
} finally {
  db.close();
}
