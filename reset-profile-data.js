import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'local.db'));

try {
  console.log('Deleting existing profile data to allow fresh onboarding...\n');
  
  // Delete all existing nutrition preferences
  const result = db.prepare('DELETE FROM user_nutrition_preferences').run();
  
  console.log(`✅ Deleted ${result.changes} profile record(s)`);
  console.log('\nYou can now complete the onboarding quiz again and all data will be saved correctly!');
  console.log('\nNote: This does NOT delete your user account, only the profile preferences.');
  
} catch (error) {
  console.error('Error:', error);
  process.exit(1);
} finally {
  db.close();
}
