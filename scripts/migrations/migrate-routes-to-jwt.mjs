#!/usr/bin/env node

/**
 * Automated migration script for replacing Passport.js authentication with JWT
 * in server/routes.ts
 * 
 * This script:
 * 1. Adds JWT imports at the top
 * 2. Replaces all `req.isAuthenticated()` checks with requireAuth middleware
 * 3. Replaces all `req.user` with properly typed versions
 * 4. Maintains backward compatibility during transition
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROUTES_FILE = path.join(__dirname, 'server', 'routes.ts');
const BACKUP_FILE = path.join(__dirname, 'server', 'routes.ts.backup');

console.log('🔄 Starting JWT migration for server/routes.ts...\n');

// Step 1: Create backup
console.log('📦 Creating backup...');
try {
  const content = fs.readFileSync(ROUTES_FILE, 'utf-8');
  fs.writeFileSync(BACKUP_FILE, content, 'utf-8');
  console.log(`✅ Backup created: ${BACKUP_FILE}\n`);
} catch (error) {
  console.error('❌ Failed to create backup:', error);
  process.exit(1);
}

// Step 2: Read the file
console.log('📖 Reading routes file...');
let content = fs.readFileSync(ROUTES_FILE, 'utf-8');
let changes = 0;

// Step 3: Add JWT imports if not present
console.log('📝 Adding JWT imports...');
if (!content.includes('from "./utils/jwt"')) {
  const importPosition = content.indexOf('import type { Express }');
  if (importPosition !== -1) {
    const importsSection = `import type { Express } from "express";
import type { Request, Response, NextFunction } from "express";
import { requireAuth, optionalAuth, type AuthRequest } from "./utils/jwt";`;
    
    content = content.replace(
      'import type { Express } from "express";',
      importsSection
    );
    changes++;
    console.log('✅ JWT imports added\n');
  }
} else {
  console.log('ℹ️  JWT imports already present\n');
}

// Step 4: Remove old auth imports
console.log('🗑️  Removing old Passport imports...');
const oldImports = [
  /import { setupAuth } from "\.\/auth";\n?/g,
  /import { isAuthenticated } from "\.\/middleware\/auth";\n?/g
];

oldImports.forEach(pattern => {
  if (pattern.test(content)) {
    content = content.replace(pattern, '');
    changes++;
  }
});
console.log('✅ Old imports removed\n');

// Step 5: Replace manual authentication checks with requireAuth middleware
console.log('🔐 Converting authentication checks...');

// Pattern 1: Routes with manual auth checks at the start
// Replace: if (!req.isAuthenticated()) { return res.status(401).json(...) }
// With: requireAuth middleware in route parameters

const manualAuthPattern = /(\s+)(app\.(get|post|put|delete|patch)\()("\/[^"]+"),\s*async\s+\((req,\s*res)\)\s*=>\s*{\s*if\s*\(!req\.isAuthenticated\(\)\)\s*{[^}]+}\s*}/g;

let routeMatches = 0;
content = content.replace(
  /(\s+)(app\.(get|post|put|delete|patch)\()("\/[^"]+"),\s*async\s+\((req,\s*res)\)\s*=>\s*{\s*if\s*\(!req\.isAuthenticated\(\)\)\s*{/g,
  (match, indent, appMethod, method, route, reqRes) => {
    routeMatches++;
    return `${indent}${appMethod}${route}, requireAuth, async (req: AuthRequest, res: Response) => {\n${indent}  // Authentication handled by requireAuth middleware`;
  }
);

// Pattern 2: Replace remaining req.isAuthenticated() checks
const authCheckMatches = (content.match(/req\.isAuthenticated\(\)/g) || []).length;
console.log(`Found ${authCheckMatches} remaining authentication checks\n`);

// Pattern 3: Update req.user to use non-null assertion
const userAccessPattern = /req\.user\.id/g;
const userMatches = (content.match(userAccessPattern) || []).length;
content = content.replace(userAccessPattern, 'req.user!.id');
console.log(`✅ Updated ${userMatches} req.user.id references\n`);

changes += routeMatches + userMatches;

// Step 6: Save the modified file
console.log('💾 Saving changes...');
try {
  fs.writeFileSync(ROUTES_FILE, content, 'utf-8');
  console.log(`✅ File saved with ${changes} changes\n`);
} catch (error) {
  console.error('❌ Failed to save file:', error);
  console.log('⚠️  Restoring from backup...');
  fs.copyFileSync(BACKUP_FILE, ROUTES_FILE);
  process.exit(1);
}

// Step 7: Summary
console.log('═══════════════════════════════════════');
console.log('✅ JWT Migration Complete!');
console.log('═══════════════════════════════════════\n');
console.log('📊 Summary:');
console.log(`   • Routes converted: ${routeMatches}`);
console.log(`   • User references updated: ${userMatches}`);
console.log(`   • Total changes: ${changes}\n`);
console.log('⚠️  Important Next Steps:');
console.log('   1. Review the changes in server/routes.ts');
console.log('   2. Check for any remaining req.isAuthenticated() calls');
console.log('   3. Test all protected endpoints');
console.log('   4. Delete backup file: server/routes.ts.backup\n');
console.log('🔄 To rollback: mv server/routes.ts.backup server/routes.ts');
console.log('═══════════════════════════════════════\n');
