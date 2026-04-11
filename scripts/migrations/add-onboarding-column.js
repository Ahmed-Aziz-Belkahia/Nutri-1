import Database from 'better-sqlite3';
const db = new Database('./local.db');

console.log('Adding missing columns to users table...\n');

const columnsToAdd = [
  { name: 'has_completed_onboarding', sql: 'INTEGER DEFAULT 0' },
  { name: 'last_activity_date', sql: 'TEXT' },
  { name: 'profile_image', sql: 'TEXT' },
  { name: 'preferred_language', sql: 'TEXT DEFAULT "en"' },
  { name: 'reset_token', sql: 'TEXT' },
  { name: 'reset_token_expires_at', sql: 'INTEGER' },
  { name: 'current_streak', sql: 'INTEGER' },
  { name: 'longest_streak', sql: 'INTEGER' },
  { name: 'experience_points', sql: 'INTEGER' },
  { name: 'level', sql: 'INTEGER' },
  { name: 'is_admin', sql: 'INTEGER DEFAULT 0' },
];

try {
  for (const column of columnsToAdd) {
    try {
      db.prepare(`ALTER TABLE users ADD COLUMN ${column.name} ${column.sql}`).run();
      console.log(`✅ Added ${column.name} column`);
    } catch (err) {
      if (err.message.includes('duplicate')) {
        console.log(`✅ ${column.name} already exists`);
      } else {
        throw err;
      }
    }
  }
  
  // Verify the column was added
  const columns = db.prepare('PRAGMA table_info(users)').all();
  console.log('\nVerifying users columns:');
  console.log('Total columns:', columns.length);
  console.log('Columns:', columns.map(c => c.name).join(', '));
  
  // Check if has_completed_onboarding exists
  const hasColumn = columns.find(c => c.name === 'has_completed_onboarding');
  if (hasColumn) {
    console.log('\n✅ Verification passed! has_completed_onboarding column exists');
  } else {
    console.log('\n❌ Verification failed! Column not found');
  }
  
} catch (error) {
  if (error.message.includes('duplicate column name')) {
    console.log('✅ Column already exists');
  } else {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
} finally {
  db.close();
}

console.log('\n✅ Done!');
