// Update schema script to fix missing columns
import pg from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function updateSchema() {
  const client = await pool.connect();
  try {
    console.log('Starting schema update...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Check if the columns exist before adding them
    console.log('Checking user_nutrition_preferences table...');
    const checkHeightColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='user_nutrition_preferences' AND column_name='height'
    `);
    
    if (checkHeightColumn.rows.length === 0) {
      console.log('Adding missing columns to user_nutrition_preferences table...');
      await client.query(`
        ALTER TABLE "user_nutrition_preferences" 
        ADD COLUMN IF NOT EXISTS "height" integer,
        ADD COLUMN IF NOT EXISTS "weight" numeric(5, 2),
        ADD COLUMN IF NOT EXISTS "current_weight" numeric(5, 2),
        ADD COLUMN IF NOT EXISTS "goal_weight" numeric(5, 2),
        ADD COLUMN IF NOT EXISTS "weight_goal" text,
        ADD COLUMN IF NOT EXISTS "activity_level" text,
        ADD COLUMN IF NOT EXISTS "meal_budget" text,
        ADD COLUMN IF NOT EXISTS "experience_level" text,
        ADD COLUMN IF NOT EXISTS "dietary_restrictions" jsonb DEFAULT '[]'
      `);
    }
    
    console.log('Checking weight_logs table...');
    const checkLoggedAtColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='weight_logs' AND column_name='logged_at'
    `);
    
    if (checkLoggedAtColumn.rows.length === 0) {
      console.log('Adding logged_at column to weight_logs table...');
      await client.query(`
        ALTER TABLE "weight_logs" 
        ADD COLUMN IF NOT EXISTS "logged_at" timestamp NOT NULL DEFAULT now()
      `);
    }
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('Schema update completed successfully!');
    
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating schema:', error);
    return false;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the update
updateSchema()
  .then(success => {
    if (success) {
      console.log('✅ Schema update completed');
      process.exit(0);
    } else {
      console.error('❌ Schema update failed');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });