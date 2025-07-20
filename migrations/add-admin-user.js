// Add admin user migration
import dotenv from 'dotenv';
import pg from 'pg';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

dotenv.config();
const { Pool } = pg;

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

async function addAdminUser() {
  console.log('Starting migration to add admin user...');
  
  // Connect to the database using the provided connection string
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // First, check if the admin user already exists
    const checkResult = await pool.query(
      "SELECT * FROM users WHERE email = 'admin@nutriai.com'"
    );

    if (checkResult.rows.length > 0) {
      console.log('Admin user already exists. Updating admin privileges...');
      
      await pool.query(
        "UPDATE users SET is_admin = true WHERE email = 'admin@nutriai.com'"
      );
      
      console.log('Admin privileges confirmed for existing admin user.');
    } else {
      console.log('Creating new admin user...');
      
      // Hash the password
      const hashedPassword = await hashPassword('adminpassword');
      
      // Insert the admin user
      await pool.query(
        `INSERT INTO users 
         (email, password, has_completed_onboarding, is_admin) 
         VALUES 
         ('admin@nutriai.com', $1, true, true)`,
        [hashedPassword]
      );
      
      console.log('Admin user created successfully.');
    }

    console.log('Admin user migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

// Run the migration
addAdminUser().catch(console.error);

// Export for ES module
export default addAdminUser;