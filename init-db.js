import Database from 'better-sqlite3';
import { readFileSync } from 'fs';

const db = new Database('local.db');
const sql = readFileSync('create-schema.sql', 'utf8');

// Split by semicolons and execute each statement
const statements = sql.split(';').filter(s => s.trim());

for (const statement of statements) {
  if (statement.trim()) {
    try {
      db.exec(statement);
    } catch (err) {
      console.error('Error executing:', statement.substring(0, 100));
      console.error(err.message);
    }
  }
}

console.log('✅ Database schema created successfully');
db.close();
