import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'local.db'));

try {
  console.log('Checking user_nutrition_preferences data...\n');
  
  const profiles = db.prepare('SELECT * FROM user_nutrition_preferences').all();
  
  if (profiles.length === 0) {
    console.log('No profile data found.');
  } else {
    console.log(`Found ${profiles.length} profile(s):\n`);
    profiles.forEach((profile, index) => {
      console.log(`Profile ${index + 1}:`);
      console.log(`  User ID: ${profile.user_id}`);
      console.log(`  Age: ${profile.age || 'NULL'}`);
      console.log(`  Gender: ${profile.gender || 'NULL'}`);
      console.log(`  Height: ${profile.height || 'NULL'}`);
      console.log(`  Current Weight: ${profile.current_weight || 'NULL'}`);
      console.log(`  Goal Weight: ${profile.goal_weight || 'NULL'}`);
      console.log(`  Activity Level: ${profile.activity_level}`);
      console.log(`  Calories Goal: ${profile.daily_calorie_goal}`);
      console.log('---');
    });
  }
} catch (error) {
  console.error('Error:', error);
} finally {
  db.close();
}
