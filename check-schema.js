import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path
const dbPath = process.env.DATABASE_PATH || path.resolve(process.cwd(), 'local.db');

console.log('🔍 Checking database schema...');
console.log('Database path:', dbPath);
console.log('');

try {
  const db = new Database(dbPath);

  // Get all tables
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();

  console.log(`Found ${tables.length} tables:\n`);

  // Check each table
  for (const table of tables) {
    const tableName = table.name;
    console.log(`\n📋 Table: ${tableName}`);
    console.log('─'.repeat(50));
    
    const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
    
    console.log('Columns:');
    columns.forEach((col) => {
      const nullable = col.notnull ? 'NOT NULL' : 'NULL';
      const def = col.dflt_value ? `DEFAULT ${col.dflt_value}` : '';
      const pk = col.pk ? '🔑 PRIMARY KEY' : '';
      console.log(`  - ${col.name} (${col.type}) ${nullable} ${def} ${pk}`.trim());
    });
  }

  // Check for foreign keys
  console.log('\n\n🔗 Foreign Key Constraints:');
  console.log('─'.repeat(50));
  for (const table of tables) {
    const fks = db.prepare(`PRAGMA foreign_key_list(${table.name})`).all();
    if (fks.length > 0) {
      console.log(`\n${table.name}:`);
      fks.forEach((fk) => {
        console.log(`  ${fk.from} → ${fk.table}.${fk.to}`);
      });
    }
  }

  // Check for indexes
  console.log('\n\n📊 Indexes:');
  console.log('─'.repeat(50));
  for (const table of tables) {
    const indexes = db.prepare(`PRAGMA index_list(${table.name})`).all();
    if (indexes.length > 0) {
      console.log(`\n${table.name}:`);
      indexes.forEach((idx) => {
        const unique = idx.unique ? '(UNIQUE)' : '';
        console.log(`  - ${idx.name} ${unique}`);
      });
    }
  }

  db.close();
  console.log('\n\n✅ Schema check complete!');

} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}
