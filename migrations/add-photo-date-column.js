import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(process.cwd(), 'local.db');
const db = new Database(dbPath);

console.log('Adding date column to progress_photos table...');

try {
  // Check if column already exists
  const tableInfo = db.prepare(`PRAGMA table_info(progress_photos);`).all();
  const columnExists = tableInfo.some(col => col.name === 'photo_date');
  
  if (columnExists) {
    console.log('⚠ photo_date column already exists, skipping migration');
  } else {
    // Add date column (stored as TEXT in YYYY-MM-DD format for SQLite)
    db.exec(`
      ALTER TABLE progress_photos 
      ADD COLUMN photo_date TEXT DEFAULT (date('now'));
    `);
    
    // Update existing rows to have photo_date based on created_at
    db.exec(`
      UPDATE progress_photos 
      SET photo_date = date(created_at, 'unixepoch')
      WHERE photo_date IS NULL;
    `);
    
    console.log('✓ Successfully added photo_date column to progress_photos table');
    console.log('✓ Existing photos have been assigned dates based on created_at timestamp');
  }
  
  // Verify the changes
  const columnCheck = db.prepare(`
    SELECT sql FROM sqlite_master 
    WHERE type='table' AND name='progress_photos';
  `).get();
  
  console.log('\nUpdated table schema:');
  console.log(columnCheck.sql);
  
  // Show sample data
  const sampleData = db.prepare(`
    SELECT id, user_id, photo_date, created_at 
    FROM progress_photos 
    LIMIT 3;
  `).all();
  
  console.log('\nSample data (first 3 rows):');
  console.log(sampleData);
  
} catch (error) {
  console.error('Error adding date column:', error);
  process.exit(1);
} finally {
  db.close();
}
