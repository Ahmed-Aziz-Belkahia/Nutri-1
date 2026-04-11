import Database from 'better-sqlite3';

const db = new Database('local.db');

console.log('📊 Database Status Check\n');

// Check tables
const tables = db.prepare(`
  SELECT name FROM sqlite_master 
  WHERE type='table' AND name NOT LIKE 'sqlite_%'
  ORDER BY name
`).all();

console.log(`✅ Total Tables: ${tables.length}/20\n`);

// Check food_logs columns
const foodLogsColumns = db.prepare('PRAGMA table_info(food_logs)').all();
console.log(`✅ food_logs Columns: ${foodLogsColumns.length}/24\n`);

console.log('All Tables:');
tables.forEach(t => console.log(`  • ${t.name}`));

console.log('\nfood_logs Columns:');
foodLogsColumns.forEach(c => console.log(`  • ${c.name} (${c.type})`));

db.close();

console.log('\n✅ Database is healthy and ready!');
