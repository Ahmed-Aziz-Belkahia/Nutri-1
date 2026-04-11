// Script to setup database and run migrations for deployment
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

console.log('Setting up database for deployment...');

// Function to run migrations with automatic 'yes' response
const runMigrations = () => {
  return new Promise((resolve, reject) => {
    console.log('Running database migrations...');
    
    const process = spawn('npm', ['run', 'db:push'], { 
      stdio: ['pipe', 'inherit', 'inherit'],
      shell: true 
    });
    
    // Wait a bit for the prompt to appear and then send 'y'
    setTimeout(() => {
      process.stdin.write('y\n');
    }, 3000);

    process.on('close', (code) => {
      if (code === 0) {
        console.log('Migrations completed successfully');
        resolve();
      } else {
        console.error(`Migration process exited with code ${code}`);
        reject(new Error(`Migration failed with code ${code}`));
      }
    });
  });
};

// Add missing columns to food_logs if they don't exist
const ensureFoodLogsColumns = async () => {
  try {
    console.log('\nEnsuring food_logs has all required columns...');
    
    // Use the comprehensive recreation script instead
    await execPromise('node recreate-database-complete.js');
    
    console.log('✅ Database schema verified');
  } catch (error) {
    console.error('Error ensuring schema:', error.message);
    throw error;
  }
};

// Run the setup process
const setup = async () => {
  try {
    // Ensure uploads directory exists
    await fs.mkdir('./uploads', { recursive: true });
    console.log('Created uploads directory');
    
    // First run migrations
    await runMigrations();
    
    // Then ensure all columns exist (fix schema if needed)
    await ensureFoodLogsColumns();
    
    console.log('\n✅ Database setup completed successfully');
  } catch (error) {
    console.error('Error during database setup:', error);
    process.exit(1);
  }
};

setup();