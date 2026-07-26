#!/usr/bin/env node
/**
 * Reset the local SQLite database to a clean state matching db/schema.ts.
 *
 * Drops the existing local.db (after backing it up) and recreates every table
 * from scratch. Use this instead of `drizzle-kit push`, which prompts
 * interactively for create-vs-rename decisions and therefore cannot run
 * headless (in CI, or from a non-TTY shell).
 *
 *   node scripts/reset-db.js           # backs up, then recreates
 *   node scripts/reset-db.js --no-backup
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dbPath = process.env.DATABASE_PATH || path.resolve(process.cwd(), 'local.db');
const backup = !process.argv.includes('--no-backup');

// Back up anything that is already there before destroying it.
if (fs.existsSync(dbPath) && backup) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${dbPath}.backup-${stamp}`;
  fs.copyFileSync(dbPath, backupPath);
  console.log(`Backed up existing database -> ${path.basename(backupPath)}`);
}

// Remove the database and its write-ahead-log sidecars.
for (const suffix of ['', '-shm', '-wal']) {
  const f = dbPath + suffix;
  if (fs.existsSync(f)) fs.rmSync(f);
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Table order matters: parents before children, so the FK references resolve.
db.exec(`
CREATE TABLE users (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  username text NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  password text NOT NULL,
  has_completed_onboarding integer DEFAULT 0,
  last_activity_date text,
  profile_image text,
  preferred_language text DEFAULT 'en',
  reset_token text,
  reset_token_expires_at integer,
  is_email_verified integer DEFAULT 0,
  verification_code text,
  verification_code_expires_at integer,
  current_streak integer,
  longest_streak integer,
  experience_points integer,
  level integer,
  is_admin integer DEFAULT 0,
  apple_sub text,
  apple_email text,
  is_private_relay_email integer DEFAULT 0,
  auth_provider text DEFAULT 'local',
  email_verified_via text,
  last_login_at integer
);

CREATE TABLE pending_registrations (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  email text NOT NULL UNIQUE,
  password text NOT NULL,
  verification_code text NOT NULL,
  verification_code_expires_at integer NOT NULL,
  profile_data text,
  created_at integer DEFAULT (unixepoch()) NOT NULL
);

CREATE TABLE recipes (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  user_id integer NOT NULL REFERENCES users(id),
  name text NOT NULL,
  description text,
  ingredients text NOT NULL,
  instructions text NOT NULL,
  nutrition_info text,
  created_at integer DEFAULT (strftime('%s', 'now')) NOT NULL,
  updated_at integer DEFAULT (strftime('%s', 'now')) NOT NULL,
  image_url text,
  rating real DEFAULT 0,
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  is_public integer DEFAULT 0,
  is_saved integer DEFAULT 0,
  source text DEFAULT 'created',
  original_recipe_id integer
);

CREATE TABLE food_logs (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  user_id integer NOT NULL REFERENCES users(id),
  name text NOT NULL,
  calories real NOT NULL,
  protein real NOT NULL,
  carbs real NOT NULL,
  fat real NOT NULL,
  date integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
  image text,
  components text,
  description text,
  ingredients text,
  instructions text,
  prep_time integer,
  cook_time integer,
  servings integer DEFAULT 1,
  image_url text,
  source text DEFAULT 'scanned',
  is_recipe integer DEFAULT 0,
  recipe_id integer REFERENCES recipes(id),
  cuisine_type text,
  meal_type text,
  difficulty text,
  tags text
);

CREATE TABLE user_nutrition_preferences (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  user_id integer NOT NULL REFERENCES users(id),
  age integer,
  gender text,
  current_weight real,
  goal_weight real,
  height real,
  weight_goal text,
  activity_level text,
  daily_calorie_goal integer,
  protein_goal_percentage integer,
  carbs_goal_percentage integer,
  fat_goal_percentage integer,
  body_fat_percentage real,
  body_type text,
  dietary_restrictions text,
  allergies text,
  weight_loss_speed real,
  weight_gain_speed real,
  obstacles text,
  accomplishments text,
  referral_source text,
  has_used_other_apps integer,
  birth_month integer,
  birth_day integer,
  birth_year integer,
  is_metric integer,
  workout_frequency text,
  height_feet integer,
  height_inches integer,
  weight_lbs real,
  goal_weight_lbs real,
  meal_budget text,
  experience_level text,
  updated_at integer DEFAULT (strftime('%s', 'now')) NOT NULL
);

CREATE TABLE password_reset_tokens (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  user_id integer NOT NULL REFERENCES users(id),
  token text NOT NULL,
  expires_at integer NOT NULL,
  created_at integer DEFAULT (strftime('%s', 'now')) NOT NULL,
  used_at integer
);

CREATE TABLE refresh_tokens (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at integer NOT NULL,
  is_revoked integer DEFAULT 0 NOT NULL,
  created_at integer DEFAULT (strftime('%s', 'now')) NOT NULL
);

CREATE TABLE api_usage_tracking (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  tokens_used integer DEFAULT 0 NOT NULL,
  cost_usd real DEFAULT 0 NOT NULL,
  request_date integer DEFAULT (strftime('%s', 'now')) NOT NULL,
  model text,
  status text DEFAULT 'success' NOT NULL,
  metadata text
);

CREATE TABLE user_token_limits (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  user_id integer NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  tier text DEFAULT 'free' NOT NULL,
  daily_token_limit integer DEFAULT 10000 NOT NULL,
  monthly_token_limit integer DEFAULT 200000 NOT NULL,
  daily_used integer DEFAULT 0 NOT NULL,
  monthly_used integer DEFAULT 0 NOT NULL,
  last_reset_daily integer DEFAULT (strftime('%s', 'now')) NOT NULL,
  last_reset_monthly integer DEFAULT (strftime('%s', 'now')) NOT NULL,
  updated_at integer DEFAULT (strftime('%s', 'now')) NOT NULL
);

CREATE INDEX idx_food_logs_user_date ON food_logs(user_id, date);
CREATE INDEX idx_recipes_user ON recipes(user_id);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_api_usage_user_date ON api_usage_tracking(user_id, request_date);
`);

const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
  .all()
  .map((r) => r.name);

console.log(`\nDatabase reset: ${dbPath}`);
console.log(`${tables.length} tables created: ${tables.join(', ')}`);
db.close();
