import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', 'local.db');
const db = new Database(dbPath);

console.log('Adding email verification columns to users table...');

try {
  // Add new columns for email verification
  db.exec(`
    ALTER TABLE users ADD COLUMN is_email_verified INTEGER DEFAULT 0;
  `);
  
  db.exec(`
    ALTER TABLE users ADD COLUMN verification_code TEXT;
  `);
  
  db.exec(`
    ALTER TABLE users ADD COLUMN verification_code_expires_at INTEGER;
  `);
  
  console.log('✅ Successfully added email verification columns');
  
} catch (error) {
  if (error.message.includes('duplicate column name')) {
    console.log('⚠️  Columns already exist, skipping migration');
  } else {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
} finally {
  db.close();
}
