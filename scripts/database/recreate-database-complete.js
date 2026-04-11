#!/usr/bin/env node

/**
 * Comprehensive Database Recreation Script
 * 
 * This script DROPS and recreates ALL tables with complete schema.
 * Use this after deleting the database or when schema is corrupted.
 * 
 * Usage: node recreate-database-complete.js
 * 
 * Features:
 * - Creates all 20 tables with complete columns
 * - Ensures food_logs has all 24 required columns
 * - Creates JWT authentication tables
 * - Creates API tracking tables
 * - Adds performance indexes
 * - Validates schema after creation
 * - Backs up existing DB first
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'local.db');

console.log('🔧 COMPREHENSIVE DATABASE RECREATION\n');
console.log('⚠️  WARNING: This will DELETE ALL DATA and recreate tables!\n');

// Backup existing database
if (fs.existsSync(DB_PATH)) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const backupPath = path.join(__dirname, `local.db.backup.${timestamp}`);
  console.log(`📦 Creating backup: ${path.basename(backupPath)}`);
  fs.copyFileSync(DB_PATH, backupPath);
  console.log('✅ Backup created\n');
}

const db = new Database(DB_PATH);

try {
  db.exec('PRAGMA foreign_keys = ON');
  
  console.log('🗑️  Dropping existing tables...\n');
  
  // Drop in reverse dependency order
  const tables = [
    'user_badges', 'badges', 'recipe_comments', 'recipe_likes', 
    'recipes_in_meal_plan', 'shopping_list_items', 'meal_plans', 
    'recipes', 'food_logs', 'weight_logs', 'progress_photos',
    'daily_progress', 'notifications', 'password_reset_tokens',
    'user_dietary_preferences', 'user_nutrition_preferences',
    'refresh_tokens', 'user_token_limits', 'api_usage_tracking', 'users'
  ];
  
  for (const table of tables) {
    db.exec(`DROP TABLE IF EXISTS ${table}`);
    console.log(`  ✓ Dropped ${table}`);
  }
  
  console.log('\n🏗️  Creating tables with complete schema...\n');

  // 1. USERS
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      full_name TEXT,
      age INTEGER,
      gender TEXT,
      height REAL,
      current_weight REAL,
      goal_weight REAL,
      activity_level TEXT DEFAULT 'moderately_active',
      goal TEXT DEFAULT 'maintain',
      created_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
      updated_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
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
    )
  `);
  console.log('  ✅ users');

  // 2. USER NUTRITION PREFERENCES
  db.exec(`
    CREATE TABLE user_nutrition_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
      updated_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
    )
  `);
  console.log('  ✅ user_nutrition_preferences');

  // 3. FOOD LOGS - ALL 24 COLUMNS
  db.exec(`
    CREATE TABLE food_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
    )
  `);
  console.log('  ✅ food_logs (24 columns)');

  // 4. WEIGHT LOGS
  db.exec(`
    CREATE TABLE weight_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      weight REAL NOT NULL,
      notes TEXT,
      logged_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )
  `);
  console.log('  ✅ weight_logs');

  // 5. RECIPES
  db.exec(`
    CREATE TABLE recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      ingredients TEXT,
      instructions TEXT,
      nutrition_info TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
      updated_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
      image_url TEXT,
      rating REAL,
      likes_count INTEGER DEFAULT 0,
      comments_count INTEGER DEFAULT 0,
      is_public INTEGER DEFAULT 0,
      is_saved INTEGER DEFAULT 0,
      source TEXT DEFAULT 'created',
      original_recipe_id INTEGER REFERENCES recipes(id)
    )
  `);
  console.log('  ✅ recipes');

  // 6. RECIPE LIKES
  db.exec(`
    CREATE TABLE recipe_likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
      UNIQUE(recipe_id, user_id)
    )
  `);
  console.log('  ✅ recipe_likes');

  // 7. RECIPE COMMENTS
  db.exec(`
    CREATE TABLE recipe_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
      updated_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
    )
  `);
  console.log('  ✅ recipe_comments');

  // 8. PROGRESS PHOTOS
  db.exec(`
    CREATE TABLE progress_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      photo_url TEXT NOT NULL,
      caption TEXT,
      type TEXT NOT NULL,
      photo_date TEXT NOT NULL DEFAULT (date('now')),
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )
  `);
  console.log('  ✅ progress_photos');

  // 9. USER DIETARY PREFERENCES
  db.exec(`
    CREATE TABLE user_dietary_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      dietary_restrictions TEXT,
      allergies TEXT,
      cuisine_preferences TEXT,
      disliked_ingredients TEXT
    )
  `);
  console.log('  ✅ user_dietary_preferences');

  // 10. MEAL PLANS
  db.exec(`
    CREATE TABLE meal_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      total_calories INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )
  `);
  console.log('  ✅ meal_plans');

  // 11. RECIPES IN MEAL PLAN
  db.exec(`
    CREATE TABLE recipes_in_meal_plan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meal_plan_id INTEGER NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
      recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      meal_type TEXT NOT NULL,
      serving_size REAL NOT NULL DEFAULT 1.0,
      "order" INTEGER NOT NULL DEFAULT 0,
      is_frozen INTEGER DEFAULT 1,
      is_completed INTEGER DEFAULT 0,
      completed_at INTEGER,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);
  console.log('  ✅ recipes_in_meal_plan');

  // 12. SHOPPING LIST ITEMS
  db.exec(`
    CREATE TABLE shopping_list_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
    )
  `);
  console.log('  ✅ shopping_list_items');

  // 13. PASSWORD RESET TOKENS
  db.exec(`
    CREATE TABLE password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      used_at INTEGER
    )
  `);
  console.log('  ✅ password_reset_tokens');

  // 14. BADGES
  db.exec(`
    CREATE TABLE badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      icon_url TEXT,
      requirement_type TEXT NOT NULL,
      requirement_value INTEGER NOT NULL
    )
  `);
  console.log('  ✅ badges');

  // 15. USER BADGES
  db.exec(`
    CREATE TABLE user_badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      badge_id INTEGER NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
      earned_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
      UNIQUE(user_id, badge_id)
    )
  `);
  console.log('  ✅ user_badges');

  // 16. DAILY PROGRESS
  db.exec(`
    CREATE TABLE daily_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date INTEGER NOT NULL,
      calories_consumed REAL DEFAULT 0,
      protein_consumed REAL DEFAULT 0,
      carbs_consumed REAL DEFAULT 0,
      fat_consumed REAL DEFAULT 0,
      water_intake REAL DEFAULT 0,
      steps INTEGER DEFAULT 0,
      exercise_minutes INTEGER DEFAULT 0,
      UNIQUE(user_id, date)
    )
  `);
  console.log('  ✅ daily_progress');

  // 17. NOTIFICATIONS
  db.exec(`
    CREATE TABLE notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
      action_url TEXT,
      metadata TEXT
    )
  `);
  console.log('  ✅ notifications');

  // 18. REFRESH TOKENS (JWT)
  db.exec(`
    CREATE TABLE refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expires_at INTEGER NOT NULL,
      is_revoked INTEGER DEFAULT 0 NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
    )
  `);
  console.log('  ✅ refresh_tokens');

  // 19. USER TOKEN LIMITS (API tracking)
  db.exec(`
    CREATE TABLE user_token_limits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      tier TEXT DEFAULT 'free' NOT NULL,
      daily_token_limit INTEGER DEFAULT 10000 NOT NULL,
      monthly_token_limit INTEGER DEFAULT 200000 NOT NULL,
      daily_used INTEGER DEFAULT 0 NOT NULL,
      monthly_used INTEGER DEFAULT 0 NOT NULL,
      last_reset_daily INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
      last_reset_monthly INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
      updated_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
    )
  `);
  console.log('  ✅ user_token_limits');

  // 20. API USAGE TRACKING
  db.exec(`
    CREATE TABLE api_usage_tracking (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL,
      tokens_used INTEGER DEFAULT 0 NOT NULL,
      cost_usd REAL DEFAULT 0 NOT NULL,
      request_date INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
      model TEXT,
      status TEXT DEFAULT 'success' NOT NULL,
      metadata TEXT
    )
  `);
  console.log('  ✅ api_usage_tracking');

  // CREATE INDEXES
  console.log('\n📊 Creating performance indexes...\n');
  
  db.exec(`
    CREATE INDEX idx_food_logs_user_date ON food_logs(user_id, date);
    CREATE INDEX idx_food_logs_recipe ON food_logs(recipe_id);
    CREATE INDEX idx_recipes_user ON recipes(user_id);
    CREATE INDEX idx_recipe_likes_recipe ON recipe_likes(recipe_id);
    CREATE INDEX idx_recipe_likes_user ON recipe_likes(user_id);
    CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
    CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
    CREATE INDEX idx_notifications_user ON notifications(user_id);
    CREATE INDEX idx_daily_progress_user_date ON daily_progress(user_id, date);
  `);
  console.log('  ✅ 9 indexes created');

  // VALIDATE SCHEMA
  console.log('\n🔍 Validating schema...\n');
  
  const allTables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();

  console.log(`✅ Total tables: ${allTables.length}/20`);

  // Verify food_logs specifically
  const foodLogsColumns = db.prepare('PRAGMA table_info(food_logs)').all();
  console.log(`✅ food_logs columns: ${foodLogsColumns.length}/24`);
  
  const requiredColumns = [
    'id', 'user_id', 'name', 'calories', 'protein', 'carbs', 'fat', 'date',
    'image', 'components', 'description', 'ingredients', 'instructions',
    'prep_time', 'cook_time', 'servings', 'image_url', 'source', 'is_recipe',
    'recipe_id', 'cuisine_type', 'meal_type', 'difficulty', 'tags'
  ];
  
  const existing = foodLogsColumns.map(c => c.name);
  const missing = requiredColumns.filter(c => !existing.includes(c));
  
  if (missing.length > 0) {
    console.error(`\n❌ Missing columns in food_logs: ${missing.join(', ')}`);
    throw new Error('Schema validation failed');
  }

  console.log('\n✅ Schema validation passed!');
  console.log('\n📝 Summary:');
  console.log(`   • 20 tables created`);
  console.log(`   • 24 columns in food_logs (all required columns present)`);
  console.log(`   • JWT authentication tables created`);
  console.log(`   • API tracking tables created`);
  console.log(`   • 9 performance indexes created`);
  console.log(`   • Foreign keys enabled`);
  console.log('\n🎉 Database recreation completed successfully!');

} catch (error) {
  console.error('\n❌ Error during database recreation:', error.message);
  process.exit(1);
} finally {
  db.close();
}
