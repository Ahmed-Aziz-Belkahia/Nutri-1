import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DATABASE_PATH || path.resolve(process.cwd(), 'local.db');

console.log('🔄 Consolidating order columns in recipes_in_meal_plan table...');
console.log('Database path:', dbPath);

try {
  const db = new Database(dbPath);
  
  // Check current columns
  const tableInfo = db.prepare("PRAGMA table_info(recipes_in_meal_plan)").all();
  const columnNames = tableInfo.map((col) => col.name);
  
  console.log('Current columns:', columnNames);
  
  const hasOrderNum = columnNames.includes('order_num');
  const hasOrder = columnNames.includes('order');
  
  if (hasOrderNum && hasOrder) {
    console.log('\n⚠️  Found both "order_num" and "order" columns');
    console.log('Copying data from order_num to order...');
    
    // Copy data from order_num to order
    db.prepare('UPDATE recipes_in_meal_plan SET "order" = order_num').run();
    console.log('✅ Data copied');
    
    // SQLite doesn't support DROP COLUMN easily, so we need to recreate the table
    console.log('\nRecreating table without order_num...');
    
    // Start transaction
    db.prepare('BEGIN TRANSACTION').run();
    
    try {
      // Create new table with correct structure
      db.prepare(`
        CREATE TABLE recipes_in_meal_plan_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          meal_plan_id INTEGER NOT NULL,
          recipe_id INTEGER NOT NULL,
          meal_type TEXT NOT NULL,
          serving_size REAL NOT NULL DEFAULT 1.0,
          "order" INTEGER NOT NULL DEFAULT 0,
          is_frozen INTEGER DEFAULT 1,
          is_completed INTEGER DEFAULT 0,
          completed_at INTEGER,
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id),
          FOREIGN KEY (recipe_id) REFERENCES recipes(id)
        )
      `).run();
      
      // Copy data from old table (excluding order_num)
      db.prepare(`
        INSERT INTO recipes_in_meal_plan_new 
        (id, meal_plan_id, recipe_id, meal_type, serving_size, "order", is_frozen, is_completed, completed_at, created_at)
        SELECT id, meal_plan_id, recipe_id, meal_type, serving_size, "order", is_frozen, is_completed, completed_at, created_at
        FROM recipes_in_meal_plan
      `).run();
      
      // Drop old table
      db.prepare('DROP TABLE recipes_in_meal_plan').run();
      
      // Rename new table
      db.prepare('ALTER TABLE recipes_in_meal_plan_new RENAME TO recipes_in_meal_plan').run();
      
      // Commit transaction
      db.prepare('COMMIT').run();
      
      console.log('✅ Table recreated successfully');
    } catch (error) {
      db.prepare('ROLLBACK').run();
      throw error;
    }
  } else if (hasOrderNum && !hasOrder) {
    console.log('\n⚠️  Only "order_num" exists, renaming to "order"...');
    
    // Similar recreation process
    db.prepare('BEGIN TRANSACTION').run();
    
    try {
      db.prepare(`
        CREATE TABLE recipes_in_meal_plan_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          meal_plan_id INTEGER NOT NULL,
          recipe_id INTEGER NOT NULL,
          meal_type TEXT NOT NULL,
          serving_size REAL NOT NULL DEFAULT 1.0,
          "order" INTEGER NOT NULL DEFAULT 0,
          is_frozen INTEGER DEFAULT 1,
          is_completed INTEGER DEFAULT 0,
          completed_at INTEGER,
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id),
          FOREIGN KEY (recipe_id) REFERENCES recipes(id)
        )
      `).run();
      
      db.prepare(`
        INSERT INTO recipes_in_meal_plan_new 
        (id, meal_plan_id, recipe_id, meal_type, serving_size, "order", is_frozen, is_completed, completed_at, created_at)
        SELECT id, meal_plan_id, recipe_id, meal_type, serving_size, order_num, is_frozen, is_completed, completed_at, created_at
        FROM recipes_in_meal_plan
      `).run();
      
      db.prepare('DROP TABLE recipes_in_meal_plan').run();
      db.prepare('ALTER TABLE recipes_in_meal_plan_new RENAME TO recipes_in_meal_plan').run();
      db.prepare('COMMIT').run();
      
      console.log('✅ Column renamed successfully');
    } catch (error) {
      db.prepare('ROLLBACK').run();
      throw error;
    }
  } else if (hasOrder && !hasOrderNum) {
    console.log('✅ Only "order" column exists - schema is correct');
  } else {
    console.log('❌ No order column found!');
    process.exit(1);
  }
  
  // Verify final structure
  const finalTableInfo = db.prepare("PRAGMA table_info(recipes_in_meal_plan)").all();
  console.log('\n📊 Final table structure:');
  console.table(finalTableInfo);
  
  db.close();
  console.log('\n🎉 Migration completed successfully!');
  console.log('Please restart your app: pm2 restart myapp');

} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}
