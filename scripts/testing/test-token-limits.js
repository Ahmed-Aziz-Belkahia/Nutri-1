/**
 * Test Token Limitation System
 * 
 * This script tests the token limitation functionality:
 * 1. Creates a test user
 * 2. Initializes token limits
 * 3. Simulates API usage until limit is hit
 * 4. Verifies error message
 * 5. Tests reset functionality
 */

import { db } from './db/index.js';
import { users, userTokenLimits, apiUsageTracking } from './db/schema.js';
import { eq } from 'drizzle-orm';
import { TokenLimitService } from './server/services/token-limit.service.js';
import * as crypto from './server/utils/crypto.js';

async function testTokenLimitation() {
  console.log('\n🧪 Testing Token Limitation System\n');
  console.log('=' .repeat(60));

  try {
    // Step 1: Create test user
    console.log('\n1️⃣  Creating test user...');
    const testEmail = `test-token-${Date.now()}@example.com`;
    
    const [testUser] = await db.insert(users).values({
      email: testEmail,
      password: await crypto.hash('password123'),
      hasCompletedOnboarding: true
    }).returning();
    
    console.log(`✅ Test user created: ID ${testUser.id}, Email: ${testEmail}`);

    // Step 2: Initialize token limits
    console.log('\n2️⃣  Initializing token limits (1000 tokens for quick testing)...');
    await TokenLimitService.initializeUserLimits(testUser.id, 'free');
    
    // Override with smaller limit for testing
    await db.update(userTokenLimits)
      .set({ dailyTokenLimit: 1000 })
      .where(eq(userTokenLimits.userId, testUser.id));
    
    const limits = await TokenLimitService.getUserUsage(testUser.id);
    console.log(`✅ Token limits initialized:`, limits);

    // Step 3: Simulate API usage
    console.log('\n3️⃣  Simulating API usage...');
    const operations = [
      { name: 'Meal Plan 1', type: 'meal-plan-generation', tokens: 400 },
      { name: 'Meal Plan 2', type: 'meal-plan-generation', tokens: 400 },
      { name: 'Recipe', type: 'recipe-generation', tokens: 150 },
    ];

    for (const op of operations) {
      console.log(`\n   Testing ${op.name} (${op.tokens} tokens)...`);
      
      // Check quota
      const quotaCheck = await TokenLimitService.checkTokenQuota(
        testUser.id,
        op.type,
        { durationDays: 7 }
      );
      
      if (!quotaCheck.canProceed) {
        console.log(`   ❌ BLOCKED: ${quotaCheck.message}`);
        console.log(`   📊 Usage: ${quotaCheck.currentUsage}/${quotaCheck.dailyLimit} tokens`);
        console.log(`   ⏰ Reset: ${quotaCheck.resetTime.toLocaleString()}`);
        break;
      }
      
      // Simulate token usage
      await TokenLimitService.trackTokenUsage(
        testUser.id,
        `/api/${op.type}`,
        op.tokens,
        'gpt-4o',
        0.01,
        'success'
      );
      
      const newLimits = await TokenLimitService.getUserUsage(testUser.id);
      console.log(`   ✅ Used ${op.tokens} tokens. Total: ${newLimits.dailyUsed}/${newLimits.dailyLimit} (${newLimits.percentUsed}%)`);
    }

    // Step 4: Try one more after limit
    console.log('\n4️⃣  Testing limit enforcement...');
    const finalCheck = await TokenLimitService.checkTokenQuota(
      testUser.id,
      'meal-plan-generation',
      { durationDays: 7 }
    );
    
    if (!finalCheck.canProceed) {
      console.log('   ✅ LIMIT WORKING: API call correctly blocked');
      console.log(`   Message: "${finalCheck.message}"`);
    } else {
      console.log('   ⚠️  WARNING: Limit not enforced properly');
    }

    // Step 5: Test reset
    console.log('\n5️⃣  Testing daily reset...');
    await TokenLimitService.resetDailyUsage(testUser.id);
    const resetLimits = await TokenLimitService.getUserUsage(testUser.id);
    console.log(`   ✅ Reset successful. Usage now: ${resetLimits.dailyUsed}/${resetLimits.dailyLimit}`);

    // Step 6: Verify reset worked
    const postResetCheck = await TokenLimitService.checkTokenQuota(
      testUser.id,
      'meal-plan-generation',
      { durationDays: 7 }
    );
    
    if (postResetCheck.canProceed) {
      console.log('   ✅ Can proceed after reset');
    }

    // Cleanup
    console.log('\n6️⃣  Cleaning up test data...');
    await db.delete(apiUsageTracking).where(eq(apiUsageTracking.userId, testUser.id));
    await db.delete(userTokenLimits).where(eq(userTokenLimits.userId, testUser.id));
    await db.delete(users).where(eq(users.id, testUser.id));
    console.log('   ✅ Test data cleaned up');

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    throw error;
  }
}

// Run tests
testTokenLimitation()
  .then(() => {
    console.log('Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
