#!/usr/bin/env node

/**
 * Batch migration script for JWT authentication
 * This will update all remaining routes in one go
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROUTES_FILE = path.join(__dirname, 'server', 'routes.ts');
const BACKUP_FILE = path.join(__dirname, 'server', 'routes.ts.pre-batch-migration');

console.log('🔄 Starting batch JWT migration...\n');

// Create backup
console.log('📦 Creating backup...');
const content = fs.readFileSync(ROUTES_FILE, 'utf-8');
fs.writeFileSync(BACKUP_FILE, content, 'utf-8');
console.log(`✅ Backup: ${BACKUP_FILE}\n`);

let modifiedContent = content;
let totalChanges = 0;

// Step 1: Replace all `async (req, res) =>` with `requireAuth, async (req: AuthRequest, res: Response) =>`
// BUT only for routes that have authentication checks
console.log('Step 1: Adding requireAuth middleware to protected routes...');

const lines = modifiedContent.split('\n');
const newLines = [];
let i = 0;

while (i < lines.length) {
  const line = lines[i];
  
  // Check if this is a route definition
  if (/app\.(get|post|put|delete|patch)\(/.test(line) && /async\s*\(\s*req\s*,\s*res\s*\)/.test(line)) {
    // Look ahead to see if there's an authentication check within the next 10 lines
    let hasAuthCheck = false;
    for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
      if (lines[j].includes('req.isAuthenticated()')) {
        hasAuthCheck = true;
        break;
      }
    }
    
    if (hasAuthCheck) {
      // This route needs requireAuth middleware
      // Replace: async (req, res) => with requireAuth, async (req: AuthRequest, res: Response) =>
      const modifiedLine = line.replace(
        /async\s*\(\s*req\s*,\s*res\s*\)\s*=>/,
        'requireAuth, async (req: AuthRequest, res: Response) =>'
      );
      
      if (modifiedLine !== line) {
        newLines.push(modifiedLine);
        totalChanges++;
        console.log(`  ✓ Line ${i + 1}: Added requireAuth`);
      } else {
        newLines.push(line);
      }
    } else {
      newLines.push(line);
    }
  } else {
    newLines.push(line);
  }
  
  i++;
}

modifiedContent = newLines.join('\n');

// Step 2: Remove all authentication check blocks
console.log('\nStep 2: Removing manual authentication checks...');

// Pattern: if (!req.isAuthenticated()) { return res.status(401).json(...); }
// This can span multiple lines, so we need to handle that
modifiedContent = modifiedContent.replace(
  /\s*if\s*\(\s*!req\.isAuthenticated\(\)\s*\)\s*{\s*return\s+res\.status\(401\)\.json\([^}]+\);\s*}\s*/g,
  '\n'
);

const removedChecks = content.match(/if\s*\(\s*!req\.isAuthenticated\(\)\s*\)/g);
console.log(`  ✓ Removed ${removedChecks ? removedChecks.length : 0} authentication checks`);
totalChanges += removedChecks ? removedChecks.length : 0;

// Step 3: Replace all req.user.id with req.user!.id
console.log('\nStep 3: Updating req.user references...');

const userIdPattern = /req\.user\.id/g;
const userIdMatches = modifiedContent.match(userIdPattern);
modifiedContent = modifiedContent.replace(userIdPattern, 'req.user!.id');

console.log(`  ✓ Updated ${userIdMatches ? userIdMatches.length : 0} req.user.id references`);
totalChanges += userIdMatches ? userIdMatches.length : 0;

// Step 4: Replace req.user.email and other properties
const userEmailPattern = /req\.user\.email/g;
const userEmailMatches = modifiedContent.match(userEmailPattern);
modifiedContent = modifiedContent.replace(userEmailPattern, 'req.user!.email');

console.log(`  ✓ Updated ${userEmailMatches ? userEmailMatches.length : 0} req.user.email references`);
totalChanges += userEmailMatches ? userEmailMatches.length : 0;

// Save the file
console.log('\n💾 Saving changes...');
fs.writeFileSync(ROUTES_FILE, modifiedContent, 'utf-8');

console.log('\n═══════════════════════════════════════');
console.log('✅ BATCH MIGRATION COMPLETE!');
console.log('═══════════════════════════════════════\n');
console.log(`📊 Total changes: ${totalChanges}`);
console.log(`📄 Backup saved: ${BACKUP_FILE}\n`);
console.log('🧪 Next steps:');
console.log('  1. Review the changes: git diff server/routes.ts');
console.log('  2. Test the server: npm run dev');
console.log('  3. Test protected endpoints with JWT');
console.log('  4. If issues: mv server/routes.ts.pre-batch-migration server/routes.ts\n');
