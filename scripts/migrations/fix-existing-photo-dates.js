import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(process.cwd(), 'local.db');
const db = new Database(dbPath);

console.log('Fixing photo dates for existing photos...');

try {
  // Get all photos that don't have a photo_date or have NULL
  const photosNeedingDates = db.prepare(`
    SELECT id, user_id, created_at, photo_date
    FROM progress_photos
    WHERE photo_date IS NULL OR photo_date = ''
  `).all();
  
  console.log(`Found ${photosNeedingDates.length} photos without dates`);
  
  if (photosNeedingDates.length > 0) {
    // Update each photo with date calculated from created_at
    const updateStmt = db.prepare(`
      UPDATE progress_photos 
      SET photo_date = date(created_at, 'unixepoch')
      WHERE id = ?
    `);
    
    for (const photo of photosNeedingDates) {
      updateStmt.run(photo.id);
      console.log(`Updated photo ${photo.id} with date from timestamp ${photo.created_at}`);
    }
  }
  
  // Also check if any photos have today's date
  const today = new Date().toISOString().split('T')[0];
  const todaysPhotos = db.prepare(`
    SELECT id, user_id, photo_date
    FROM progress_photos
    WHERE photo_date = ?
    ORDER BY user_id
  `).all(today);
  
  console.log(`\n${todaysPhotos.length} photos uploaded today (${today}):`);
  todaysPhotos.forEach(photo => {
    console.log(`  User ${photo.user_id}: Photo ID ${photo.id}`);
  });
  
  // Show all photos with their dates
  console.log('\nAll photos in database:');
  const allPhotos = db.prepare(`
    SELECT id, user_id, photo_date, datetime(created_at, 'unixepoch') as created_datetime
    FROM progress_photos
    ORDER BY user_id, created_at DESC
  `).all();
  
  console.log(`Total photos: ${allPhotos.length}`);
  allPhotos.forEach(photo => {
    console.log(`  User ${photo.user_id}: Photo ${photo.id}, Date: ${photo.photo_date}, Created: ${photo.created_datetime}`);
  });
  
  console.log('\n✓ Photo dates fixed successfully');
  
} catch (error) {
  console.error('Error fixing photo dates:', error);
  process.exit(1);
} finally {
  db.close();
}
