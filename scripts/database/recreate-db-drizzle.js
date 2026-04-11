import Database from "better-sqlite3";

console.log("🔄 Recreating database with correct SQLite schema...");

const dbPath = "./local.db";

// Create SQLite database
const sqlite = new Database(dbPath);
console.log("✓ Created new database");

// Enable WAL mode and set timeout
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("busy_timeout = 30000");
console.log("✓ Configured database settings");

// Create all tables by executing the schema
console.log("\n📦 Creating tables from TypeScript schema...");

try {
  // Create users table
  sqlite.exec(`
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
  `);
  console.log("✓ users");

  // Create food_logs table with MILLISECONDS (the fix!)
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS food_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
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
  console.log("✓ food_logs (with timestamp_ms fix!)");

  // Create user_nutrition_preferences table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS user_nutrition_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      user_id INTEGER NOT NULL,
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
      updated_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
  console.log("✓ user_nutrition_preferences");

  // Create recipes table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      ingredients TEXT NOT NULL,
      instructions TEXT NOT NULL,
      nutrition_info TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
      updated_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
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
  console.log("✓ recipes");

  // Create meal_plans table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS meal_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      total_calories INTEGER NOT NULL,
      status TEXT DEFAULT 'active' NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
      updated_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
  console.log("✓ meal_plans");

  // Create recipes_in_meal_plan table (with order column, not order_num)
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS recipes_in_meal_plan (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
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
  `);
  console.log("✓ recipes_in_meal_plan (with 'order' column)");

  // Create shopping_list_items table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS shopping_list_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
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
  console.log("✓ shopping_list_items");

  // Create weight_logs table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS weight_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      user_id INTEGER NOT NULL,
      weight REAL NOT NULL,
      notes TEXT,
      logged_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
  console.log("✓ weight_logs");

  // Create other tables
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS user_dietary_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      user_id INTEGER NOT NULL,
      allergies TEXT,
      dietary_type TEXT NOT NULL,
      calorie_target INTEGER NOT NULL,
      meals_per_day INTEGER NOT NULL,
      preferred_ingredients TEXT,
      excluded_ingredients TEXT,
      max_cooking_time INTEGER,
      budget_preference TEXT,
      updated_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
  console.log("✓ user_dietary_preferences");

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS daily_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
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
  console.log("✓ daily_progress");

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      requirement TEXT NOT NULL
    );
  `);
  console.log("✓ badges");

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS user_badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      user_id INTEGER NOT NULL,
      badge_id INTEGER NOT NULL,
      earned_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (badge_id) REFERENCES badges(id)
    );
  `);
  console.log("✓ user_badges");

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS recipe_likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      user_id INTEGER NOT NULL,
      recipe_id INTEGER NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (recipe_id) REFERENCES recipes(id)
    );
  `);
  console.log("✓ recipe_likes");

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS recipe_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      user_id INTEGER NOT NULL,
      recipe_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
      updated_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (recipe_id) REFERENCES recipes(id)
    );
  `);
  console.log("✓ recipe_comments");

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
      scheduled_for INTEGER,
      data TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
  console.log("✓ notifications");

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS progress_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      user_id INTEGER NOT NULL,
      photo_url TEXT NOT NULL,
      caption TEXT,
      type TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
  console.log("✓ progress_photos");

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
      used_at INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
  console.log("✓ password_reset_tokens");

  console.log("\n✅ All tables created successfully!");

  // Verify food_logs table
  const foodLogsInfo = sqlite.prepare("PRAGMA table_info(food_logs)").all();
  const dateColumn = foodLogsInfo.find((col) => col.name === "date");
  console.log(
    "\n🔍 Verification - food_logs.date column:",
    dateColumn.dflt_value
  );

  if (dateColumn.dflt_value.includes("* 1000")) {
    console.log("✅ CORRECT: Date column uses milliseconds!");
  } else {
    console.log("❌ WARNING: Date column might be using seconds");
  }

  sqlite.close();
} catch (error) {
  console.error("❌ Error creating tables:", error);
  sqlite.close();
  process.exit(1);
}

console.log("\n🎉 Database recreation complete!");
console.log("📍 Location:", dbPath);
