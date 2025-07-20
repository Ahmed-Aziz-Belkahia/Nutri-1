// Script to setup database and run migrations for deployment
import { spawn } from 'child_process';
import * as fs from 'fs/promises';

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

// Run the setup process
const setup = async () => {
  try {
    // Ensure uploads directory exists
    await fs.mkdir('./uploads', { recursive: true });
    console.log('Created uploads directory');
    
    // Run migrations
    await runMigrations();
    
    console.log('Database setup completed successfully');
  } catch (error) {
    console.error('Error during database setup:', error);
    process.exit(1);
  }
};

setup();