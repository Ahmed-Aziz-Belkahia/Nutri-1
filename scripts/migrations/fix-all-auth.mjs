#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';

const filesToFix = [
  'server/meal-plans.routes.ts',
  'server/routes/ai.ts',
  'server/routes/admin.ts',
  'server/middleware/auth.ts',
  'server/auth.ts'
];

console.log('🔧 Fixing all authentication checks across server files...\n');

for (const filePath of filesToFix) {
  try {
    console.log(`📝 Processing: ${filePath}`);
    let content = readFileSync(filePath, 'utf-8');
    const originalLength = content.length;
    
    // Count authentication checks before removal
    const authCheckCount = (content.match(/if\s*\(\s*!?\s*req\.isAuthenticated\(\)/g) || []).length;
    
    if (authCheckCount === 0) {
      console.log(`   ✅ No authentication checks found - skipping\n`);
      continue;
    }
    
    console.log(`   Found ${authCheckCount} authentication check(s)`);
    
    // Pattern 1: Remove standalone auth check blocks with 401 response
    content = content.replace(
      /\s*if\s*\(\s*!\s*req\.isAuthenticated\(\s*\)\s*\)\s*\{\s*return\s+res\.status\(\s*401\s*\)\.json\([^}]+\}\s*\);?\s*\}/g,
      ''
    );
    
    // Pattern 2: Remove auth check with console.log and return
    content = content.replace(
      /\s*if\s*\(\s*!\s*req\.isAuthenticated\(\s*\)\s*\)\s*\{\s*console\.log[^}]+\s*return\s+res\.status\(\s*401\s*\)\.json\([^}]+\}\s*\);?\s*\}/g,
      ''
    );
    
    // Pattern 3: Remove complex auth checks with multiple conditions
    content = content.replace(
      /\s*if\s*\(\s*!\s*req\.isAuthenticated\(\s*\)\s*\|\|\s*!\s*req\.user\s*\)\s*\{\s*return\s+res\.status\(\s*401\s*\)\.json\([^}]+\}\s*\);?\s*\}/g,
      ''
    );
    
    // Pattern 4: Remove positive auth checks (for middleware)
    content = content.replace(
      /\s*if\s*\(\s*req\.isAuthenticated\(\s*\)\s*\)\s*\{[^}]*next\(\);?\s*return;?\s*\}/g,
      ''
    );
    
    // Pattern 5: Clean up properties/objects that use isAuthenticated
    content = content.replace(
      /\s*isAuthenticated:\s*req\.isAuthenticated\(\),?/g,
      ''
    );
    
    // Remove extra blank lines created by the replacements
    content = content.replace(/\n\n\n+/g, '\n\n');
    
    const linesRemoved = originalLength - content.length;
    
    if (linesRemoved > 0) {
      writeFileSync(filePath, content, 'utf-8');
      console.log(`   ✅ Removed ${authCheckCount} auth check(s) (~${linesRemoved} characters)\n`);
    } else {
      console.log(`   ⚠️  No changes made (patterns didn't match)\n`);
    }
    
  } catch (error) {
    console.error(`   ❌ Error processing ${filePath}:`, error.message, '\n');
  }
}

console.log('✅ All files processed!\n');
console.log('📋 Next steps:');
console.log('1. Add requireAuth middleware to route registrations');
console.log('2. Add type AuthRequest imports where needed');
console.log('3. Test the server');
