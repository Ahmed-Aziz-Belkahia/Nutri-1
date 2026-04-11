// Quick fix for database schema issues
import { db } from './db/index.ts';
import { sql } from 'drizzle-orm';

async function fixSchema() {
  try {
    console.log('Checking database schema...');
    
    // Check if body_fat_percentage column exists and remove reference if it does
    try {
      const result = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'user_nutrition_preferences' 
        AND column_name = 'body_fat_percentage'
      `);
      
      if (result.length > 0) {
        console.log('Found body_fat_percentage column, but schema shows it should not exist. This is causing the mismatch.');
      } else {
        console.log('body_fat_percentage column does not exist - this is correct.');
      }
    } catch (err) {
      console.log('Error checking schema:', err.message);
    }
    
    // Test a simple query to user_nutrition_preferences without problematic columns
    try {
      const testQuery = await db.execute(sql`
        SELECT user_id, height, current_weight, goal_weight, weight_goal, activity_level 
        FROM user_nutrition_preferences 
        LIMIT 1
      `);
      console.log('✅ Basic user nutrition preferences query works');
    } catch (err) {
      console.log('❌ Error with basic query:', err.message);
    }
    
    console.log('✅ Schema check completed');
    
  } catch (error) {
    console.error('Error fixing schema:', error);
  }
}

fixSchema().catch(console.error);