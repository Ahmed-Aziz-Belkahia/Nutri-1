#!/usr/bin/env node

/**
 * Emergency database creation using direct SQL
 * This is a reliable fallback when drizzle-kit fails
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚨 Emergency database creation...\n');

const dbPath = path.join(__dirname, 'local.db');

// Backup if exists
if (fs.existsSync(dbPath)) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupPath = path.join(__dirname, `local.db.emergency-backup.${timestamp}`);
  fs.copyFileSync(dbPath, backupPath);
  console.log(`📦 Emergency backup: ${backupPath}\n`);
}

const db = new Database(dbPath);

console.log('🏗️  Creating tables...\n');

try {
  // Enable foreign keys
  db.exec('PRAGMA foreign_keys = ON;');

  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
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
  `);

  // User nutrition preferences with AGE and GENDER
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_nutrition_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
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
      updated_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Food logs
  db.exec(`
    CREATE TABLE IF NOT EXISTS food_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      calories REAL NOT NULL,
      protein REAL NOT NULL,
      carbs REAL NOT NULL,
      fat REAL NOT NULL,
      date INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
      image TEXT,
      components TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Weight logs
  db.exec(`
    CREATE TABLE IF NOT EXISTS weight_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      weight REAL NOT NULL,
      notes TEXT,
      logged_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Recipes
  db.exec(`
    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      ingredients TEXT NOT NULL,
      instructions TEXT NOT NULL,
      nutrition_info TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now')),
      image_url TEXT,
      rating REAL DEFAULT 0,
      likes_count INTEGER DEFAULT 0,
      comments_count INTEGER DEFAULT 0,
      is_public INTEGER DEFAULT 0,
      is_saved INTEGER DEFAULT 0,
      source TEXT DEFAULT 'created',
      original_recipe_id INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Recipe likes
  db.exec(`
    CREATE TABLE IF NOT EXISTS recipe_likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      recipe_id INTEGER NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (recipe_id) REFERENCES recipes(id)
    );
  `);

  // Recipe comments
  db.exec(`
    CREATE TABLE IF NOT EXISTS recipe_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      recipe_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (recipe_id) REFERENCES recipes(id)
    );
  `);

  // Progress photos with photo_date
  db.exec(`
    CREATE TABLE IF NOT EXISTS progress_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      photo_url TEXT NOT NULL,
      caption TEXT,
      type TEXT NOT NULL,
      photo_date TEXT DEFAULT (date('now')),
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // User dietary preferences
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_dietary_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
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
      updated_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Meal plans
  db.exec(`
    CREATE TABLE IF NOT EXISTS meal_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      total_calories INTEGER NOT NULL,
      status TEXT DEFAULT 'active',
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Recipes in meal plan (with 'order' column, not 'order_num')
  db.exec(`
    CREATE TABLE IF NOT EXISTS recipes_in_meal_plan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meal_plan_id INTEGER NOT NULL,
      recipe_id INTEGER NOT NULL,
      meal_type TEXT NOT NULL,
      serving_size REAL DEFAULT 1.0,
      "order" INTEGER DEFAULT 0,
      is_frozen INTEGER DEFAULT 1,
      is_completed INTEGER DEFAULT 0,
      completed_at INTEGER,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id),
      FOREIGN KEY (recipe_id) REFERENCES recipes(id)
    );
  `);

  // Shopping list items
  db.exec(`
    CREATE TABLE IF NOT EXISTS shopping_list_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      quantity TEXT NOT NULL,
      is_checked INTEGER DEFAULT 0,
      custom_image TEXT,
      category TEXT DEFAULT 'other',
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now')),
      meal_plan_id INTEGER,
      unit TEXT,
      ingredient TEXT,
      is_purchased INTEGER DEFAULT 0,
      meal_type TEXT,
      recipe_name TEXT,
      recipe_image TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id)
    );
  `);

  // Password reset tokens
  db.exec(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      used_at INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Badges
  db.exec(`
    CREATE TABLE IF NOT EXISTS badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      requirement TEXT NOT NULL
    );
  `);

  // User badges
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      badge_id INTEGER NOT NULL,
      earned_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (badge_id) REFERENCES badges(id)
    );
  `);

  // Daily progress
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      calories_logged INTEGER DEFAULT 0,
      water_logged INTEGER DEFAULT 0,
      exercise_logged INTEGER DEFAULT 0,
      weight_logged INTEGER DEFAULT 0,
      completed_tasks INTEGER DEFAULT 0,
      total_tasks INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Notifications
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      scheduled_for INTEGER,
      data TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Verify all tables
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' 
    ORDER BY name
  `).all();

  console.log(`✅ Created ${tables.length} tables:\n`);
  tables.forEach(table => {
    console.log(`   ✅ ${table.name}`);
  });

  // Verify age and gender columns exist
  const userPrefColumns = db.prepare(`PRAGMA table_info(user_nutrition_preferences)`).all();
  const hasAge = userPrefColumns.some(col => col.name === 'age');
  const hasGender = userPrefColumns.some(col => col.name === 'gender');
  
  console.log('\n📋 Critical columns check:');
  console.log(`   ${hasAge ? '✅' : '❌'} age column`);
  console.log(`   ${hasGender ? '✅' : '❌'} gender column`);

  db.close();
  
  console.log('\n🎉 Database created successfully!\n');
  process.exit(0);

} catch (error) {
  console.error('\n❌ Error creating database:', error.message);
  console.error(error.stack);
  process.exit(1);
}
