#!/usr/bin/env node

/**
 * Analyze server/routes.ts and generate a detailed migration report
 * This script identifies all authentication patterns that need updating
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROUTES_FILE = path.join(__dirname, 'server', 'routes.ts');

console.log('🔍 Analyzing server/routes.ts for JWT migration...\n');

const content = fs.readFileSync(ROUTES_FILE, 'utf-8');
const lines = content.split('\n');

// Track findings
const findings = {
  authChecks: [],
  userAccesses: [],
  routeDefinitions: [],
};

// Find all authentication checks
lines.forEach((line, index) => {
  const lineNum = index + 1;
  
  // Pattern 1: req.isAuthenticated() checks
  if (line.includes('req.isAuthenticated()')) {
    findings.authChecks.push({
      line: lineNum,
      code: line.trim(),
      context: lines.slice(Math.max(0, index - 2), Math.min(lines.length, index + 3)).join('\n')
    });
  }
  
  // Pattern 2: req.user accesses
  if (line.includes('req.user') && !line.includes('req.isAuthenticated')) {
    findings.userAccesses.push({
      line: lineNum,
      code: line.trim()
    });
  }
  
  // Pattern 3: Route definitions (app.get, app.post, etc.)
  if (/app\.(get|post|put|delete|patch)\(/.test(line)) {
    findings.routeDefinitions.push({
      line: lineNum,
      code: line.trim()
    });
  }
});

// Generate report
console.log('═══════════════════════════════════════');
console.log('📊 MIGRATION ANALYSIS REPORT');
console.log('═══════════════════════════════════════\n');

console.log(`📝 File: ${ROUTES_FILE}`);
console.log(`📏 Total lines: ${lines.length}`);
console.log(`🔐 Authentication checks: ${findings.authChecks.length}`);
console.log(`👤 User accesses: ${findings.userAccesses.length}`);
console.log(`🛣️  Route definitions: ${findings.routeDefinitions.length}\n`);

// Show first 10 authentication checks
console.log('═══════════════════════════════════════');
console.log('🔐 Authentication Checks (First 10)');
console.log('═══════════════════════════════════════\n');

findings.authChecks.slice(0, 10).forEach((finding, i) => {
  console.log(`${i + 1}. Line ${finding.line}:`);
  console.log(`   ${finding.code}\n`);
});

if (findings.authChecks.length > 10) {
  console.log(`   ... and ${findings.authChecks.length - 10} more\n`);
}

// Show breakdown by route type
console.log('═══════════════════════════════════════');
console.log('📈 Routes by HTTP Method');
console.log('═══════════════════════════════════════\n');

const methodCounts = {};
findings.routeDefinitions.forEach(route => {
  const match = route.code.match(/app\.(get|post|put|delete|patch)/);
  if (match) {
    const method = match[1].toUpperCase();
    methodCounts[method] = (methodCounts[method] || 0) + 1;
  }
});

Object.entries(methodCounts).forEach(([method, count]) => {
  console.log(`   ${method}: ${count}`);
});
console.log('');

// Recommendations
console.log('═══════════════════════════════════════');
console.log('💡 RECOMMENDATIONS');
console.log('═══════════════════════════════════════\n');

console.log('1. START WITH: Complete onboarding route (line ~103)');
console.log('   - Single route, easy to test');
console.log('   - Critical user flow\n');

console.log('2. BATCH 1: User profile routes (10-15 routes)');
console.log('   - /api/user/*');
console.log('   - /api/user/nutrition-preferences/*');
console.log('   - /api/user/dietary-preferences/*\n');

console.log('3. BATCH 2: Recipe routes (20-30 routes)');
console.log('   - /api/recipes/*\n');

console.log('4. BATCH 3: Meal planning routes (20-30 routes)');
console.log('   - /api/meal-plans/*\n');

console.log('5. BATCH 4: Progress & photos (10-15 routes)');
console.log('   - /api/progress-photos/*\n');

console.log('6. BATCH 5: Remaining routes');
console.log('   - /api/badges, /api/notifications, etc.\n');

// Generate migration checklist
console.log('═══════════════════════════════════════');
console.log('✅ MIGRATION CHECKLIST');
console.log('═══════════════════════════════════════\n');

const checklist = [
  '[ ] Update imports (add JWT, remove Passport)',
  '[ ] Test 1: Complete onboarding route',
  '[ ] Batch 1: User profile routes (10-15)',
  '[ ] Batch 2: Recipe routes (20-30)',
  '[ ] Batch 3: Meal planning routes (20-30)',
  '[ ] Batch 4: Progress & photos (10-15)',
  '[ ] Batch 5: Remaining routes',
  '[ ] Remove all req.isAuthenticated() checks',
  '[ ] Update all req.user to req.user!',
  '[ ] Test all endpoints with curl/Postman',
  '[ ] Deploy to VPS',
  '[ ] Verify production',
];

checklist.forEach(item => console.log(`   ${item}`));
console.log('');

// Save detailed report to file
const reportPath = path.join(__dirname, 'MIGRATION-REPORT.txt');
const report = `
JWT MIGRATION ANALYSIS REPORT
Generated: ${new Date().toISOString()}
==================================================================

SUMMARY:
- Total authentication checks: ${findings.authChecks.length}
- Total user accesses: ${findings.userAccesses.length}
- Total route definitions: ${findings.routeDefinitions.length}

AUTHENTICATION CHECKS:
${findings.authChecks.map((f, i) => `${i + 1}. Line ${f.line}: ${f.code}`).join('\n')}

ROUTES BY METHOD:
${Object.entries(methodCounts).map(([m, c]) => `${m}: ${c}`).join('\n')}

==================================================================
`;

fs.writeFileSync(reportPath, report, 'utf-8');
console.log(`📄 Detailed report saved to: ${reportPath}\n`);

console.log('═══════════════════════════════════════');
console.log('🚀 READY TO START MIGRATION!');
console.log('═══════════════════════════════════════\n');
console.log('Would you like to proceed with the migration?');
console.log('This will take approximately 2-3 hours.\n');
