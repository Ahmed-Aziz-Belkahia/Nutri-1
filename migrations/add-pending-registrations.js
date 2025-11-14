import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', 'local.db');
const db = new Database(dbPath);

console.log('Creating pending_registrations table...');

try {
  // Create pending_registrations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS pending_registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      verification_code TEXT NOT NULL,
      verification_code_expires_at INTEGER NOT NULL,
      profile_data TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);

  console.log('✅ Successfully created pending_registrations table');
} catch (error) {
  if (error.message.includes('already exists')) {
    console.log('✅ pending_registrations table already exists');
  } else {
    console.error('❌ Error creating table:', error);
    throw error;
  }
} finally {
  db.close();
}
