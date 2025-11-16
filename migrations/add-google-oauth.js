import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', 'local.db');
const db = new Database(dbPath);

console.log('🔄 Adding Google OAuth columns to users table...');

try {
  // Check if columns already exist
  const tableInfo = db.prepare("PRAGMA table_info(users)").all();
  const columnNames = tableInfo.map((col) => col.name);
  
  // Add google_id column if it doesn't exist
  if (!columnNames.includes('google_id')) {
    db.prepare('ALTER TABLE users ADD COLUMN google_id TEXT').run();
    console.log('✅ Added google_id column');
  } else {
    console.log('⏭️  google_id column already exists');
  }
  
  // Add google_email column if it doesn't exist
  if (!columnNames.includes('google_email')) {
    db.prepare('ALTER TABLE users ADD COLUMN google_email TEXT').run();
    console.log('✅ Added google_email column');
  } else {
    console.log('⏭️  google_email column already exists');
  }
  
  // Add google_picture column if it doesn't exist
  if (!columnNames.includes('google_picture')) {
    db.prepare('ALTER TABLE users ADD COLUMN google_picture TEXT').run();
    console.log('✅ Added google_picture column');
  } else {
    console.log('⏭️  google_picture column already exists');
  }
  
  // Add auth_provider column if it doesn't exist
  if (!columnNames.includes('auth_provider')) {
    db.prepare("ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'local'").run();
    console.log('✅ Added auth_provider column');
  } else {
    console.log('⏭️  auth_provider column already exists');
  }
  
  // Add email_verified_via column if it doesn't exist
  if (!columnNames.includes('email_verified_via')) {
    db.prepare('ALTER TABLE users ADD COLUMN email_verified_via TEXT').run();
    console.log('✅ Added email_verified_via column');
  } else {
    console.log('⏭️  email_verified_via column already exists');
  }
  
  // Add last_login_at column if it doesn't exist
  if (!columnNames.includes('last_login_at')) {
    db.prepare('ALTER TABLE users ADD COLUMN last_login_at DATETIME').run();
    console.log('✅ Added last_login_at column');
  } else {
    console.log('⏭️  last_login_at column already exists');
  }
  
  // Create index for Google ID lookups if it doesn't exist
  try {
    db.prepare('CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)').run();
    console.log('✅ Created index on google_id');
  } catch (error) {
    console.log('⏭️  Index idx_users_google_id already exists');
  }
  
  console.log('✅ Google OAuth migration completed successfully!');
  
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}
