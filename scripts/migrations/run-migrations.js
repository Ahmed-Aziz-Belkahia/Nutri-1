import { spawn } from 'child_process';

// Script to run migrations and automatically respond "yes" to prompts
const runMigrations = () => {
  const process = spawn('npm', ['run', 'db:push'], { stdio: ['pipe', 'inherit', 'inherit'] });
  
  // Wait a bit for the prompt to appear and then send 'y'
  setTimeout(() => {
    process.stdin.write('y\n');
  }, 5000);

  process.on('close', (code) => {
    console.log(`Process exited with code ${code}`);
  });
};

runMigrations();