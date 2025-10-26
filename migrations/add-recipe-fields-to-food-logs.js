/**
 * Migration: Add recipe fields to food_logs table
 * Date: 2025-10-27
 * 
 * This migration enhances food_logs with recipe-like fields to unify
 * scanned meals with meal plan recipes, enabling:
 * - Full recipe information from AI scans
 * - Cooking instructions for logged meals
 * - Ingredients breakdown
 * - Recipe metadata (cuisine, difficulty, tags)
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', 'local.db');
const db = new Database(dbPath);

console.log('🔄 Starting migration: Add recipe fields to food_logs...');

try {
  db.exec('BEGIN TRANSACTION');

  // Add recipe-like fields to food_logs table
  const alterStatements = [
    // Text description of the meal/recipe
    `ALTER TABLE food_logs ADD COLUMN description TEXT`,
    
    // Structured ingredients list (JSON array)
    `ALTER TABLE food_logs ADD COLUMN ingredients TEXT`,
    
    // Cooking instructions (JSON array of steps)
    `ALTER TABLE food_logs ADD COLUMN instructions TEXT`,
    
    // Preparation time in minutes
    `ALTER TABLE food_logs ADD COLUMN prep_time INTEGER`,
    
    // Cooking time in minutes
    `ALTER TABLE food_logs ADD COLUMN cook_time INTEGER`,
    
    // Number of servings
    `ALTER TABLE food_logs ADD COLUMN servings INTEGER DEFAULT 1`,
    
    // Additional image URL field (separate from base64 image)
    `ALTER TABLE food_logs ADD COLUMN image_url TEXT`,
    
    // Source of the food log entry
    `ALTER TABLE food_logs ADD COLUMN source TEXT DEFAULT 'scanned'`,
    
    // Flag indicating if this is a full recipe
    `ALTER TABLE food_logs ADD COLUMN is_recipe INTEGER DEFAULT 0`,
    
    // Reference to recipes table if promoted
    `ALTER TABLE food_logs ADD COLUMN recipe_id INTEGER REFERENCES recipes(id)`,
    
    // Type of cuisine
    `ALTER TABLE food_logs ADD COLUMN cuisine_type TEXT`,
    
    // Meal category
    `ALTER TABLE food_logs ADD COLUMN meal_type TEXT`,
    
    // Difficulty level
    `ALTER TABLE food_logs ADD COLUMN difficulty TEXT`,
    
    // Tags for categorization (JSON array)
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
  console.log('📊 New fields added to food_logs:');
  console.log('   - description: Text description of the meal');
  console.log('   - ingredients: JSON array of structured ingredients');
  console.log('   - instructions: JSON array of cooking steps');
  console.log('   - prep_time: Preparation time in minutes');
  console.log('   - cook_time: Cooking time in minutes');
  console.log('   - servings: Number of servings');
  console.log('   - image_url: Additional image URL');
  console.log('   - source: Entry source (scanned/manual/ai-generated)');
  console.log('   - is_recipe: Boolean flag for full recipes');
  console.log('   - recipe_id: Link to recipes table');
  console.log('   - cuisine_type: Type of cuisine');
  console.log('   - meal_type: Meal category');
  console.log('   - difficulty: Cooking difficulty');
  console.log('   - tags: JSON array of tags');
  console.log('');
  console.log('🎉 Food logs can now store full recipe information!');

} catch (error) {
  db.exec('ROLLBACK');
  console.error('❌ Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}
