/**
 * Migration script to add new columns for enhanced onboarding
 * Run: node add-new-onboarding-columns.js
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine database path
const dbPath = process.env.DATABASE_URL 
  ? process.env.DATABASE_URL.replace('file:', '')
  : path.join(__dirname, 'local.db');

console.log('Using database at:', dbPath);

const db = new Database(dbPath);

// List of new columns to add to user_nutrition_preferences
const newColumns = [
  { name: 'weight_loss_speed', type: 'REAL' },
  { name: 'weight_gain_speed', type: 'REAL' },
  { name: 'obstacles', type: 'TEXT' }, // JSON array
  { name: 'accomplishments', type: 'TEXT' }, // JSON array
  { name: 'referral_source', type: 'TEXT' },
  { name: 'has_used_other_apps', type: 'INTEGER' }, // Boolean
  { name: 'birth_month', type: 'TEXT' },
  { name: 'birth_day', type: 'INTEGER' },
  { name: 'birth_year', type: 'INTEGER' },
  { name: 'is_metric', type: 'INTEGER DEFAULT 1' }, // Boolean, default true
  { name: 'workout_frequency', type: 'TEXT' }, // '0-2', '3-5', '6+'
  { name: 'height_feet', type: 'INTEGER' }, // Original imperial height
  { name: 'height_inches', type: 'INTEGER' },
  { name: 'weight_lbs', type: 'REAL' }, // Original imperial weight
  { name: 'goal_weight_lbs', type: 'REAL' }, // Original imperial goal weight
];

console.log('Adding new columns to user_nutrition_preferences table...\n');

// Get existing columns
const tableInfo = db.prepare("PRAGMA table_info(user_nutrition_preferences)").all();
const existingColumns = tableInfo.map(col => col.name);

console.log('Existing columns:', existingColumns.join(', '));
console.log('');

let addedCount = 0;
let skippedCount = 0;

for (const column of newColumns) {
  if (existingColumns.includes(column.name)) {
    console.log(`  ⏭️  Column '${column.name}' already exists, skipping...`);
    skippedCount++;
  } else {
    try {
      const sql = `ALTER TABLE user_nutrition_preferences ADD COLUMN ${column.name} ${column.type}`;
      db.exec(sql);
      console.log(`  ✅ Added column '${column.name}' (${column.type})`);
      addedCount++;
    } catch (error) {
      console.error(`  ❌ Error adding column '${column.name}':`, error.message);
    }
  }
}

console.log('\n--- Migration Summary ---');
console.log(`Columns added: ${addedCount}`);
console.log(`Columns skipped (already exist): ${skippedCount}`);

// Verify the final schema
console.log('\n--- Final Table Schema ---');
const finalSchema = db.prepare("PRAGMA table_info(user_nutrition_preferences)").all();
finalSchema.forEach(col => {
  console.log(`  ${col.name}: ${col.type}${col.notnull ? ' NOT NULL' : ''}${col.dflt_value ? ` DEFAULT ${col.dflt_value}` : ''}`);
});

db.close();
console.log('\n✅ Migration complete!');
