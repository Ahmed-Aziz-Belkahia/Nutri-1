const { Pool } = require('pg');
const crypto = require('crypto');
const util = require('util');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Create a new pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function addAdminField() {
  try {
    console.log('Adding is_admin column to users table...');
    
    // Check if the column already exists
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'is_admin'
    `);
    
    if (checkResult.rows.length === 0) {
      // Column doesn't exist, so add it
      await pool.query(`
        ALTER TABLE users ADD COLUMN is_admin boolean NOT NULL DEFAULT false
      `);
      console.log('✅ Added is_admin column successfully');
    } else {
      console.log('✅ is_admin column already exists, skipping');
    }
    
    // Create a default admin user if not exists
    const adminUser = await pool.query(`
      SELECT id FROM users WHERE email = 'admin@nutriai.com' LIMIT 1
    `);
    
    if (adminUser.rows.length === 0) {
      // Hash the password
      const scryptAsync = util.promisify(crypto.scrypt);
      const salt = crypto.randomBytes(16).toString("hex");
      const buf = await scryptAsync("adminpassword", salt, 64);
      const hashedPassword = `${buf.toString("hex")}.${salt}`;
      
      // Insert admin user
      await pool.query(`
        INSERT INTO users (email, password, has_completed_onboarding, is_admin) 
        VALUES ('admin@nutriai.com', $1, true, true)
      `, [hashedPassword]);
      console.log('✅ Created default admin user');
    } else {
      // Update existing user to be admin
      await pool.query(`
        UPDATE users SET is_admin = true WHERE email = 'admin@nutriai.com'
      `);
      console.log('✅ Updated existing user to admin');
    }

    console.log('Migration completed successfully');
    
    // Close the pool when done
    await pool.end();
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

addAdminField();