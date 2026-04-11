import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DATABASE_PATH || path.resolve(process.cwd(), 'local.db');

console.log('🔄 Fixing food log dates...');
console.log('Database path:', dbPath);
console.log('');

try {
  const db = new Database(dbPath);

  // Get all food logs
  const logs = db.prepare(`SELECT id, date FROM food_logs`).all();

  console.log(`Found ${logs.length} food logs to check`);
  console.log('');

  let fixed = 0;
  let alreadyCorrect = 0;

  logs.forEach(log => {
    const dateValue = log.date;
    
    // Check if it's a reasonable timestamp
    // Timestamps in milliseconds for 2025 should be around 1.7e12
    // Timestamps in seconds would be around 1.7e9
    const asDate = new Date(dateValue);
    const year = asDate.getFullYear();
    
    console.log(`ID ${log.id}:`);
    console.log(`  Current value: ${dateValue}`);
    console.log(`  Parsed as date: ${asDate.toISOString()} (Year: ${year})`);
    
    // If year is 1970, it means the value is way too small (probably in seconds when it should be milliseconds)
    if (year < 2000) {
      // This is likely a timestamp in seconds, convert to milliseconds
      const correctedValue = dateValue * 1000;
      const correctedDate = new Date(correctedValue);
      
      console.log(`  ⚠️  Date is in the past (${year}), fixing...`);
      console.log(`  New value: ${correctedValue}`);
      console.log(`  New date: ${correctedDate.toISOString()}`);
      
      db.prepare(`UPDATE food_logs SET date = ? WHERE id = ?`).run(correctedValue, log.id);
      fixed++;
    } else {
      console.log(`  ✅ Date looks correct`);
      alreadyCorrect++;
    }
    console.log('');
  });

  console.log('📊 Summary:');
  console.log(`  Fixed: ${fixed}`);
  console.log(`  Already correct: ${alreadyCorrect}`);
  console.log(`  Total: ${logs.length}`);

  db.close();
  console.log('\n✅ Migration completed!');
  console.log('Please restart your app: pm2 restart myapp');

} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}
