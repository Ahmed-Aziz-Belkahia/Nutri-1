import { db } from '../../db';
import { userTokenLimits, apiUsageTracking } from '../../db/schema';
import { eq } from 'drizzle-orm';

/**
 * Token Limit Service
 * 
 * Manages OpenAI token usage limits for users:
 * - Free tier: 10,000 tokens/day
 * - Checks quota before API calls
 * - Tracks actual usage after calls
 * - Resets daily counters at midnight UTC
 */

interface TokenEstimate {
  estimatedTokens: number;
  confidence: 'low' | 'medium' | 'high';
}

interface UsageResult {
  canProceed: boolean;
  currentUsage: number;
  dailyLimit: number;
  remaining: number;
  resetTime: Date;
  message?: string;
}

export class TokenLimitService {
  
  /**
   * Estimate tokens needed for different operations
   */
  static estimateTokens(operation: string, params?: any): TokenEstimate {
    switch (operation) {
      case 'meal-plan-generation':
        // Average meal plan uses ~3000-5000 tokens
        const days = params?.durationDays || 7;
        return {
          estimatedTokens: days * 500, // ~3500 for 7 days
          confidence: 'medium'
        };
      
      case 'recipe-generation':
        // Single recipe ~800-1500 tokens
        return {
          estimatedTokens: 1200,
          confidence: 'high'
        };
      
      case 'food-scan-analysis':
        // Food image analysis ~500-800 tokens
        return {
          estimatedTokens: 650,
          confidence: 'high'
        };
      
      case 'body-analysis':
        // Body composition analysis ~300-500 tokens
        return {
          estimatedTokens: 400,
          confidence: 'high'
        };
      
      default:
        // Conservative default
        return {
          estimatedTokens: 1000,
          confidence: 'low'
        };
    }
  }

  /**
   * Check if user has enough tokens remaining for operation
   */
  static async checkTokenQuota(
    userId: number,
    operation: string,
    params?: any
  ): Promise<UsageResult> {
    try {
      // Get or create user token limits
      let limits = await db.query.userTokenLimits.findFirst({
        where: eq(userTokenLimits.userId, userId)
      });

      // Create default limits if not exists
      if (!limits) {
        await this.initializeUserLimits(userId);
        limits = await db.query.userTokenLimits.findFirst({
          where: eq(userTokenLimits.userId, userId)
        });
      }

      if (!limits) {
        throw new Error('Failed to initialize user token limits');
      }

      // Check if daily reset is needed
      await this.checkAndResetDaily(userId, limits);

      // Refresh limits after potential reset
      limits = await db.query.userTokenLimits.findFirst({
        where: eq(userTokenLimits.userId, userId)
      });

      if (!limits) {
        throw new Error('Failed to fetch updated limits');
      }

      // Estimate tokens for this operation
      const estimate = this.estimateTokens(operation, params);
      const remaining = limits.dailyTokenLimit - limits.dailyUsed;

      // Check if user has enough tokens
      if (limits.dailyUsed + estimate.estimatedTokens > limits.dailyTokenLimit) {
        const resetTime = this.getNextMidnightUTC();
        return {
          canProceed: false,
          currentUsage: limits.dailyUsed,
          dailyLimit: limits.dailyTokenLimit,
          remaining,
          resetTime,
          message: `Daily token limit exceeded. You've used ${limits.dailyUsed.toLocaleString()} of ${limits.dailyTokenLimit.toLocaleString()} tokens today. Limit resets at midnight UTC (${resetTime.toLocaleTimeString()}).`
        };
      }

      return {
        canProceed: true,
        currentUsage: limits.dailyUsed,
        dailyLimit: limits.dailyTokenLimit,
        remaining,
        resetTime: this.getNextMidnightUTC()
      };

    } catch (error) {
      console.error('Error checking token quota:', error);
      // Fail open - allow request if quota check fails
      return {
        canProceed: true,
        currentUsage: 0,
        dailyLimit: 10000,
        remaining: 10000,
        resetTime: this.getNextMidnightUTC(),
        message: 'Unable to verify token quota, proceeding with request'
      };
    }
  }

