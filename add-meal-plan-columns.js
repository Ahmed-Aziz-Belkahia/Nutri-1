import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path
const dbPath = process.env.DATABASE_PATH || path.resolve(process.cwd(), 'local.db');

console.log('🔄 Adding missing columns to recipes_in_meal_plan table...');
console.log('Database path:', dbPath);

try {
  const db = new Database(dbPath);

  // Check if columns already exist
  const tableInfo = db.prepare("PRAGMA table_info(recipes_in_meal_plan)").all();
  const columnNames = tableInfo.map((col: any) => col.name);
  
  console.log('Current columns:', columnNames);

  // Add order column if missing
  if (!columnNames.includes('order')) {
    console.log('Adding "order" column...');
    db.prepare(`
      ALTER TABLE recipes_in_meal_plan 
      ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0
    `).run();
    console.log('✅ Added "order" column');
  } else {
    console.log('✅ "order" column already exists');
  }

  // Add is_frozen column if missing
  if (!columnNames.includes('is_frozen')) {
    console.log('Adding "is_frozen" column...');
    db.prepare(`
      ALTER TABLE recipes_in_meal_plan 
      ADD COLUMN "is_frozen" INTEGER DEFAULT 1
    `).run();
    console.log('✅ Added "is_frozen" column');
  } else {
    console.log('✅ "is_frozen" column already exists');
  }

  // Add is_completed column if missing
  if (!columnNames.includes('is_completed')) {
    console.log('Adding "is_completed" column...');
    db.prepare(`
      ALTER TABLE recipes_in_meal_plan 
      ADD COLUMN "is_completed" INTEGER DEFAULT 0
    `).run();
    console.log('✅ Added "is_completed" column');
  } else {
    console.log('✅ "is_completed" column already exists');
  }

  // Add completed_at column if missing
  if (!columnNames.includes('completed_at')) {
    console.log('Adding "completed_at" column...');
    db.prepare(`
      ALTER TABLE recipes_in_meal_plan 
      ADD COLUMN "completed_at" INTEGER
    `).run();
    console.log('✅ Added "completed_at" column');
  } else {
    console.log('✅ "completed_at" column already exists');
  }

  // Add created_at column if missing
  if (!columnNames.includes('created_at')) {
    console.log('Adding "created_at" column...');
    db.prepare(`
      ALTER TABLE recipes_in_meal_plan 
      ADD COLUMN "created_at" INTEGER DEFAULT (strftime('%s', 'now'))
    `).run();
    console.log('✅ Added "created_at" column');
  } else {
    console.log('✅ "created_at" column already exists');
  }

  // Verify the changes
  const updatedTableInfo = db.prepare("PRAGMA table_info(recipes_in_meal_plan)").all();
  console.log('\n📊 Final table structure:');
  console.table(updatedTableInfo);

  db.close();
  console.log('\n🎉 Migration completed successfully!');
  console.log('Please restart your app: pm2 restart myapp');

} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}
