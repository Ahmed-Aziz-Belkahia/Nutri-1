import { Response, NextFunction } from 'express';
import { AuthRequest } from '../utils/jwt';
import { TokenLimitService } from '../services/token-limit.service';

/**
 * Middleware to check if user has exceeded their token limit
 * 
 * This middleware should be applied to routes that consume OpenAI tokens:
 * - /api/meal-plans (meal plan generation)
 * - /api/recipes (AI recipe generation)
 * - /api/food-scan (food image analysis)
 * - /api/analyze-body-fat (body composition analysis)
 * 
 * Usage:
 * ```typescript
 * app.post('/api/meal-plans', requireAuth, checkTokenLimit('meal-plan-generation'), async (req, res) => {
 *   // Generate meal plan...
 * });
 * ```
 */

export function checkTokenLimit(operation: string, params?: any) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    // TEMPORARY: Bypass all token limits for testing/development
    // TODO: Remove this bypass when ready to enforce limits
    console.log(`[Token Limit] BYPASSED for operation: ${operation}, user: ${req.user?.id}`);
    return next();
    
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'You must be logged in to access this feature'
        });
      }

      // Check if user has enough tokens for this operation
      const usageResult = await TokenLimitService.checkTokenQuota(
        userId,
        operation,
        params || req.body
      );

      if (!usageResult.canProceed) {
        return res.status(429).json({
          error: 'Daily token limit exceeded',
          message: usageResult.message,
          details: {
            dailyUsed: usageResult.currentUsage,
            dailyLimit: usageResult.dailyLimit,
            remaining: usageResult.remaining,
            resetTime: usageResult.resetTime,
            resetTimeFormatted: usageResult.resetTime.toLocaleString('en-US', {
              timeZone: 'UTC',
              hour: '2-digit',
              minute: '2-digit',
              timeZoneName: 'short'
            })
          },
          upgradeMessage: 'Upgrade to Premium for higher limits or wait until your limit resets at midnight UTC.'
        });
      }

      // Attach usage info to request for logging purposes
      req.tokenUsage = {
        currentUsage: usageResult.currentUsage,
        dailyLimit: usageResult.dailyLimit,
        remaining: usageResult.remaining
      };

      next();
    } catch (error) {
      console.error('Error in checkTokenLimit middleware:', error);
      // Fail open - allow request if middleware fails
      next();
    }
  };
}

/**
 * Extend AuthRequest to include token usage info
 */
declare module '../utils/jwt' {
  interface AuthRequest {
    tokenUsage?: {
      currentUsage: number;
      dailyLimit: number;
      remaining: number;
    };
  }
}
