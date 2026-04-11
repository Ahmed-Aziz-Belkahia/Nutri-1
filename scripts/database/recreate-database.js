import Database from "better-sqlite3";
import fs from "fs";

console.log("🔄 Recreating database from scratch...");

const dbPath = "./local.db";

// Remove old database files
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log("✓ Removed old database");
}
if (fs.existsSync(`${dbPath}-shm`)) fs.unlinkSync(`${dbPath}-shm`);
if (fs.existsSync(`${dbPath}-wal`)) fs.unlinkSync(`${dbPath}-wal`);

// Create new database
const db = new Database(dbPath);
console.log("✓ Created new database");

// Enable WAL mode
db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 30000");

// Read and execute schema
const schema = fs.readFileSync("./schema.sql", "utf-8");
const statements = schema
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

console.log(`\n📝 Executing ${statements.length} schema statements...`);
statements.forEach((statement, i) => {
  try {
    db.exec(statement);
    console.log(`✓ Statement ${i + 1}/${statements.length}`);
  } catch (error) {
    console.error(`❌ Failed at statement ${i + 1}:`, error.message);
    console.error("Statement:", statement.substring(0, 100));
  }
});

// Apply migrations
console.log("\n📦 Applying migrations...");

// 1. Add meal plan columns (if not exist)
try {
  db.exec(`
    ALTER TABLE recipes_in_meal_plan ADD COLUMN is_frozen INTEGER DEFAULT 1;
  `);
  console.log("✓ Added is_frozen column");
} catch (e) {
  console.log("⚠ is_frozen column already exists");
}

try {
  db.exec(`
    ALTER TABLE recipes_in_meal_plan ADD COLUMN is_completed INTEGER DEFAULT 0;
  `);
  console.log("✓ Added is_completed column");
} catch (e) {
  console.log("⚠ is_completed column already exists");
}

try {
  db.exec(`
    ALTER TABLE recipes_in_meal_plan ADD COLUMN completed_at INTEGER;
  `);
  console.log("✓ Added completed_at column");
} catch (e) {
  console.log("⚠ completed_at column already exists");
}

// 2. Rename order_num to order (if needed)
try {
  const result = db
    .prepare("PRAGMA table_info(recipes_in_meal_plan)")
    .all();
  const hasOrderNum = result.some((col) => col.name === "order_num");
  const hasOrder = result.some((col) => col.name === "order");

  if (hasOrderNum && !hasOrder) {
    // Create temp table with new schema
    db.exec(`
      CREATE TABLE recipes_in_meal_plan_new (
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
    `);

    // Copy data
    db.exec(`
      INSERT INTO recipes_in_meal_plan_new 
      SELECT id, meal_plan_id, recipe_id, meal_type, serving_size, 
             order_num as "order", is_frozen, is_completed, completed_at, created_at
      FROM recipes_in_meal_plan;
    `);

    // Drop old and rename
    db.exec(`DROP TABLE recipes_in_meal_plan;`);
    db.exec(`ALTER TABLE recipes_in_meal_plan_new RENAME TO recipes_in_meal_plan;`);
    console.log("✓ Renamed order_num to order");
  } else if (hasOrder) {
    console.log("⚠ order column already exists");
  }
} catch (e) {
  console.error("❌ Failed to rename order column:", e.message);
}

// 3. Add body fat columns (if not exist)
try {
  db.exec(`
    ALTER TABLE user_nutrition_preferences ADD COLUMN body_fat_percentage REAL;
  `);
  console.log("✓ Added body_fat_percentage column");
} catch (e) {
  console.log("⚠ body_fat_percentage column already exists");
}

try {
  db.exec(`
    ALTER TABLE user_nutrition_preferences ADD COLUMN body_type TEXT;
  `);
  console.log("✓ Added body_type column");
} catch (e) {
  console.log("⚠ body_type column already exists");
}

// 4. Create test user
console.log("\n👤 Creating test user...");
try {
  const existingUser = db
    .prepare("SELECT id FROM users WHERE id = 1")
    .get();
  if (!existingUser) {
    db.prepare(
      `INSERT INTO users (id, email, password, has_completed_onboarding) 
       VALUES (1, 'test@example.com', '$2a$10$test', 1)`
    ).run();
    console.log("✓ Created test user");
  } else {
    console.log("⚠ Test user already exists");
  }
} catch (e) {
  console.log("⚠ Test user creation:", e.message);
}

db.close();

console.log("\n✅ Database recreated successfully!");
console.log("🎯 Database has the latest schema with timestamp_ms mode");
console.log("📍 Location:", dbPath);
