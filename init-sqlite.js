import Database from 'better-sqlite3';

console.log('Creating SQLite database and tables...');

// Create the database connection
const sqlite = new Database('./local.db');

// Manually create all tables
const createTablesSQL = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    has_completed_onboarding INTEGER DEFAULT false,
    last_activity_date TEXT,
    profile_image TEXT,
    preferred_language TEXT DEFAULT 'en',
    reset_token TEXT,
    reset_token_expires_at INTEGER,
    current_streak INTEGER,
    longest_streak INTEGER,
    experience_points INTEGER,
    level INTEGER,
    is_admin INTEGER DEFAULT false
);

-- Food logs table
CREATE TABLE IF NOT EXISTS food_logs (
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

-- User nutrition preferences table
CREATE TABLE IF NOT EXISTS user_nutrition_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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

-- Weight logs table
CREATE TABLE IF NOT EXISTS weight_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    weight REAL NOT NULL,
    notes TEXT,
    logged_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Recipes table
CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    is_public INTEGER DEFAULT false,
    is_saved INTEGER DEFAULT false,
    source TEXT DEFAULT 'created',
    original_recipe_id INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Recipe likes table
CREATE TABLE IF NOT EXISTS recipe_likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    recipe_id INTEGER NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (recipe_id) REFERENCES recipes(id)
);

-- Recipe comments table
CREATE TABLE IF NOT EXISTS recipe_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    recipe_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
    updated_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (recipe_id) REFERENCES recipes(id)
);

-- Progress photos table
CREATE TABLE IF NOT EXISTS progress_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    photo_url TEXT NOT NULL,
    caption TEXT,
    type TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- User dietary preferences table
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
    updated_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Meal plans table
CREATE TABLE IF NOT EXISTS meal_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    total_calories INTEGER NOT NULL,
    status TEXT DEFAULT 'active' NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
    updated_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Junction table for recipes in meal plans
CREATE TABLE IF NOT EXISTS recipes_in_meal_plan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meal_plan_id INTEGER NOT NULL,
    recipe_id INTEGER NOT NULL,
    meal_type TEXT NOT NULL,
    serving_size REAL DEFAULT 1.0 NOT NULL,
    order_num INTEGER DEFAULT 0 NOT NULL,
    is_frozen INTEGER DEFAULT true,
    is_completed INTEGER DEFAULT false,
    completed_at INTEGER,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id),
    FOREIGN KEY (recipe_id) REFERENCES recipes(id)
);

-- Shopping list items table
CREATE TABLE IF NOT EXISTS shopping_list_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    quantity TEXT NOT NULL,
    is_checked INTEGER DEFAULT false,
    custom_image TEXT,
    category TEXT DEFAULT 'other',
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
    meal_plan_id INTEGER,
    unit TEXT,
    ingredient TEXT,
    is_purchased INTEGER DEFAULT false,
    meal_type TEXT,
    recipe_name TEXT,
    recipe_image TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id)
);

-- Password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
    used_at INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Badges table
CREATE TABLE IF NOT EXISTS badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    requirement TEXT NOT NULL
);

-- User badges junction table
CREATE TABLE IF NOT EXISTS user_badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    badge_id INTEGER NOT NULL,
    earned_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (badge_id) REFERENCES badges(id)
);

-- Daily progress tracking
CREATE TABLE IF NOT EXISTS daily_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    calories_logged INTEGER DEFAULT false,
    water_logged INTEGER DEFAULT false,
    exercise_logged INTEGER DEFAULT false,
    weight_logged INTEGER DEFAULT false,
    completed_tasks INTEGER DEFAULT 0,
    total_tasks INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER DEFAULT false,
    created_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
    scheduled_for INTEGER,
    data TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
`;

// Execute the SQL commands
try {
    const statements = createTablesSQL.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
        sqlite.exec(statement);
    }
    
    console.log('✅ All tables created successfully!');
    console.log('✅ Local SQLite database is ready!');
} catch (error) {
    console.error('Error creating tables:', error);
} finally {
    sqlite.close();
}
