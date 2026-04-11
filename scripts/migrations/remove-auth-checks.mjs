#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const routesFile = path.join(process.cwd(), 'server/routes.ts');

console.log('🔧 Removing all req.isAuthenticated() calls from routes.ts...\n');

// Read the file
let content = fs.readFileSync(routesFile, 'utf-8');

// Count occurrences before
const beforeCount = (content.match(/if \(!req\.isAuthenticated\(\)\) \{[\s\S]*?return res\.status\(401\)\.json\([^)]+\);[\s\S]*?\}/g) || []).length;
console.log(`Found ${beforeCount} authentication checks to remove\n`);

// Remove all the authentication check blocks:
// if (!req.isAuthenticated()) {
//   return res.status(401).json({ error: '...' });
// }
content = content.replace(
  /\s+if \(!req\.isAuthenticated\(\)\) \{\s+return res\.status\(401\)\.json\([^)]+\);\s+\}/g,
  ''
);

// Also handle multi-line error messages
content = content.replace(
  /\s+if \(!req\.isAuthenticated\(\)\) \{\s+console\.error\([^)]+\);\s+return res\.status\(401\)\.json\([^)]+\);\s+\}/g,
  ''
);

// Remove standalone authStatus: req.isAuthenticated() lines (for debugging endpoints)
content = content.replace(
  /authStatus: req\.isAuthenticated\(\),/g,
  'authStatus: true, // JWT authenticated'
);

// Count occurrences after
const afterCount = (content.match(/if \(!req\.isAuthenticated\(\)\) \{[\s\S]*?return res\.status\(401\)\.json\([^)]+\);[\s\S]*?\}/g) || []).length;

// Write the file back
fs.writeFileSync(routesFile, content, 'utf-8');

console.log(`✅ Removed ${beforeCount - afterCount} authentication checks`);
console.log(`Remaining: ${afterCount} (if any, may need manual review)`);
console.log('\n✨ Done! Run: git diff server/routes.ts to review changes');
