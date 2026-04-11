import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DATABASE_PATH || path.resolve(process.cwd(), 'local.db');

console.log('🔍 Checking food log dates...\n');

try {
  const db = new Database(dbPath);

  const logs = db.prepare(`
    SELECT 
      id,
      name,
      date,
      user_id
    FROM food_logs 
    WHERE user_id = 1
    ORDER BY date DESC
  `).all();

  console.log('📊 Food logs in database:\n');
  logs.forEach(log => {
    const dateObj = new Date(log.date);
    console.log(`ID ${log.id}: ${log.name}`);
    console.log(`  Raw date: ${log.date}`);
    console.log(`  Parsed: ${dateObj.toISOString()}`);
    console.log(`  Local: ${dateObj.toLocaleString()}`);
    console.log(`  Type: ${typeof log.date}`);
    console.log('');
  });

  // Check what today's date range would be
  const today = new Date();
  const dateString = today.toISOString().split('T')[0];
  const startOfDay = new Date(`${dateString}T00:00:00.000Z`);
  const endOfDay = new Date(`${dateString}T23:59:59.999Z`);

  console.log('📅 Today\'s date range (what API queries for):');
  console.log(`  Date string: ${dateString}`);
  console.log(`  Start: ${startOfDay.toISOString()}`);
  console.log(`  End: ${endOfDay.toISOString()}`);
  console.log('');

  // Test the query that the API uses
  const matchingLogs = db.prepare(`
    SELECT COUNT(*) as count
    FROM food_logs
    WHERE user_id = 1
      AND date >= ?
      AND date < ?
  `).get(startOfDay.toISOString(), endOfDay.toISOString());

  console.log(`🔍 Logs matching today's date range: ${matchingLogs.count}`);

  db.close();
  console.log('\n✅ Check completed!');

} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}
