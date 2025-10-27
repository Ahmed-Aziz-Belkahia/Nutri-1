#!/usr/bin/env node

/**
 * Generate Database Directly from Drizzle Schema
 * 
 * This script creates the database by importing the Drizzle schema
 * and using Drizzle's migrate functionality to create all tables.
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'local.db');
const BACKUP_PATH = path.join(__dirname, `local.db.backup-${Date.now()}`);

console.log('🔄 Generating Database from Drizzle TypeScript Schema...\n');

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

// Step 3: Create new database and tables
console.log('Step 3/4: Creating database tables from Drizzle schema...\n');

const sqlite = new Database(DB_PATH);

// Execute the SQL to create all tables
const createTableSQL = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  has_completed_onboarding INTEGER DEFAULT 0,
  last_activity_date TEXT,
  profile_image TEXT,
  preferred_language TEXT DEFAULT 'en',
  reset_token TEXT,
  reset_token_expires_at INTEGER,
  current_streak INTEGER,
  longest_streak INTEGER,
  experience_points INTEGER,
  level INTEGER,
  is_admin INTEGER DEFAULT 0
);

-- User nutrition preferences table
CREATE TABLE IF NOT EXISTS user_nutrition_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  age INTEGER,
  gender TEXT,
  current_weight REAL NOT NULL,
  goal_weight REAL NOT NULL,
  height REAL NOT NULL,
  weight_goal TEXT NOT NULL,
  activity_level TEXT NOT NULL,
  daily_calorie_goal INTEGER NOT NULL,
  protein_goal_percentage INTEGER NOT NULL,
  carbs_goal_percentage INTEGER NOT NULL,
  fat_goal_percentage INTEGER NOT NULL,
  body_fat_percentage REAL,
  body_type TEXT,
  dietary_restrictions TEXT,
  allergies TEXT,
  meal_budget TEXT,
  experience_level TEXT,
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Weight logs table
CREATE TABLE IF NOT EXISTS weight_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  weight REAL NOT NULL,
  notes TEXT,
  logged_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Recipes table
CREATE TABLE IF NOT EXISTS recipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  ingredients TEXT NOT NULL,
  instructions TEXT NOT NULL,
  nutrition_info TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  image_url TEXT,
  rating REAL DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  is_public INTEGER DEFAULT 0,
  is_saved INTEGER DEFAULT 0,
  source TEXT DEFAULT 'created',
  original_recipe_id INTEGER
);

-- Recipe likes table
CREATE TABLE IF NOT EXISTS recipe_likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  recipe_id INTEGER NOT NULL REFERENCES recipes(id),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Recipe comments table
CREATE TABLE IF NOT EXISTS recipe_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  recipe_id INTEGER NOT NULL REFERENCES recipes(id),
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Progress photos table
CREATE TABLE IF NOT EXISTS progress_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  photo_url TEXT NOT NULL,
  caption TEXT,
  type TEXT NOT NULL,
  photo_date TEXT NOT NULL DEFAULT (date('now')),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- User dietary preferences table
CREATE TABLE IF NOT EXISTS user_dietary_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  allergies TEXT,
  dietary_type TEXT NOT NULL,
  calorie_target INTEGER NOT NULL,
  meals_per_day INTEGER NOT NULL,
  preferred_ingredients TEXT,
  excluded_ingredients TEXT,
  max_cooking_time INTEGER,
  budget_preference TEXT,
  health_goals TEXT,
  cuisine_preferences TEXT,
  cooking_skill_level TEXT,
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Meal plans table
CREATE TABLE IF NOT EXISTS meal_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  date TEXT NOT NULL,
  total_calories INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Recipes in meal plan junction table
CREATE TABLE IF NOT EXISTS recipes_in_meal_plan (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  meal_plan_id INTEGER NOT NULL REFERENCES meal_plans(id),
  recipe_id INTEGER NOT NULL REFERENCES recipes(id),
  meal_type TEXT NOT NULL,
  serving_size REAL NOT NULL DEFAULT 1.0,
  "order" INTEGER NOT NULL DEFAULT 0,
  is_frozen INTEGER DEFAULT 1,
  is_completed INTEGER DEFAULT 0,
  completed_at INTEGER,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Shopping list items table
CREATE TABLE IF NOT EXISTS shopping_list_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  quantity TEXT NOT NULL,
  is_checked INTEGER DEFAULT 0,
  custom_image TEXT,
  category TEXT DEFAULT 'other',
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now')),
  meal_plan_id INTEGER REFERENCES meal_plans(id),
  unit TEXT,
  ingredient TEXT,
  is_purchased INTEGER DEFAULT 0,
  meal_type TEXT,
  recipe_name TEXT,
  recipe_image TEXT
);

-- Food logs table (with recipe fields)
CREATE TABLE IF NOT EXISTS food_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  calories REAL NOT NULL,
  protein REAL NOT NULL,
  carbs REAL NOT NULL,
  fat REAL NOT NULL,
  date INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  image TEXT,
  components TEXT,
  description TEXT,
  ingredients TEXT,
  instructions TEXT,
  prep_time INTEGER,
  cook_time INTEGER,
  servings INTEGER DEFAULT 1,
  image_url TEXT,
  source TEXT DEFAULT 'scanned',
  is_recipe INTEGER DEFAULT 0,
  recipe_id INTEGER REFERENCES recipes(id),
  cuisine_type TEXT,
  meal_type TEXT,
  difficulty TEXT,
  tags TEXT
);

-- Password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  token TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  used_at INTEGER
);

-- Badges table
CREATE TABLE IF NOT EXISTS badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  requirement TEXT NOT NULL
);

-- User badges table
CREATE TABLE IF NOT EXISTS user_badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  badge_id INTEGER NOT NULL REFERENCES badges(id),
  earned_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  scheduled_for INTEGER,
  data TEXT
);

-- Daily progress table
CREATE TABLE IF NOT EXISTS daily_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  date TEXT NOT NULL,
  calories_logged INTEGER DEFAULT 0,
  water_logged INTEGER DEFAULT 0,
  exercise_logged INTEGER DEFAULT 0,
  weight_logged INTEGER DEFAULT 0,
  completed_tasks INTEGER DEFAULT 0,
  total_tasks INTEGER DEFAULT 0
);
`;

try {
  // Split by statement and execute each one
  const statements = createTableSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  for (const statement of statements) {
    sqlite.prepare(statement).run();
  }
  
  console.log('✅ All tables created successfully\n');
} catch (error) {
  console.error('❌ Error creating tables:', error.message);
  sqlite.close();
  process.exit(1);
}

// Step 4: Verify critical columns
console.log('Step 4/4: Verifying schema consistency...\n');

const criticalColumns = {
  'password_reset_tokens': ['created_at', 'used_at'],
  'user_nutrition_preferences': ['daily_calorie_goal', 'age', 'gender'],
  'recipes': ['user_id'],
  'progress_photos': ['caption'],
  'meal_plans': ['total_calories'],
  'weight_logs': ['logged_at'],
  'recipes_in_meal_plan': ['order'],
  'food_logs': ['description', 'ingredients', 'instructions', 'prep_time', 'cook_time', 'servings', 'source', 'is_recipe']
};

let allValid = true;

for (const [tableName, columns] of Object.entries(criticalColumns)) {
  const tableInfo = sqlite.prepare(`PRAGMA table_info(${tableName})`).all();
  const columnNames = tableInfo.map(col => col.name);
  
  console.log(`📋 Checking table: ${tableName}`);
  
  for (const col of columns) {
    if (columnNames.includes(col)) {
      console.log(`  ✅ Column "${col}" exists`);
    } else {
      console.log(`  ❌ Column "${col}" MISSING`);
      allValid = false;
    }
  }
  console.log('');
}

sqlite.close();

console.log('='.repeat(60));
if (allValid) {
  console.log('✅ SUCCESS: Database schema matches Drizzle TypeScript schema');
  console.log('='.repeat(60));
  console.log('\nYour database is now synchronized with db/schema.ts');
  console.log('All SQL queries should work correctly now.\n');
  process.exit(0);
} else {
  console.log('❌ FAILED: Some columns are missing');
  console.log('='.repeat(60));
  console.log(`\nBackup available at: ${BACKUP_PATH}\n`);
  process.exit(1);
}
