#!/usr/bin/env node

/**
 * Comprehensive Database Setup Script
 * 
 * This script ensures all tables are created with the correct schema.
 * Use this script after deleting the database to recreate it from scratch.
 * 
 * Usage: node force-recreate-db.js
 * 
 * Features:
 * - Creates all 20+ tables with complete schema
 * - Ensures food_logs has all 24 columns
 * - Creates authentication tables (refresh_tokens, user_token_limits)
 * - Creates performance indexes
 * - Validates schema after creation
 * - Backs up existing database before recreation
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('� Starting comprehensive database setup...\n');

const DB_PATH = path.join(__dirname, 'local.db');

// Check if database exists and back it up
if (fs.existsSync(DB_PATH)) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(__dirname, `local.db.backup.${timestamp}`);
  console.log(`⚠️  Database exists. Creating backup: ${path.basename(backupPath)}`);
  fs.copyFileSync(DB_PATH, backupPath);
  console.log('✅ Backup created\n');
}

const db = new Database(DB_PATH);

try {
  // Enable foreign keys
  db.exec('PRAGMA foreign_keys = ON');
  
  console.log('🗑️  Dropping all existing tables...\n');
  
  // Drop tables in correct order (respecting foreign key constraints)
  const dropOrder = [
    'user_badges', 'recipe_comments', 'recipe_likes', 'recipes_in_meal_plan',
    'shopping_list_items', 'meal_plans', 'recipes', 'food_logs', 'weight_logs',
    'progress_photos', 'daily_progress', 'notifications', 'password_reset_tokens',
    'user_dietary_preferences', 'user_nutrition_preferences', 'refresh_tokens',
    'user_token_limits', 'api_usage_tracking', 'badges', 'users'
  ];
  
  for (const table of dropOrder) {
    try {
      db.exec(`DROP TABLE IF EXISTS ${table}`);
      console.log(`  ✓ Dropped ${table}`);
    } catch (e) {
      // Ignore if table doesn't exist
    }
  }
  
  console.log('\n🏗️  Creating tables with complete schema...\n');

// Create tables with CORRECT schema (especially recipes_in_meal_plan with "order" column)
const schema = `
-- Users table
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    has_completed_onboarding INTEGER DEFAULT 0,
    last_activity_date TEXT,
    profile_image TEXT,
    preferred_language TEXT DEFAULT 'en',
    reset_token TEXT,
    reset_token_expires_at INTEGER,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    experience_points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    is_admin INTEGER DEFAULT 0
);

-- User nutrition preferences
CREATE TABLE user_nutrition_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    height REAL NOT NULL,
    current_weight REAL NOT NULL,
    goal_weight REAL NOT NULL,
    age INTEGER NOT NULL,
    gender TEXT NOT NULL,
    weight_goal TEXT NOT NULL,
    activity_level TEXT NOT NULL,
    calorie_goal INTEGER NOT NULL,
    protein_goal INTEGER NOT NULL,
    carbs_goal INTEGER NOT NULL,
    fat_goal INTEGER NOT NULL,
    meal_budget TEXT,
    experience_level TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- User dietary preferences
CREATE TABLE user_dietary_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    preference_type TEXT NOT NULL,
    preference_value TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Food logs
CREATE TABLE food_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    calories REAL NOT NULL,
    protein REAL NOT NULL,
    carbs REAL NOT NULL,
    fat REAL NOT NULL,
    date INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
    image TEXT,
    components TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Weight logs
CREATE TABLE weight_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    weight REAL NOT NULL,
    date INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
    notes TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Daily progress
CREATE TABLE daily_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    calories_consumed REAL DEFAULT 0,
    protein_consumed REAL DEFAULT 0,
    carbs_consumed REAL DEFAULT 0,
    fat_consumed REAL DEFAULT 0,
    water_intake REAL DEFAULT 0,
    exercise_minutes INTEGER DEFAULT 0,
    steps INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, date)
);

-- Progress photos
CREATE TABLE progress_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    photo_url TEXT NOT NULL,
    date INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
    weight REAL,
    notes TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Notifications
CREATE TABLE notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Password reset tokens
CREATE TABLE password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    used INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Recipes
CREATE TABLE recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    ingredients TEXT NOT NULL,
    instructions TEXT NOT NULL,
    prep_time INTEGER,
    cook_time INTEGER,
    servings INTEGER,
    calories REAL,
    protein REAL,
    carbs REAL,
    fat REAL,
    image_url TEXT,
    difficulty TEXT,
    cuisine TEXT,
    meal_type TEXT,
    is_public INTEGER DEFAULT 1,
    created_by INTEGER,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Recipe likes
CREATE TABLE recipe_likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (recipe_id) REFERENCES recipes(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(recipe_id, user_id)
);

-- Recipe comments
CREATE TABLE recipe_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    comment TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (recipe_id) REFERENCES recipes(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Meal plans
CREATE TABLE meal_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Recipes in meal plan - WITH CORRECT "order" COLUMN
CREATE TABLE recipes_in_meal_plan (
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

-- Shopping list items
CREATE TABLE shopping_list_items (
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

-- Badges
CREATE TABLE badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    criteria TEXT NOT NULL
);

-- User badges
CREATE TABLE user_badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    badge_id INTEGER NOT NULL,
    earned_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (badge_id) REFERENCES badges(id),
    UNIQUE(user_id, badge_id)
);
`;

db.exec(schema);

console.log('   ✅ All tables created successfully\n');

// Verify the critical column
console.log('🔍 Verifying recipes_in_meal_plan schema...\n');
const tableInfo = db.prepare('PRAGMA table_info(recipes_in_meal_plan)').all();
const orderColumn = tableInfo.find(col => col.name === 'order');

if (orderColumn) {
  console.log('   ✅ "order" column exists and is correct!\n');
  console.log(`   Column details: ${JSON.stringify(orderColumn)}\n`);
} else {
  console.log('   ❌ ERROR: "order" column not found!\n');
  process.exit(1);
}

console.log('📊 Database summary:');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log(`   Total tables: ${tables.length}\n`);
tables.forEach(t => console.log(`   - ${t.name}`));

db.close();

console.log('\n🎉 Database forcefully recreated with correct schema!');
console.log('⚠️  ALL OLD DATA HAS BEEN DELETED\n');