  /**
   * Track actual token usage after API call
   */
  static async trackTokenUsage(
    userId: number,
    endpoint: string,
    tokensUsed: number,
    model: string,
    costUsd: number = 0,
    status: 'success' | 'error' = 'success',
    metadata?: any
  ): Promise<void> {
    try {
      // Log usage in tracking table
      await db.insert(apiUsageTracking).values({
        userId,
        endpoint,
        tokensUsed,
        costUsd,
        requestDate: Math.floor(Date.now() / 1000),
        model,
        status,
        metadata: metadata || undefined
      });

      // Update user's daily usage counter
      const limits = await db.query.userTokenLimits.findFirst({
        where: eq(userTokenLimits.userId, userId)
      });

      if (limits) {
        await db.update(userTokenLimits)
          .set({
            dailyUsed: limits.dailyUsed + tokensUsed,
            monthlyUsed: limits.monthlyUsed + tokensUsed,
            updatedAt: new Date()
          })
          .where(eq(userTokenLimits.userId, userId));
      }

    } catch (error) {
      console.error('Error tracking token usage:', error);
      // Don't throw - tracking failures shouldn't break the app
    }
  }

  /**
   * Initialize token limits for new user
   */
  static async initializeUserLimits(userId: number, tier: string = 'free'): Promise<void> {
    const now = new Date();
    
    await db.insert(userTokenLimits).values({
      userId,
      tier,
      dailyTokenLimit: 10000,  // 10K tokens per day for free tier
      monthlyTokenLimit: 200000, // 200K tokens per month
      dailyUsed: 0,
      monthlyUsed: 0,
      lastResetDaily: now,
      lastResetMonthly: now,
      updatedAt: now
    }).onConflictDoNothing();
  }

  /**
   * Check if daily reset is needed and perform it
   */
  static async checkAndResetDaily(userId: number, limits: any): Promise<void> {
    const lastReset = limits.lastResetDaily instanceof Date ? limits.lastResetDaily : new Date(limits.lastResetDaily);
    const now = new Date();
    
    // Check if it's a new day (UTC)
    if (
      lastReset.getUTCDate() !== now.getUTCDate() ||
      lastReset.getUTCMonth() !== now.getUTCMonth() ||
      lastReset.getUTCFullYear() !== now.getUTCFullYear()
    ) {
      await this.resetDailyUsage(userId);
    }
  }

  /**
   * Reset daily usage counter
   */
  static async resetDailyUsage(userId: number): Promise<void> {
    const now = new Date();
    
    await db.update(userTokenLimits)
      .set({
        dailyUsed: 0,
        lastResetDaily: now,
        updatedAt: now
      })
      .where(eq(userTokenLimits.userId, userId));
  }

  /**
   * Reset all users' daily usage (called by cron job at midnight UTC)
   */
  static async resetAllDailyUsage(): Promise<number> {
    try {
      const now = new Date();
      
      const result = await db.update(userTokenLimits)
        .set({
          dailyUsed: 0,
          lastResetDaily: now,
          updatedAt: now
        });

      console.log(`[TokenLimit] Reset daily usage for all users at ${new Date().toISOString()}`);
      return result.changes || 0;
    } catch (error) {
      console.error('Error resetting daily usage:', error);
      return 0;
    }
  }

  /**
   * Get next midnight UTC timestamp
   */
  static getNextMidnightUTC(): Date {
    const now = new Date();
    const tomorrow = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0, 0, 0, 0
      )
    );
    return tomorrow;
  }

  /**
   * Get user's current usage stats
   */
  static async getUserUsage(userId: number): Promise<any> {
    const limits = await db.query.userTokenLimits.findFirst({
      where: eq(userTokenLimits.userId, userId)
    });

    if (!limits) {
      return null;
    }

    const remaining = limits.dailyTokenLimit - limits.dailyUsed;
    const percentUsed = (limits.dailyUsed / limits.dailyTokenLimit) * 100;

    const lastResetDaily = limits.lastResetDaily instanceof Date ? limits.lastResetDaily : new Date(limits.lastResetDaily);
    const lastResetMonthly = limits.lastResetMonthly instanceof Date ? limits.lastResetMonthly : new Date(limits.lastResetMonthly);

    return {
      tier: limits.tier,
      dailyUsed: limits.dailyUsed,
      dailyLimit: limits.dailyTokenLimit,
      dailyRemaining: remaining,
      percentUsed: Math.round(percentUsed),
      monthlyUsed: limits.monthlyUsed,
      monthlyLimit: limits.monthlyTokenLimit,
      resetTime: this.getNextMidnightUTC(),
      lastResetDaily,
      lastResetMonthly
    };
  }
}
