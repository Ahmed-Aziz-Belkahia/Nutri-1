#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

console.log('🔍 Verifying NutriApp Installation...\n');

const checks = [
  {
    name: 'SQLite Database',
    check: () => fs.existsSync('./local.db'),
    fix: 'Run: npm run setup'
  },
  {
    name: 'Database Tables',
    check: () => {
      try {
        const db = new Database('./local.db');
        const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        db.close();
        return tables.length > 0;
      } catch {
        return false;
      }
    },
    fix: 'Run: npm run setup'
  },
  {
    name: 'Uploads Directory',
    check: () => fs.existsSync('./uploads'),
    fix: 'Run: npm run setup'
  },
  {
    name: 'Environment File',
    check: () => fs.existsSync('./.env'),
    fix: 'Copy .env.example to .env'
  },
  {
    name: 'PM2 Config',
    check: () => fs.existsSync('./ecosystem.config.js'),
    fix: 'Run: npm run setup'
  },
  {
    name: 'Build Directory (for production)',
    check: () => fs.existsSync('./dist'),
    fix: 'Run: npm run build',
    optional: true
  }
];

let allPassed = true;

checks.forEach((check, index) => {
  const passed = check.check();
  const status = passed ? '✅' : '❌';
  const optional = check.optional ? ' (optional)' : '';
  
  console.log(`${status} ${check.name}${optional}`);
  
  if (!passed && !check.optional) {
    console.log(`   Fix: ${check.fix}`);
    allPassed = false;
  }
});

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log('🎉 All checks passed! Your NutriApp is ready to run!');
  console.log('\n📋 Quick commands:');
  console.log('   Development: npm run dev');
  console.log('   Production:  npm run deploy');
  console.log('   VPS Setup:   ./deploy-vps.sh');
} else {
  console.log('⚠️  Some checks failed. Please fix the issues above.');
  console.log('\n🔧 Quick fix: npm run setup');
}

console.log('\n🌐 App will be available at: http://localhost:5000');
