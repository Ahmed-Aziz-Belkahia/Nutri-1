import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

async function addAdminField() {
  try {
    console.log('Adding is_admin column to users table...');
    
    // Check if the column already exists
    const checkResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'is_admin'
    `);
    
    if (checkResult.length === 0) {
      // Column doesn't exist, so add it
      await db.execute(sql`
        ALTER TABLE users ADD COLUMN is_admin boolean NOT NULL DEFAULT false
      `);
      console.log('✅ Added is_admin column successfully');
    } else {
      console.log('✅ is_admin column already exists, skipping');
    }
    
    // Create a default admin user if not exists
    const adminUser = await db.execute(sql`
      SELECT id FROM users WHERE email = 'admin@nutriai.com' LIMIT 1
    `);
    
    if (adminUser.length === 0) {
      // Import crypto functions
      const { scrypt, randomBytes } = await import('crypto');
      const { promisify } = await import('util');
      const scryptAsync = promisify(scrypt);
      
      // Hash the password
      const salt = randomBytes(16).toString("hex");
      const buf = (await scryptAsync("adminpassword", salt, 64));
      const hashedPassword = `${buf.toString("hex")}.${salt}`;
      
      // Insert admin user
      await db.execute(sql`
        INSERT INTO users (email, password, has_completed_onboarding, is_admin) 
        VALUES ('admin@nutriai.com', ${hashedPassword}, true, true)
      `);
      console.log('✅ Created default admin user');
    } else {
      // Update existing user to be admin
      await db.execute(sql`
        UPDATE users SET is_admin = true WHERE email = 'admin@nutriai.com'
      `);
      console.log('✅ Updated existing user to admin');
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Error during migration:', error);
  }
}

addAdminField();