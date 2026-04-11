import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'local.db'));

try {
  console.log('Adding age and gender columns to user_nutrition_preferences table...');
  
  // Add age column
  db.exec('ALTER TABLE user_nutrition_preferences ADD COLUMN age INTEGER;');
  console.log('✓ Added age column');
  
  // Add gender column
  db.exec('ALTER TABLE user_nutrition_preferences ADD COLUMN gender TEXT;');
  console.log('✓ Added gender column');
  
  console.log('Migration completed successfully!');
} catch (error) {
  if (error.message.includes('duplicate column name')) {
    console.log('Columns already exist, migration not needed.');
  } else {
    console.error('Migration failed:', error);
    process.exit(1);
  }
} finally {
  db.close();
}
